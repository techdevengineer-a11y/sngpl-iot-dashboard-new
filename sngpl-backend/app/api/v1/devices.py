"""Device management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, field_validator, Field
from datetime import datetime

from app.db.database import get_db
from app.models.models import Device, DeviceReading, User
from app.api.v1.auth import get_current_user
from app.services.audit_service import audit_service
from app.core.redis_client import cache_response

router = APIRouter()


class DeviceCreate(BaseModel):
    client_id: str = Field(..., min_length=1, max_length=100, description="Unique device client ID")
    device_name: str = Field(..., min_length=1, max_length=200, description="Device name")
    device_type: str = Field(default="EVC", description="Device type: EVC or FC")
    location: str = Field(..., min_length=1, max_length=500, description="Device location")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")

    @field_validator("client_id")
    @classmethod
    def validate_client_id(cls, v: str) -> str:
        """Validate client_id format"""
        if not v.strip():
            raise ValueError("client_id cannot be empty or whitespace")
        # Allow alphanumeric, underscore, hyphen
        if not all(c.isalnum() or c in ['_', '-'] for c in v):
            raise ValueError("client_id can only contain letters, numbers, underscores, and hyphens")
        return v.strip()

    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: str) -> str:
        """Validate device_type is EVC or FC"""
        v = v.strip().upper()
        if v not in ['EVC', 'FC']:
            raise ValueError("device_type must be either 'EVC' or 'FC'")
        return v

    @field_validator("device_name", "location")
    @classmethod
    def validate_string_field(cls, v: str) -> str:
        """Validate string fields are not empty"""
        if not v.strip():
            raise ValueError("Field cannot be empty or whitespace")
        return v.strip()


class DeviceResponse(BaseModel):
    id: int
    client_id: str
    device_name: str
    device_type: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeviceStats(BaseModel):
    total_devices: int
    active_devices: int
    inactive_devices: int
    total_readings: int


@router.get("/stats", response_model=DeviceStats)
async def get_device_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get device statistics - active means device sent data in last 5 minutes"""
    from datetime import datetime, timedelta

    total_devices = db.query(Device).count()

    # Calculate active devices: those that sent data in last 5 minutes
    five_minutes_ago = datetime.now() - timedelta(minutes=5)
    active_devices = db.query(Device).filter(
        Device.last_seen != None,
        Device.last_seen >= five_minutes_ago
    ).count()

    inactive_devices = total_devices - active_devices
    total_readings = db.query(DeviceReading).count()

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "inactive_devices": inactive_devices,
        "total_readings": total_readings
    }


@router.get("/", response_model=List[DeviceResponse])
@cache_response("devices:all", ttl=120)  # Cache for 2 minutes - optimized for 10-min data intervals
async def get_devices(db: Session = Depends(get_db)):
    """Get all devices - Public endpoint with Redis caching (2min TTL)"""
    devices = db.query(Device).all()
    return devices


@router.get("/{client_id}", response_model=DeviceResponse)
async def get_device(client_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get single device"""
    device = db.query(Device).filter(Device.client_id == client_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/", response_model=DeviceResponse)
async def create_device(
    device_data: DeviceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new device"""
    # Check if device already exists
    if db.query(Device).filter(Device.client_id == device_data.client_id).first():
        raise HTTPException(status_code=400, detail="Device ID already exists")

    new_device = Device(**device_data.dict())
    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="CREATE", resource_type="device",
        user=current_user, resource_id=new_device.id,
        details={"client_id": new_device.client_id, "device_name": new_device.device_name},
        status="success"
    )

    return new_device


@router.put("/{client_id}", response_model=DeviceResponse)
async def update_device(
    client_id: str,
    device_data: DeviceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update device"""
    device = db.query(Device).filter(Device.client_id == client_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for key, value in device_data.dict().items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="UPDATE", resource_type="device",
        user=current_user, resource_id=device.id,
        details={"client_id": device.client_id, "device_name": device.device_name},
        status="success"
    )

    return device


@router.delete("/{client_id}")
async def delete_device(
    client_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete device by client_id"""
    device = db.query(Device).filter(Device.client_id == client_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device_id = device.id
    device_name = device.device_name

    db.delete(device)
    db.commit()

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="DELETE", resource_type="device",
        user=current_user, resource_id=device_id,
        details={"client_id": client_id, "device_name": device_name},
        status="success"
    )

    return {"message": "Device deleted successfully"}


@router.get("/{client_id}/readings")
async def get_device_readings(client_id: str, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get device readings"""
    device = db.query(Device).filter(Device.client_id == client_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    readings = db.query(DeviceReading).filter(DeviceReading.device_id == device.id).order_by(DeviceReading.timestamp.desc()).limit(limit).all()

    return readings
