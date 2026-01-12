"""Analytics endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import csv
import io

from app.db.database import get_db
from app.models.models import DeviceReading, Device, User
from app.api.v1.auth import get_current_user

router = APIRouter()


class ReadingResponse(BaseModel):
    id: int
    device_id: int
    client_id: str
    temperature: Optional[float] = None
    static_pressure: Optional[float] = None
    differential_pressure: Optional[float] = None
    volume: Optional[float] = None
    total_volume_flow: Optional[float] = None
    battery: Optional[float] = None
    max_static_pressure: Optional[float] = None
    min_static_pressure: Optional[float] = None
    # T18-T114 Analytics parameters - default to 0 for chart compatibility
    last_hour_flow_time: float = 0
    last_hour_diff_pressure: float = 0
    last_hour_static_pressure: float = 0
    last_hour_temperature: float = 0
    last_hour_volume: float = 0
    last_hour_energy: float = 0
    specific_gravity: float = 0
    timestamp: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    """Paginated response model"""
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[ReadingResponse]


@router.get("/readings", response_model=PaginatedResponse)
async def get_readings(
    device_id: Optional[int] = None,
    client_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page (max 1000)"),
    db: Session = Depends(get_db)
):
    """Get device readings with pagination and filters - Public endpoint. Can filter by device_id OR client_id"""
    from app.models.models import Device
    query = db.query(DeviceReading)

    # Apply filters - support both device_id and client_id
    if device_id:
        query = query.filter(DeviceReading.device_id == device_id)
    elif client_id:
        query = query.filter(DeviceReading.client_id == client_id)

    if start_date:
        query = query.filter(DeviceReading.timestamp >= start_date)

    if end_date:
        query = query.filter(DeviceReading.timestamp <= end_date)

    # Get total count
    total = query.count()

    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size  # Ceiling division
    offset = (page - 1) * page_size

    # Get paginated data
    readings = query.order_by(DeviceReading.timestamp.desc()).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": readings
    }


@router.get("/device/{device_id}/recent", response_model=List[ReadingResponse])
async def get_device_recent_readings(
    device_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent readings for a specific device"""
    readings = db.query(DeviceReading).filter(
        DeviceReading.device_id == device_id
    ).order_by(DeviceReading.timestamp.desc()).limit(limit).all()

    return readings


@router.get("/readings/export/csv")
async def export_readings_csv(
    device_id: int = None,
    start_date: datetime = None,
    end_date: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export readings to CSV"""
    query = db.query(DeviceReading)

    if device_id:
        query = query.filter(DeviceReading.device_id == device_id)

    if start_date:
        query = query.filter(DeviceReading.timestamp >= start_date)

    if end_date:
        query = query.filter(DeviceReading.timestamp <= end_date)

    readings = query.order_by(DeviceReading.timestamp.desc()).all()

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Device ID", "Temperature", "Static Pressure", "Differential Pressure",
        "Volume", "Total Volume Flow", "Timestamp"
    ])

    # Write data
    for reading in readings:
        writer.writerow([
            reading.device_id,
            reading.temperature,
            reading.static_pressure,
            reading.differential_pressure,
            reading.volume,
            reading.total_volume_flow,
            reading.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        ])

    # Create response
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=readings_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/summary")
async def get_analytics_summary(
    device_id: int = None,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics summary for specified period"""
    start_date = datetime.now() - timedelta(days=days)

    query = db.query(DeviceReading).filter(DeviceReading.timestamp >= start_date)

    if device_id:
        query = query.filter(DeviceReading.device_id == device_id)

    readings = query.all()

    if not readings:
        return {
            "device_id": device_id,
            "period_days": days,
            "total_readings": 0,
            "averages": {},
            "min_values": {},
            "max_values": {}
        }

    # Calculate statistics
    total_readings = len(readings)

    avg_temp = sum(r.temperature for r in readings) / total_readings
    avg_static = sum(r.static_pressure for r in readings) / total_readings
    avg_diff = sum(r.differential_pressure for r in readings) / total_readings
    avg_volume = sum(r.volume for r in readings) / total_readings
    avg_flow = sum(r.total_volume_flow for r in readings) / total_readings

    min_temp = min(r.temperature for r in readings)
    max_temp = max(r.temperature for r in readings)

    min_static = min(r.static_pressure for r in readings)
    max_static = max(r.static_pressure for r in readings)

    min_diff = min(r.differential_pressure for r in readings)
    max_diff = max(r.differential_pressure for r in readings)

    return {
        "device_id": device_id,
        "period_days": days,
        "total_readings": total_readings,
        "averages": {
            "temperature": round(avg_temp, 2),
            "static_pressure": round(avg_static, 2),
            "differential_pressure": round(avg_diff, 2),
            "volume": round(avg_volume, 2),
            "total_volume_flow": round(avg_flow, 2)
        },
        "min_values": {
            "temperature": round(min_temp, 2),
            "static_pressure": round(min_static, 2),
            "differential_pressure": round(min_diff, 2)
        },
        "max_values": {
            "temperature": round(max_temp, 2),
            "static_pressure": round(max_static, 2),
            "differential_pressure": round(max_diff, 2)
        }
    }
