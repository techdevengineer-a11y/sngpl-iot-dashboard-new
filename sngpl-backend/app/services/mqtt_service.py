"""MQTT Service for receiving IoT device data"""

import paho.mqtt.client as mqtt
import json
import threading
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import get_logger
from app.db.database import SessionLocal
from app.models.models import Device, DeviceReading, Alarm, AlarmThreshold

logger = get_logger("mqtt")


class MQTTService:
    def __init__(self):
        self.client = None
        self.connected = False
        self.thread = None
        logger.info("MQTT Service initialized")

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info(f"Connected to MQTT Broker: {settings.MQTT_BROKER}")
            self.connected = True
            # Subscribe to topic
            client.subscribe(settings.MQTT_TOPIC)
            logger.info(f"Subscribed to topic: {settings.MQTT_TOPIC}")
        else:
            logger.error(f"Failed to connect to MQTT Broker, return code {rc}")

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        if rc == 0:
            logger.info("Disconnected from MQTT Broker (intentional)")
        else:
            logger.warning(f"Unexpected disconnection from MQTT Broker, return code {rc}")

    def on_message(self, client, userdata, msg):
        """Callback when message received from MQTT broker"""
        try:
            # Decode and parse message
            raw_payload = msg.payload.decode('utf-8', errors='ignore')

            # Try to parse as JSON
            try:
                payload = json.loads(raw_payload)
            except json.JSONDecodeError as e:
                logger.warning(f"Malformed JSON on topic {msg.topic}: {raw_payload[:100]}... Error: {e}")
                return

            logger.debug(f"Received message on topic {msg.topic}: {payload}")

            # Process the data
            self.process_device_data(payload)

        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}", exc_info=True)

    def process_device_data(self, data):
        """Process device data and save to database"""
        db = SessionLocal()

        try:
            # Get device ID from 'did' field
            client_id = data.get("did", "").strip()

            if not client_id:
                logger.warning("No device ID in MQTT message, skipping")
                return

            # Find or create device
            device = db.query(Device).filter(Device.client_id == client_id).first()

            if not device:
                # Create new device if it doesn't exist
                logger.info(f"Creating new device: {client_id}")
                device = Device(
                    client_id=client_id,
                    device_name=f"Device {client_id}",
                    location="Unknown",
                    latitude=0.0,
                    longitude=0.0,
                    is_active=True
                )
                db.add(device)
                db.commit()
                db.refresh(device)
                logger.info(f"Device {client_id} created successfully with ID {device.id}")

            # Update last seen (using local time to match frontend)
            device.last_seen = datetime.now()
            device.is_active = True

            # Parse content array to get sensor values
            content = data.get("content", [])
            sensor_data = {}

            for item in content:
                addr = item.get("Addr")
                value = float(item.get("Addrv", 0))
                sensor_data[addr] = value

            # Parse device timestamp from Utime field (format: "2026/1/12 23:14:13")
            device_timestamp = datetime.now()  # fallback
            utime_str = data.get("Utime", "").strip()
            if utime_str:
                try:
                    device_timestamp = datetime.strptime(utime_str, "%Y/%m/%d %H:%M:%S")
                except ValueError as e:
                    logger.warning(f"Failed to parse Utime '{utime_str}': {e}, using server time")

            # Deduplication: Check if we already have a reading with same timestamp + client_id
            # Device sends duplicate messages at slightly different times, but with same Utime
            existing_reading = db.query(DeviceReading).filter(
                DeviceReading.client_id == client_id,
                DeviceReading.timestamp == device_timestamp
            ).first()

            if existing_reading:
                logger.info(f"[SKIP] Duplicate reading detected for {client_id} at {device_timestamp}")
                return

            # Create device reading with ALL parameters including T18-T114 analytics
            # CORRECT MAPPING: T13 = Total Volume Flow (MCF/day), T14 = Volume (MCF)
            reading = DeviceReading(
                device_id=device.id,
                client_id=client_id,
                temperature=sensor_data.get("T12", 0.0),
                static_pressure=sensor_data.get("T11", 0.0),
                differential_pressure=sensor_data.get("T10", 0.0),
                volume=sensor_data.get("T14", 0.0),              # T14 = Volume (MCF)
                total_volume_flow=sensor_data.get("T13", 0.0),  # T13 = Total Volume Flow (MCF/day)
                battery=sensor_data.get("T15", 0.0),             # T15 = Battery (V)
                max_static_pressure=sensor_data.get("T16", 0.0),  # T16 = Max Static Pressure (PSI)
                min_static_pressure=sensor_data.get("T17", 0.0),  # T17 = Min Static Pressure (PSI)
                # T18-T114 Analytics Parameters - Device sends these values
                last_hour_flow_time=sensor_data.get("T18", 0.0),       # T18 = Last Hour Flow Time (seconds)
                last_hour_diff_pressure=sensor_data.get("T19", 0.0),   # T19 = Last Hour Diff Pressure (IWC)
                last_hour_static_pressure=sensor_data.get("T110", 0.0),  # T110 = Last Hour Static Pressure (PSI)
                last_hour_temperature=sensor_data.get("T111", 0.0),    # T111 = Last Hour Temperature (°F)
                last_hour_volume=sensor_data.get("T112", 0.0),         # T112 = Last Hour Volume (MCF)
                last_hour_energy=sensor_data.get("T113", 0.0),         # T113 = Last Hour Energy
                specific_gravity=sensor_data.get("T114", 0.0),         # T114 = Specific Gravity
                timestamp=device_timestamp  # Use device timestamp from Utime field
            )
            db.add(reading)

            # Check alarm thresholds
            alarms_created = self.check_alarms(db, device.id, client_id, reading)

            db.commit()
            logger.info(f"Saved reading for device {client_id} (temp={reading.temperature}, pressure={reading.static_pressure})")

            # Broadcast to WebSocket clients
            self.broadcast_update(client_id, device.id, reading, alarms_created)

        except Exception as e:
            logger.error(f"Error saving device data for {client_id}: {e}", exc_info=True)
            db.rollback()

        finally:
            db.close()

    def check_alarms(self, db: Session, device_id: int, client_id: str, reading: DeviceReading):
        """
        Check if readings exceed alarm thresholds
        Only creates alarms for Yellow and Red zones (not Green or Light Red zones)

        Thresholds:
        - Temperature: Red (<0°F), Yellow (>120°F) - ignore Light Red (0-10°F) and Green (10-120°F)
        - Static Pressure: Yellow (<10 PSI), Red (>140 PSI) - ignore Green (10-90 PSI) and Light Red (90-140 PSI)
        - Differential Pressure: Yellow (<0 IWC), Red (>400 IWC) - ignore Green (0-300 IWC) and Light Red (300-400 IWC)
        - Battery: Red (<10V), Yellow (>14V) - ignore Light Red (10-10.5V) and Green (10.5-14V)
        """
        alarms_created = []

        # Temperature thresholds
        if reading.temperature is not None:
            temp = reading.temperature
            # Red zone: < 0°F
            if temp < 0:
                alarm = self.create_alarm(
                    db, device_id, client_id, "temperature", temp,
                    "low", 0.0, "Temperature critically low (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)
            # Yellow zone: > 120°F
            elif temp > 120:
                alarm = self.create_alarm(
                    db, device_id, client_id, "temperature", temp,
                    "high", 120.0, "Temperature critically high (Yellow zone)",
                    severity="medium"
                )
                if alarm:
                    alarms_created.append(alarm)

        # Static Pressure thresholds
        if reading.static_pressure is not None:
            pressure = reading.static_pressure
            # Yellow zone: < 10 PSI
            if pressure < 10:
                alarm = self.create_alarm(
                    db, device_id, client_id, "static_pressure", pressure,
                    "low", 10.0, "Static Pressure low (Yellow zone)",
                    severity="medium"
                )
                if alarm:
                    alarms_created.append(alarm)
            # Red zone: > 140 PSI
            elif pressure > 140:
                alarm = self.create_alarm(
                    db, device_id, client_id, "static_pressure", pressure,
                    "high", 140.0, "Static Pressure critically high (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)

        # Differential Pressure thresholds
        if reading.differential_pressure is not None:
            diff_pressure = reading.differential_pressure
            # Yellow zone: < 0 IWC
            if diff_pressure < 0:
                alarm = self.create_alarm(
                    db, device_id, client_id, "differential_pressure", diff_pressure,
                    "low", 0.0, "Differential Pressure low (Yellow zone)",
                    severity="medium"
                )
                if alarm:
                    alarms_created.append(alarm)
            # Red zone: > 400 IWC
            elif diff_pressure > 400:
                alarm = self.create_alarm(
                    db, device_id, client_id, "differential_pressure", diff_pressure,
                    "high", 400.0, "Differential Pressure critically high (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)

        # Battery thresholds
        if reading.battery is not None:
            battery = reading.battery
            # Red zone: < 10V
            if battery < 10:
                alarm = self.create_alarm(
                    db, device_id, client_id, "battery", battery,
                    "low", 10.0, "Battery critically low (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)
            # Yellow zone: > 14V
            elif battery > 14:
                alarm = self.create_alarm(
                    db, device_id, client_id, "battery", battery,
                    "high", 14.0, "Battery voltage high (Yellow zone)",
                    severity="medium"
                )
                if alarm:
                    alarms_created.append(alarm)

        return alarms_created

    def create_alarm(self, db: Session, device_id: int, client_id: str, parameter: str, value: float, threshold_type: str, threshold_value: float, message: str,
                    severity: str = "medium"):
        """Create alarm with specified severity"""
        alarm = Alarm(
            device_id=device_id,
            client_id=client_id,
            parameter=parameter,
            value=value,
            threshold_type=threshold_type,
            severity=severity,
            is_acknowledged=False
        )
        db.add(alarm)
        return alarm

    def start(self):
        """Start MQTT client"""
        def run():
            self.client = mqtt.Client()
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
            self.client.on_message = self.on_message

            try:
                self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
                self.client.loop_forever()
            except Exception as e:
                print(f"Error connecting to MQTT broker: {e}")

        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()

    def stop(self):
        """Stop MQTT client"""
        if self.client:
            self.client.disconnect()
            self.connected = False

    def is_connected(self):
        """Check if connected to MQTT broker"""
        return self.connected

    def broadcast_update(self, client_id: str, device_id: int, reading: DeviceReading, alarms: list):
        """Broadcast device update to WebSocket clients and send email notifications"""
        try:
            from app.services.websocket_service import manager
            import os

            # Prepare update message
            update_message = {
                "type": "device_update",
                "client_id": client_id,
                "device_id": device_id,
                "data": {
                    "temperature": reading.temperature,
                    "static_pressure": reading.static_pressure,
                    "differential_pressure": reading.differential_pressure,
                    "volume": reading.volume,
                    "total_volume_flow": reading.total_volume_flow,
                    "timestamp": reading.timestamp.isoformat()
                }
            }

            # Broadcast to all connected WebSocket clients (non-blocking)
            if manager.active_connections:
                try:
                    # Create new event loop for async broadcast
                    loop = asyncio.new_event_loop()
                    loop.run_until_complete(manager.broadcast(update_message))
                    loop.close()
                except Exception as e:
                    logger.error(f"Error broadcasting device update: {e}")

            # If alarms were created, send notifications
            if alarms:
                for alarm in alarms:
                    # WebSocket notification for alarm
                    alarm_message = {
                        "type": "alarm",
                        "client_id": client_id,
                        "device_id": device_id,
                        "alarm": {
                            "parameter": alarm.parameter,
                            "value": alarm.value,
                            "threshold_type": alarm.threshold_type,
                            "severity": alarm.severity,
                            "timestamp": alarm.created_at.isoformat() if hasattr(alarm, 'created_at') else datetime.now().isoformat()
                        }
                    }

                    if manager.active_connections:
                        try:
                            loop = asyncio.new_event_loop()
                            loop.run_until_complete(manager.broadcast(alarm_message))
                            loop.close()
                        except Exception as e:
                            logger.error(f"Error broadcasting alarm: {e}")

                    # Email notification for high severity alarms (run in thread to avoid blocking)
                    if alarm.severity == "high":
                        recipients = os.getenv("ALARM_EMAIL_RECIPIENTS", "").split(",")
                        recipients = [r.strip() for r in recipients if r.strip()]

                        if recipients:
                            # Get device info for email (use new session)
                            db = SessionLocal()
                            try:
                                device = db.query(Device).filter(Device.id == device_id).first()
                                if device:
                                    from app.services.email_service import email_service
                                    try:
                                        loop = asyncio.new_event_loop()
                                        loop.run_until_complete(
                                            email_service.send_alarm_notification(alarm, device, recipients)
                                        )
                                        loop.close()
                                        logger.info(f"Email notification sent for high severity alarm on device {client_id}")
                                    except Exception as e:
                                        logger.error(f"Error sending email: {e}")
                            finally:
                                db.close()

        except Exception as e:
            logger.error(f"Error in broadcast_update: {e}", exc_info=True)


# Create global instance
mqtt_service = MQTTService()
