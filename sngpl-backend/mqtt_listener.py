"""
Standalone MQTT Listener Service
Runs independently from the main FastAPI application
Processes IoT device data and saves to database
"""

import paho.mqtt.client as mqtt
import json
import sys
import os
import asyncio
import threading
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.models import Device, DeviceReading, Alarm, AlarmThreshold
from app.services.email_service import email_service

# Offline notification recipients
OFFLINE_NOTIFICATION_EMAILS = ["shayankhannn12@gmail.com"]

logger = get_logger("mqtt_listener")

# Create database engine and session for standalone script (PostgreSQL)
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_timeout=30,
    connect_args={
        "connect_timeout": 10,
        "application_name": "sngpl_iot_mqtt_listener"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class StandaloneMQTTListener:
    """Standalone MQTT listener that runs independently"""

    def __init__(self):
        self.client = None
        self.connected = False
        self.offline_check_thread = None
        self.running = False
        logger.info("Standalone MQTT Listener initialized")
        logger.info(f"Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        logger.info(f"Topic: {settings.MQTT_TOPIC}")
        logger.info(f"Database: {settings.DATABASE_URL}")

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info(f"[OK] Connected to MQTT Broker: {settings.MQTT_BROKER}")
            self.connected = True
            # Subscribe to multiple topics
            client.subscribe(settings.MQTT_TOPIC)
            logger.info(f"[OK] Subscribed to topic: {settings.MQTT_TOPIC}")
            client.subscribe("evc/topic")
            logger.info(f"[OK] Subscribed to topic: evc/topic")
            # Subscribe to wildcard to catch all evc messages
            client.subscribe("evc/#")
            logger.info(f"[OK] Subscribed to topic: evc/# (wildcard)")
            print(f"\n[INFO] MQTT Listener is now running and waiting for messages...")
            print(f"[INFO] Subscribed to topics:")
            print(f"       - {settings.MQTT_TOPIC} (Primary topic)")
            print(f"       - evc/topic (Additional topic)")
            print(f"       - evc/# (All evc messages - wildcard)")
            print(f"[INFO] Press Ctrl+C to stop\n")
        else:
            logger.error(f"[ERROR] Failed to connect to MQTT Broker, return code {rc}")
            print(f"[ERROR] Connection failed with code {rc}")

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        if rc == 0:
            logger.info("[INFO] Disconnected from MQTT Broker (intentional)")
        else:
            logger.warning(f"[WARNING] Unexpected disconnection from MQTT Broker, return code {rc}")
            print(f"[WARNING] Disconnected from broker. Attempting to reconnect...")

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
                print(f"[WARNING] Malformed JSON received: {raw_payload[:100]}")
                return

            # Print incoming message to console
            device_id = payload.get("did", "unknown")
            print(f"\n{'='*60}")
            print(f"[MQTT] Message received on topic: {msg.topic}")
            print(f"[MQTT] Device ID: {device_id}")
            print(f"[MQTT] Raw data: {json.dumps(payload, indent=2)}")
            print(f"{'='*60}")

            logger.debug(f"Received message on topic {msg.topic}: {payload}")

            # Process the data
            self.process_device_data(payload)

        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}", exc_info=True)
            print(f"[ERROR] Failed to process message: {e}")

    def process_device_data(self, data):
        """Process device data and save to database"""
        db = SessionLocal()

        try:
            # Get device ID from 'did' field (try multiple possible field names)
            client_id = data.get("did", data.get("device_id", data.get("client_id", ""))).strip()

            if not client_id:
                logger.warning(f"No device ID in MQTT message, skipping. Payload keys: {list(data.keys())}")
                print(f"[WARNING] No device ID found. Available fields: {list(data.keys())}")
                return

            # Find or create device
            device = db.query(Device).filter(Device.client_id == client_id).first()

            if not device:
                # Create new device if it doesn't exist
                # Automatically assign to OTHER section if not SMS device
                device_type = "OTHER" if not client_id.startswith("SMS-") else "SMS"

                logger.info(f"Creating new {device_type} device: {client_id}")
                device = Device(
                    client_id=client_id,
                    device_name=f"Device {client_id}",
                    device_type=device_type,
                    location="Unknown",
                    latitude=0.0,
                    longitude=0.0,
                    is_active=True
                )
                db.add(device)
                db.commit()
                db.refresh(device)
                logger.info(f"[OK] {device_type} device {client_id} created successfully with ID {device.id}")

            # Update last seen
            device.last_seen = datetime.now()
            device.is_active = True

            # Parse content array to get sensor values
            content = data.get("content", [])
            sensor_data = {}

            if content and isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        addr = item.get("Addr")
                        value = float(item.get("Addrv", 0))
                        sensor_data[addr] = value
            else:
                # If content is not in expected format, try to extract values directly from data
                logger.info(f"[INFO] Content not in expected array format for {client_id}, checking for direct fields")
                print(f"[INFO] Parsing alternative data format for {client_id}")

            # Create device reading
            # CORRECT MAPPING:
            # T10 = Differential Pressure, T11 = Static Pressure, T12 = Temperature
            # T13 = Total Volume Flow (MCF/day), T14 = Volume (MCF)
            # T15 = Battery (V), T16 = Max Static Pressure, T17 = Min Static Pressure
            # T18-T114 = New Analytics Parameters

            # Get current timestamp
            current_timestamp = datetime.now()

            # Check if a reading with same device_id and timestamp already exists (prevent duplicates)
            existing_reading = db.query(DeviceReading).filter(
                DeviceReading.device_id == device.id,
                DeviceReading.timestamp == current_timestamp
            ).first()

            if existing_reading:
                logger.warning(f"[DUPLICATE PREVENTED] Reading for device {client_id} at {current_timestamp} already exists, skipping")
                print(f"⚠️  [DUPLICATE] Skipped duplicate reading for {client_id} at {current_timestamp}")
                return

            reading = DeviceReading(
                device_id=device.id,
                client_id=client_id,
                temperature=sensor_data.get("T12", 0.0),
                static_pressure=sensor_data.get("T11", 0.0),
                max_static_pressure=sensor_data.get("T16", 0.0),    # T16 = Max Static Pressure
                min_static_pressure=sensor_data.get("T17", 0.0),    # T17 = Min Static Pressure
                differential_pressure=sensor_data.get("T10", 0.0),
                volume=sensor_data.get("T14", 0.0),                 # T14 = Volume (MCF)
                total_volume_flow=sensor_data.get("T13", 0.0),     # T13 = Total Volume Flow (MCF/day)
                battery=sensor_data.get("T15", 0.0),                # T15 = Battery (V)
                # New analytics parameters
                last_hour_flow_time=sensor_data.get("T18", 0.0),           # T18 - Last Hour Flow Time
                last_hour_diff_pressure=sensor_data.get("T19", 0.0),       # T19 - Last Hour Differential Pressure
                last_hour_static_pressure=sensor_data.get("T110", 0.0),    # T110 - Last Hour Static Pressure
                last_hour_temperature=sensor_data.get("T111", 0.0),        # T111 - Last Hour Temperature
                last_hour_volume=sensor_data.get("T112", 0.0),             # T112 - Last Hour Volume
                last_hour_energy=sensor_data.get("T113", 0.0),             # T113 - Last Hour Energy
                specific_gravity=sensor_data.get("T114", 0.0),             # T114 - Specific Gravity In Use
                timestamp=current_timestamp
            )
            db.add(reading)

            # Check alarm thresholds (only if monitoring is enabled)
            if self.is_alarm_monitoring_enabled():
                alarms_created = self.check_alarms(db, device.id, client_id, reading)
            else:
                alarms_created = []

            db.commit()

            # Print to console and log
            save_message = (
                f"[DATABASE] Saved reading for {client_id} | "
                f"Temp: {reading.temperature:.1f}°F | "
                f"Pressure: {reading.static_pressure:.1f} PSI (Max: {reading.max_static_pressure:.1f}, Min: {reading.min_static_pressure:.1f}) | "
                f"Diff Pressure: {reading.differential_pressure:.1f} IWC | "
                f"Battery: {reading.battery:.2f}V | "
                f"Volume: {reading.volume:.1f} MCF | "
                f"Volume Flow: {reading.total_volume_flow:.1f} MCF/day"
            )
            print(f"[OK] {save_message}")
            logger.info(save_message)

            if alarms_created:
                alarm_msg = f"[ALARM] {len(alarms_created)} alarm(s) triggered for {client_id}"
                print(f"⚠️  {alarm_msg}")
                logger.warning(alarm_msg)
                for alarm in alarms_created:
                    alarm_detail = f"  - {alarm.parameter}: {alarm.value} ({alarm.threshold_type} threshold, {alarm.severity} severity)"
                    print(alarm_detail)
                    logger.warning(alarm_detail)

        except Exception as e:
            error_msg = f"[ERROR] Error saving device data for {client_id}: {e}"
            print(error_msg)
            logger.error(error_msg, exc_info=True)
            db.rollback()

        finally:
            db.close()

    def is_alarm_monitoring_enabled(self):
        """Check if alarm monitoring is enabled"""
        flag_file = "/tmp/alarm_monitoring_enabled"
        # If file exists, monitoring is enabled (default: enabled)
        return os.path.exists(flag_file)

    def check_alarms(self, db: Session, device_id: int, client_id: str, reading: DeviceReading):
        """
        Check if readings exceed alarm thresholds
        Only creates alarms for Yellow and Red zones (not Green or Light Red zones)

        Thresholds:
        - Temperature: Red (<0°F), Yellow (>120°F) - ignore Light Red (0-10°F) and Green (10-120°F)
        - Static Pressure: Yellow (<10 PSI), Red (>140 PSI) - ignore Green (10-90 PSI) and Light Red (90-140 PSI)
        - Differential Pressure: Yellow (<0 IWC), Red (>400 IWC) - ignore Green (0-300 IWC) and Light Red (300-400 IWC)
        - Battery: Red (<10V), Yellow (>14V) - ignore Light Red (10-10.5V) and Green (10.5-14V)
        - Specific Gravity: Red (<0.58 or >0.69) - Green (0.58-0.69)
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

        # Specific Gravity thresholds - Normal range: 0.58 to 0.69
        if reading.specific_gravity is not None:
            gravity = reading.specific_gravity
            # Red zone: < 0.58 (too low)
            if gravity < 0.58:
                alarm = self.create_alarm(
                    db, device_id, client_id, "specific_gravity", gravity,
                    "low", 0.58, "Specific Gravity too low (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)
            # Red zone: > 0.69 (too high)
            elif gravity > 0.69:
                alarm = self.create_alarm(
                    db, device_id, client_id, "specific_gravity", gravity,
                    "high", 0.69, "Specific Gravity too high (Red zone)",
                    severity="high"
                )
                if alarm:
                    alarms_created.append(alarm)

        return alarms_created

    def create_alarm(self, db: Session, device_id: int, client_id: str, parameter: str,
                    value: float, threshold_type: str, threshold_value: float, message: str,
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

    def check_offline_devices(self):
        """Background task to check for offline devices every 90 minutes (1 hour 30 min)"""
        logger.info("[OFFLINE MONITOR] Starting offline device monitoring thread")
        print("[INFO] Offline device monitoring started (90-minute check interval)")

        while self.running:
            try:
                db = SessionLocal()
                try:
                    # Get current time
                    now = datetime.now()
                    # Calculate threshold time (90 minutes ago - 1 hour 30 min)
                    threshold_time = now - timedelta(minutes=90)

                    # Find devices that were active but haven't sent data in 90 minutes
                    offline_devices = db.query(Device).filter(
                        Device.is_active == True,
                        Device.last_seen < threshold_time
                    ).all()

                    if offline_devices:
                        for device in offline_devices:
                            device.is_active = False
                            logger.warning(f"[OFFLINE] Device {device.client_id} marked as offline (last seen: {device.last_seen})")
                            print(f"⚠️  [OFFLINE] Device {device.client_id} is now OFFLINE (no data for 90 minutes)")

                            # Send offline email notification
                            try:
                                email_service.send_device_offline_notification(
                                    device=device,
                                    recipients=OFFLINE_NOTIFICATION_EMAILS
                                )
                                logger.info(f"[EMAIL] Offline notification sent for {device.device_name or device.client_id}")
                            except Exception as email_err:
                                logger.error(f"[EMAIL] Failed to send offline notification for {device.client_id}: {email_err}")

                        db.commit()

                except Exception as e:
                    logger.error(f"[ERROR] Error checking offline devices: {e}", exc_info=True)
                    db.rollback()
                finally:
                    db.close()

                # Sleep for 90 minutes (5400 seconds) before next check
                time.sleep(5400)

            except Exception as e:
                logger.error(f"[ERROR] Offline check thread error: {e}", exc_info=True)
                time.sleep(5400)

        logger.info("[OFFLINE MONITOR] Offline device monitoring thread stopped")

    def start(self):
        """Start MQTT client in blocking mode"""
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

        try:
            print(f"\n{'='*60}")
            print(f"  SNGPL IoT - Standalone MQTT Listener")
            print(f"{'='*60}")
            print(f"  Broker:   {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
            print(f"  Topic:    {settings.MQTT_TOPIC}")
            print(f"  Database: {settings.DATABASE_URL}")
            print(f"{'='*60}\n")
            print(f"[INFO] Connecting to MQTT broker...")
            print(f"[INFO] Waiting for incoming MQTT messages...")
            print(f"[INFO] All received data will be displayed below:")
            print(f"{'='*60}\n")

            # Enable alarm monitoring by default
            flag_file = "/tmp/alarm_monitoring_enabled"
            if not os.path.exists(flag_file):
                open(flag_file, 'a').close()
                print(f"[INFO] Alarm monitoring: ENABLED")

            self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)

            # Start offline monitoring thread
            self.running = True
            self.offline_check_thread = threading.Thread(target=self.check_offline_devices, daemon=True)
            self.offline_check_thread.start()

            # Run forever (blocking)
            self.client.loop_forever()

        except KeyboardInterrupt:
            print("\n\n[INFO] Shutting down MQTT listener...")
            self.stop()
            print("[OK] MQTT listener stopped successfully")

        except Exception as e:
            logger.error(f"[ERROR] Error connecting to MQTT broker: {e}", exc_info=True)
            print(f"\n[ERROR] Failed to connect to MQTT broker: {e}")
            print("[INFO] Please check your network connection and broker settings")
            sys.exit(1)

    def stop(self):
        """Stop MQTT client"""
        self.running = False
        if self.offline_check_thread and self.offline_check_thread.is_alive():
            self.offline_check_thread.join(timeout=5)
        if self.client:
            self.client.disconnect()
            self.connected = False


def main():
    """Main entry point"""
    listener = StandaloneMQTTListener()
    listener.start()


if __name__ == "__main__":
    main()
