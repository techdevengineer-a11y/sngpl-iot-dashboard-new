"""Per-device reading-count reports for the Manage page.

Devices report roughly once an hour, so a healthy device produces ~24
readings per day. These counters surface devices that under-report or
went silent - every device is included, so a silent device shows 0.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from calendar import monthrange
from typing import Optional
import re

from app.db.database import get_db
from app.models.models import Device, DeviceReading, User
from app.api.v1.auth import get_current_user

router = APIRouter()

EXPECTED_READINGS_PER_DAY = 24


@router.get("/reading-counts")
async def get_reading_counts(
    month: Optional[str] = Query(None, description="Month to report on, YYYY-MM; defaults to the current month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reading counters per device: last 24 hours plus a selected month.

    For past months the expected total is days_in_month * 24; for the
    running month it is the hours elapsed so far.
    """
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    if month:
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")
        year, mon = int(month[:4]), int(month[5:7])
        if not 1 <= mon <= 12:
            raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")
    else:
        year, mon = now.year, now.month

    month_start = datetime(year, mon, 1, tzinfo=timezone.utc)
    days_in_month = monthrange(year, mon)[1]
    month_end = month_start + timedelta(days=days_in_month)

    if month_start > now:
        raise HTTPException(status_code=400, detail="month is in the future")

    if month_end > now:
        # Running month: only the hours elapsed so far can have readings
        expected_month = max(1, int((now - month_start).total_seconds() // 3600))
    else:
        expected_month = days_in_month * EXPECTED_READINGS_PER_DAY

    day_rows = (
        db.query(
            DeviceReading.device_id,
            func.count(DeviceReading.id).label("count_24h"),
            func.max(DeviceReading.timestamp).label("last_reading"),
        )
        .filter(DeviceReading.timestamp >= day_ago)
        .group_by(DeviceReading.device_id)
        .all()
    )
    day_counts = {row.device_id: row for row in day_rows}

    month_rows = (
        db.query(
            DeviceReading.device_id,
            func.count(DeviceReading.id).label("count_month"),
        )
        .filter(DeviceReading.timestamp >= month_start, DeviceReading.timestamp < month_end)
        .group_by(DeviceReading.device_id)
        .all()
    )
    month_counts = {row.device_id: row.count_month for row in month_rows}

    expected_24h = EXPECTED_READINGS_PER_DAY

    devices = db.query(Device.id, Device.client_id).all()
    result = []
    for device in devices:
        day_row = day_counts.get(device.id)
        count_24h = int(day_row.count_24h) if day_row else 0
        count_month = int(month_counts.get(device.id, 0))
        result.append({
            "id": device.id,
            "client_id": device.client_id,
            "count_24h": count_24h,
            "missed_24h": max(0, expected_24h - count_24h),
            "count_month": count_month,
            "missed_month": max(0, expected_month - count_month),
            "last_reading": day_row.last_reading.isoformat() if day_row and day_row.last_reading else None,
        })

    return {
        "expected_24h": expected_24h,
        "month": f"{year:04d}-{mon:02d}",
        "expected_month": expected_month,
        "generated_at": now.isoformat(),
        "devices": result,
    }
