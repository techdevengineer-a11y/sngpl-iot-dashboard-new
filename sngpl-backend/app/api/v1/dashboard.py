"""Dashboard specific endpoints"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.db.database import get_db
from app.models.models import Device, DeviceReading, Alarm, User, AlarmThreshold
from app.api.v1.auth import get_current_user

router = APIRouter()


def get_parameter_status(value: float, parameter: str, thresholds: Dict[str, Any]) -> Dict[str, str]:
    """
    Determine parameter status based on thresholds
    Returns: {"status": "Normal|Warning|High|Low|Critical", "color": "#hex"}
    """
    if parameter not in thresholds or not thresholds[parameter]:
        return {"status": "Unknown", "color": "#808080"}

    threshold = thresholds[parameter]
    low = threshold.get('low_threshold')
    high = threshold.get('high_threshold')

    if low is not None and value < low * 0.8:  # Critical low
        return {"status": "Critical", "color": "#E53935", "severity": "high"}
    elif low is not None and value < low:  # Low
        return {"status": "Low", "color": "#E53935", "severity": "medium"}
    elif high is not None and value > high * 1.2:  # Critical high
        return {"status": "HighPressure", "color": "#E53935", "severity": "high"}
    elif high is not None and value > high:  # High
        return {"status": "High", "color": "#FD6835", "severity": "medium"}
    elif low is not None and value < low * 0.9:  # Warning low
        return {"status": "LowPressure", "color": "#FD6835", "severity": "low"}
    elif high is not None and value > high * 0.9:  # Warning high
        return {"status": "Warning", "color": "#FD6835", "severity": "low"}
    else:
        return {"status": "Normal", "color": "#43A047", "severity": "normal"}


def get_device_online_status(last_seen: datetime) -> Dict[str, str]:
    """Determine device online status"""
    if not last_seen:
        return {"status": "Offline", "color": "#808080"}

    diff_minutes = (datetime.now() - last_seen).total_seconds() / 60

    if diff_minutes < 5:
        return {"status": "Online", "color": "#43A047"}
    elif diff_minutes < 30:
        return {"status": "Warning", "color": "#FD6835"}
    else:
        return {"status": "Offline", "color": "#E53935"}


@router.get("/recent-readings")
async def get_recent_readings(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent device readings for charts"""
    readings = db.query(DeviceReading).order_by(desc(DeviceReading.timestamp)).limit(limit).all()

    return [{
        "id": r.id,
        "client_id": r.client_id,
        "temperature": r.temperature,
        "static_pressure": r.static_pressure,
        "differential_pressure": r.differential_pressure,
        "volume": r.volume,
        "total_volume_flow": r.total_volume_flow,
        "timestamp": r.timestamp.isoformat()
    } for r in readings]


