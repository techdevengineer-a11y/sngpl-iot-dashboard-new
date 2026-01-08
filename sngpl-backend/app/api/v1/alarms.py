"""Alarm management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.models import Alarm, AlarmThreshold, Device, User
from app.api.v1.auth import get_current_user
from app.services.audit_service import audit_service

router = APIRouter()


class AlarmResponse(BaseModel):
    id: int
    device_id: int
    client_id: str
    parameter: str
    value: float
    threshold_type: str
    severity: str
    is_acknowledged: bool
    triggered_at: datetime

    class Config:
        from_attributes = True


class AlarmThresholdCreate(BaseModel):
    device_id: int
    parameter: str
    low_threshold: float = None
    high_threshold: float = None
    is_active: bool = True


class AlarmThresholdResponse(BaseModel):
    id: int
    device_id: int
    parameter: str
    low_threshold: float = None
    high_threshold: float = None
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AlarmResponse])
async def get_alarms(
    acknowledged: bool = None,
    severity: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all alarms with optional filters"""
    query = db.query(Alarm)

    if acknowledged is not None:
        query = query.filter(Alarm.is_acknowledged == acknowledged)

    if severity:
        query = query.filter(Alarm.severity == severity)

    alarms = query.order_by(Alarm.triggered_at.desc()).limit(limit).all()
    return alarms


@router.get("/stats")
async def get_alarm_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get alarm statistics"""
    total_alarms = db.query(Alarm).count()
    active_alarms = db.query(Alarm).filter(Alarm.is_acknowledged == False).count()
    critical_alarms = db.query(Alarm).filter(
        Alarm.is_acknowledged == False,
        Alarm.severity == "critical"
    ).count()

    return {
        "total_alarms": total_alarms,
        "active_alarms": active_alarms,
        "critical_alarms": critical_alarms
    }


@router.get("/by-section")
async def get_alarms_by_section(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get alarms grouped by section with device counts and statistics"""

    sections_data = []
    section_info = {
        'I': {'name': 'Section I - Multan/BWP/Sahiwal'},
        'II': {'name': 'Section II'},
        'III': {'name': 'Section III'},
        'IV': {'name': 'Section IV'},
        'V': {'name': 'Section V'},
    }

    for section_id, info in section_info.items():
        # Get all devices in this section
        devices = db.query(Device).filter(
            Device.client_id.like(f'SMS-{section_id}-%')
        ).all()

        device_ids = [d.id for d in devices]

        if not device_ids:
            sections_data.append({
                'section_id': section_id,
                'section_name': info['name'],
                'total_devices': 0,
                'active_devices': 0,
                'total_alarms': 0,
                'active_alarms': 0,
                'high_severity_alarms': 0,
                'medium_severity_alarms': 0,
                'recent_alarms': []
            })
            continue

        # Count active devices
        active_devices = sum(1 for d in devices if d.is_active)

        # Get all alarms for this section
        all_alarms = db.query(Alarm).filter(
            Alarm.device_id.in_(device_ids)
        ).order_by(Alarm.triggered_at.desc()).all()

        # Get active (unacknowledged) alarms
        active_alarms_list = [a for a in all_alarms if not a.is_acknowledged]

        # Count by severity
        high_severity = sum(1 for a in active_alarms_list if a.severity == "high")
        medium_severity = sum(1 for a in active_alarms_list if a.severity == "medium")

        # Get recent alarms (last 5)
        recent_alarms = []
        for alarm in all_alarms[:5]:
            recent_alarms.append({
                'id': alarm.id,
                'client_id': alarm.client_id,
                'parameter': alarm.parameter,
                'value': alarm.value,
                'severity': alarm.severity,
                'threshold_type': alarm.threshold_type,
                'is_acknowledged': alarm.is_acknowledged,
                'triggered_at': alarm.triggered_at.isoformat()
            })

        sections_data.append({
            'section_id': section_id,
            'section_name': info['name'],
            'total_devices': len(devices),
            'active_devices': active_devices,
            'total_alarms': len(all_alarms),
            'active_alarms': len(active_alarms_list),
            'high_severity_alarms': high_severity,
            'medium_severity_alarms': medium_severity,
            'recent_alarms': recent_alarms
        })

    return {
        'sections': sections_data,
        'timestamp': datetime.now().isoformat()
    }


