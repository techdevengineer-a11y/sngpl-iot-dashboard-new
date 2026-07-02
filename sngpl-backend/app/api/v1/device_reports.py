"""Per-device reading-count reports for the Manage page.

Devices report roughly once an hour, so a healthy device produces ~24
readings per day. These counters surface devices that under-report or
went silent — every device is included, so a silent device shows 0.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.db.database import get_db
from app.models.models import Device, DeviceReading, User
from app.api.v1.auth import get_current_user

router = APIRouter()

EXPECTED_READINGS_PER_DAY = 24


@router.get("/reading-counts")
async def get_reading_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reading counters per device over the last 24 hours and last 30 days."""
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    month_ago = now - timedelta(days=30)

    rows = (
        db.query(
            DeviceReading.device_id,
            func.sum(case((DeviceReading.timestamp >= day_ago, 1), else_=0)).label("count_24h"),
            func.count(DeviceReading.id).label("count_30d"),
            func.max(DeviceReading.timestamp).label("last_reading"),
        )
        .filter(DeviceReading.timestamp >= month_ago)
        .group_by(DeviceReading.device_id)
        .all()
    )
    counts = {row.device_id: row for row in rows}

    expected_24h = EXPECTED_READINGS_PER_DAY
    expected_30d = EXPECTED_READINGS_PER_DAY * 30

    devices = db.query(Device.id, Device.client_id).all()
    result = []
    for device in devices:
        row = counts.get(device.id)
        count_24h = int(row.count_24h) if row else 0
        count_30d = int(row.count_30d) if row else 0
        result.append({
            "id": device.id,
            "client_id": device.client_id,
            "count_24h": count_24h,
            "count_30d": count_30d,
            "missed_24h": max(0, expected_24h - count_24h),
            "missed_30d": max(0, expected_30d - count_30d),
            "last_reading": row.last_reading.isoformat() if row and row.last_reading else None,
        })

    return {
        "expected_24h": expected_24h,
        "expected_30d": expected_30d,
        "generated_at": now.isoformat(),
        "devices": result,
    }