@router.get("/recent-alarms")
async def get_recent_alarms(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent alarms for timeline"""
    alarms = db.query(Alarm).order_by(desc(Alarm.triggered_at)).limit(limit).all()

    return [{
        "id": a.id,
        "client_id": a.client_id,
        "parameter": a.parameter,
        "value": a.value,
        "severity": a.severity,
        "is_acknowledged": a.is_acknowledged,
        "triggered_at": a.triggered_at.isoformat()
    } for a in alarms]


@router.get("/system-metrics")
async def get_system_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system performance metrics"""
    # Calculate metrics
    total_readings = db.query(DeviceReading).count()

    # Readings in last hour
    one_hour_ago = datetime.now() - timedelta(hours=1)
    recent_readings = db.query(DeviceReading).filter(
        DeviceReading.timestamp >= one_hour_ago
    ).count()

    # Average readings per minute
    readings_per_minute = recent_readings / 60 if recent_readings > 0 else 0

    # Device uptime - calculate based on devices that sent data in last 5 minutes
    total_devices = db.query(Device).count()
    five_minutes_ago = datetime.now() - timedelta(minutes=5)
    active_devices = db.query(Device).filter(
        Device.last_seen != None,
        Device.last_seen >= five_minutes_ago
    ).count()
    uptime_percentage = (active_devices / total_devices * 100) if total_devices > 0 else 0

    return {
        "total_readings": total_readings,
        "readings_last_hour": recent_readings,
        "readings_per_minute": round(readings_per_minute, 2),
        "uptime_percentage": round(uptime_percentage, 1),
        "total_devices": total_devices,
        "active_devices": active_devices
    }


@router.get("/parameter-averages")
async def get_parameter_averages(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get average values for all parameters"""
    time_ago = datetime.now() - timedelta(hours=hours)

    readings = db.query(DeviceReading).filter(
        DeviceReading.timestamp >= time_ago
    ).all()

    if not readings:
        return {
            "temperature": 0,
            "static_pressure": 0,
            "differential_pressure": 0,
            "volume": 0,
            "total_volume_flow": 0
        }

    count = len(readings)

    return {
        "temperature": round(sum(r.temperature for r in readings) / count, 2),
        "static_pressure": round(sum(r.static_pressure for r in readings) / count, 2),
        "differential_pressure": round(sum(r.differential_pressure for r in readings) / count, 2),
        "volume": round(sum(r.volume for r in readings) / count, 2),
        "total_volume_flow": round(sum(r.total_volume_flow for r in readings) / count, 2),
        "period_hours": hours,
        "sample_count": count
    }


@router.get("/status-overview")
async def get_status_overview(
    device_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get enhanced status overview with parameter-level status indicators
    Similar to EVC Status Indicators table in reference
    """
    # Build query
    query = db.query(Device)
    if device_type:
        query = query.filter(Device.device_type == device_type.upper())

    devices = query.all()

    # Get thresholds for all devices
    threshold_records = db.query(AlarmThreshold).all()
    thresholds_map = {}
    for t in threshold_records:
        if t.device_id not in thresholds_map:
            thresholds_map[t.device_id] = {}
        thresholds_map[t.device_id][t.parameter] = {
            'low_threshold': t.low_threshold,
            'high_threshold': t.high_threshold
        }

    result = []
    for device in devices:
        # Get latest reading
        latest_reading = db.query(DeviceReading).filter(
            DeviceReading.device_id == device.id
        ).order_by(desc(DeviceReading.timestamp)).first()

        # Get active alarms count
        active_alarms = db.query(Alarm).filter(
            Alarm.device_id == device.id,
            Alarm.is_acknowledged == False
        ).count()

        # Get device thresholds
        device_thresholds = thresholds_map.get(device.id, {})

        # Calculate online status
        online_status = get_device_online_status(device.last_seen)

        device_status = {
            "id": device.id,
            "client_id": device.client_id,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "location": device.location,
            "online_status": online_status,
            "active_alarms": active_alarms,
            "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            "parameters": {}
        }

        if latest_reading:
            # Calculate status for each parameter
            device_status["parameters"] = {
                "temperature": {
                    "value": latest_reading.temperature,
                    "status": get_parameter_status(latest_reading.temperature, "temperature", device_thresholds)
                },
                "static_pressure": {
                    "value": latest_reading.static_pressure,
                    "status": get_parameter_status(latest_reading.static_pressure, "static_pressure", device_thresholds)
                },
                "differential_pressure": {
                    "value": latest_reading.differential_pressure,
                    "status": get_parameter_status(latest_reading.differential_pressure, "differential_pressure", device_thresholds)
                },
                "volume": {
                    "value": latest_reading.volume,
                    "status": get_parameter_status(latest_reading.volume, "volume", device_thresholds)
                },
                "total_volume_flow": {
                    "value": latest_reading.total_volume_flow,
                    "status": get_parameter_status(latest_reading.total_volume_flow, "total_volume_flow", device_thresholds)
                }
            }
            device_status["timestamp"] = latest_reading.timestamp.isoformat()
        else:
            device_status["parameters"] = {
                "temperature": {"value": None, "status": {"status": "Unknown", "color": "#808080"}},
                "static_pressure": {"value": None, "status": {"status": "Unknown", "color": "#808080"}},
                "differential_pressure": {"value": None, "status": {"status": "Unknown", "color": "#808080"}},
                "volume": {"value": None, "status": {"status": "Unknown", "color": "#808080"}},
                "total_volume_flow": {"value": None, "status": {"status": "Unknown", "color": "#808080"}}
            }
            device_status["timestamp"] = None

        result.append(device_status)

    return {
        "devices": result,
        "total_count": len(result),
        "device_type_filter": device_type
    }


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall dashboard statistics for main dashboard cards"""
    # Total devices
    total_devices = db.query(Device).count()

    # Active devices (sent data in last 5 minutes)
    five_min_ago = datetime.now() - timedelta(minutes=5)
    active_devices = db.query(Device).filter(
        Device.last_seen.isnot(None),
        Device.last_seen >= five_min_ago
    ).count()

    # Total readings
    total_readings = db.query(DeviceReading).count()

    # Active alarms (not acknowledged)
    active_alarms = db.query(Alarm).filter(
        Alarm.is_acknowledged == False
    ).count()

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "total_readings": total_readings,
        "active_alarms": active_alarms
    }