@router.put("/{alarm_id}/acknowledge")
async def acknowledge_alarm(
    alarm_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an alarm"""
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    alarm.is_acknowledged = True
    alarm.acknowledged_by = current_user.id
    alarm.acknowledged_at = datetime.now()

    db.commit()
    db.refresh(alarm)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="ACKNOWLEDGE", resource_type="alarm",
        user=current_user, resource_id=alarm.id,
        details={"parameter": alarm.parameter, "severity": alarm.severity},
        status="success"
    )

    return {"message": "Alarm acknowledged successfully"}


@router.delete("/{alarm_id}")
async def delete_alarm(
    alarm_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an alarm"""
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    # Store alarm details for audit log before deletion
    alarm_details = {
        "client_id": alarm.client_id,
        "parameter": alarm.parameter,
        "value": alarm.value,
        "severity": alarm.severity
    }

    # Delete the alarm
    db.delete(alarm)
    db.commit()

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="DELETE", resource_type="alarm",
        user=current_user, resource_id=alarm_id,
        details=alarm_details,
        status="success"
    )

    return {"message": "Alarm deleted successfully"}


@router.delete("/")
async def delete_all_alarms(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all alarms"""
    # Count alarms before deletion
    alarm_count = db.query(Alarm).count()

    if alarm_count == 0:
        return {"message": "No alarms to delete", "deleted_count": 0}

    # Delete all alarms
    db.query(Alarm).delete()
    db.commit()

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="DELETE_ALL", resource_type="alarm",
        user=current_user, resource_id=None,
        details={"deleted_count": alarm_count},
        status="success"
    )

    return {"message": f"Successfully deleted {alarm_count} alarm(s)", "deleted_count": alarm_count}


@router.get("/monitoring/status")
async def get_alarm_monitoring_status(current_user: User = Depends(get_current_user)):
    """Get current alarm monitoring status"""
    import os
    flag_file = "/tmp/alarm_monitoring_enabled"
    is_enabled = os.path.exists(flag_file)
    return {"enabled": is_enabled}


@router.post("/monitoring/toggle")
async def toggle_alarm_monitoring(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle alarm monitoring on/off"""
    import os
    flag_file = "/tmp/alarm_monitoring_enabled"

    if os.path.exists(flag_file):
        # Disable monitoring
        os.remove(flag_file)
        is_enabled = False
        action = "STOP"
        message = "Alarm monitoring stopped"
    else:
        # Enable monitoring
        open(flag_file, 'a').close()
        is_enabled = True
        action = "START"
        message = "Alarm monitoring started"

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action=action + "_ALARM_MONITORING",
        resource_type="alarm_monitoring",
        user=current_user,
        resource_id=None,
        details={"enabled": is_enabled},
        status="success"
    )

    return {"enabled": is_enabled, "message": message}


@router.get("/thresholds", response_model=List[AlarmThresholdResponse])
async def get_thresholds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all alarm thresholds"""
    thresholds = db.query(AlarmThreshold).filter(AlarmThreshold.is_active == True).all()
    return thresholds


@router.post("/thresholds", response_model=AlarmThresholdResponse)
async def create_threshold(
    threshold_data: AlarmThresholdCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create alarm threshold"""
    # Check if device exists
    device = db.query(Device).filter(Device.id == threshold_data.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Check if threshold already exists
    existing = db.query(AlarmThreshold).filter(
        AlarmThreshold.device_id == threshold_data.device_id,
        AlarmThreshold.parameter == threshold_data.parameter
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Threshold already exists for this device and parameter")

    new_threshold = AlarmThreshold(**threshold_data.dict())
    db.add(new_threshold)
    db.commit()
    db.refresh(new_threshold)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="CREATE", resource_type="threshold",
        user=current_user, resource_id=new_threshold.id,
        details={"device_id": device.id, "parameter": threshold_data.parameter},
        status="success"
    )

    return new_threshold


@router.put("/thresholds/{threshold_id}", response_model=AlarmThresholdResponse)
async def update_threshold(
    threshold_id: int,
    threshold_data: AlarmThresholdCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update alarm threshold"""
    threshold = db.query(AlarmThreshold).filter(AlarmThreshold.id == threshold_id).first()
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    for key, value in threshold_data.dict().items():
        setattr(threshold, key, value)

    db.commit()
    db.refresh(threshold)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="UPDATE", resource_type="threshold",
        user=current_user, resource_id=threshold.id,
        details={"device_id": threshold.device_id, "parameter": threshold.parameter},
        status="success"
    )

    return threshold


@router.delete("/thresholds/{threshold_id}")
async def delete_threshold(
    threshold_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete alarm threshold"""
    threshold = db.query(AlarmThreshold).filter(AlarmThreshold.id == threshold_id).first()
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    device_id = threshold.device_id
    parameter = threshold.parameter

    db.delete(threshold)
    db.commit()

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="DELETE", resource_type="threshold",
        user=current_user, resource_id=threshold_id,
        details={"device_id": device_id, "parameter": parameter},
        status="success"
    )

    return {"message": "Threshold deleted successfully"}
