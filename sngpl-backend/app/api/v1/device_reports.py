"""Per-device reading-count reports for the Manage page.

Devices report roughly once an hour, so a healthy device produces ~24
readings per day. These counters surface devices that under-report or
went silent - every device is included, so a silent device shows 0.

Day/month boundaries use Pakistan time (UTC+5, no DST) so the counters
match the user's calendar, and expected totals only cover elapsed hours
so an unfinished day or month never looks complete or missing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone, date
from calendar import monthrange, month_name
from typing import Optional
import re

from app.db.database import get_db
from app.models.models import Device, DeviceReading, User
from app.api.v1.auth import get_current_user

router = APIRouter()

EXPECTED_READINGS_PER_DAY = 24
PKT = timezone(timedelta(hours=5))


@router.get("/reading-counts")
async def get_reading_counts(
    month: Optional[str] = Query(None, description="Month to report on, YYYY-MM; defaults to the current month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reading counters per device: today (since midnight PKT) plus a selected month."""
    now = datetime.now(timezone.utc)

    # Today = since midnight Pakistan time; expect one reading per elapsed hour
    pkt_now = now.astimezone(PKT)
    today_start = pkt_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    expected_today = max(1, int((now - today_start).total_seconds() // 3600))

    year, mon = _parse_month(month, pkt_now)

    month_start = datetime(year, mon, 1, tzinfo=PKT).astimezone(timezone.utc)
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
            func.count(DeviceReading.id).label("count_today"),
            func.max(DeviceReading.timestamp).label("last_reading"),
        )
        .filter(DeviceReading.timestamp >= today_start)
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

    devices = db.query(Device.id, Device.client_id).all()
    result = []
    for device in devices:
        day_row = day_counts.get(device.id)
        count_today = int(day_row.count_today) if day_row else 0
        count_month = int(month_counts.get(device.id, 0))
        result.append({
            "id": device.id,
            "client_id": device.client_id,
            "count_today": count_today,
            "missed_today": max(0, expected_today - count_today),
            "count_month": count_month,
            "missed_month": max(0, expected_month - count_month),
            "last_reading": day_row.last_reading.isoformat() if day_row and day_row.last_reading else None,
        })

    return {
        "expected_today": expected_today,
        "month": f"{year:04d}-{mon:02d}",
        "expected_month": expected_month,
        "generated_at": now.isoformat(),
        "devices": result,
    }


def _parse_month(month: Optional[str], pkt_now: datetime) -> tuple:
    if month:
        if not re.fullmatch(r"\d{4}-\d{2}", month) or not 1 <= int(month[5:7]) <= 12:
            raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")
        return int(month[:4]), int(month[5:7])
    return pkt_now.year, pkt_now.month


def _fmt_days(day_list, limit=8):
    """Format a list of day numbers as 'Jun 5, Jun 18 and 3 more'-style text (day numbers only)."""
    shown = ", ".join(str(d) for d in day_list[:limit])
    extra = len(day_list) - limit
    return shown + (f" and {extra} more" if extra > 0 else "")


def _build_summary(client_id, label, days, total, expected_total):
    """Deterministic plain-language analysis of a device's monthly report."""
    past = [d for d in days if d["expected"] > 0]
    complete = [d for d in past if d["count"] >= d["expected"]]
    zero = [d for d in past if d["count"] == 0]
    partial = [d for d in past if 0 < d["count"] < d["expected"]]
    pct = round(100 * total / expected_total, 1) if expected_total else 0.0

    lines = [
        f"{client_id} sent {total} of {expected_total} expected readings in {label} ({pct}% complete).",
        f"Data was complete on {len(complete)} of {len(past)} day(s) so far.",
    ]
    if zero:
        lines.append(f"No data at all on {len(zero)} day(s): {_fmt_days([d['day'] for d in zero])}.")
    if partial:
        worst = sorted(partial, key=lambda d: d["count"] - d["expected"])[:3]
        worst_txt = ", ".join(f"day {d['day']} ({d['count']}/{d['expected']})" for d in worst)
        lines.append(f"Partial data on {len(partial)} day(s); biggest gaps: {worst_txt}.")
    if not zero and not partial and past:
        lines.append("Excellent - the device did not miss a single hourly reading this month.")
    elif pct >= 95:
        lines.append("Overall a healthy month; only minor gaps.")
    elif pct >= 70:
        lines.append("Noticeable gaps this month - worth checking the device's power and signal on the flagged days.")
    elif total > 0:
        lines.append("Large parts of the month are missing - the device was offline for long stretches.")
    else:
        lines.append("The device sent nothing at all in this month.")
    return " ".join(lines)


@router.get("/monthly-detail/{device_id}")
async def get_monthly_detail(
    device_id: int,
    month: Optional[str] = Query(None, description="Month to break down, YYYY-MM; defaults to the current month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Day-by-day reading counts for one device in a month, with a written analysis."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    now = datetime.now(timezone.utc)
    pkt_now = now.astimezone(PKT)
    year, mon = _parse_month(month, pkt_now)

    month_start = datetime(year, mon, 1, tzinfo=PKT).astimezone(timezone.utc)
    if month_start > now:
        raise HTTPException(status_code=400, detail="month is in the future")
    days_in_month = monthrange(year, mon)[1]
    month_end = month_start + timedelta(days=days_in_month)

    # Count readings per PKT calendar day
    day_expr = func.date(DeviceReading.timestamp + timedelta(hours=5))
    rows = (
        db.query(day_expr.label("day"), func.count(DeviceReading.id).label("cnt"))
        .filter(
            DeviceReading.device_id == device_id,
            DeviceReading.timestamp >= month_start,
            DeviceReading.timestamp < month_end,
        )
        .group_by(day_expr)
        .all()
    )
    counts_by_day = {row.day: int(row.cnt) for row in rows}

    today_pkt = pkt_now.date()
    days = []
    for day_no in range(1, days_in_month + 1):
        d = date(year, mon, day_no)
        if d < today_pkt:
            expected = EXPECTED_READINGS_PER_DAY
        elif d == today_pkt:
            expected = max(1, pkt_now.hour)  # hours elapsed today
        else:
            expected = 0  # future day
        count = counts_by_day.get(d, 0)
        days.append({
            "day": day_no,
            "date": d.isoformat(),
            "count": count,
            "expected": expected,
            "missed": max(0, expected - count),
        })

    total = sum(d["count"] for d in days)
    expected_total = sum(d["expected"] for d in days)
    label = f"{month_name[mon]} {year}"

    return {
        "device_id": device.id,
        "client_id": device.client_id,
        "device_name": device.device_name,
        "month": f"{year:04d}-{mon:02d}",
        "month_label": label,
        "total": total,
        "expected_total": expected_total,
        "days": days,
        "summary": _build_summary(device.client_id, label, days, total, expected_total),
        "generated_at": now.isoformat(),
    }
