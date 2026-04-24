"""
Sections API endpoints
Provides section-level aggregated data and SMS listings
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, literal
from typing import List, Dict, Any
from app.db.database import get_db
from app.models.models import Device, DeviceReading
from datetime import datetime, timedelta, timezone
from app.core.redis_client import cache_response

router = APIRouter(prefix="/sections", tags=["sections"])


@router.get("/stats")
@cache_response("sections:stats", ttl=60)
async def get_section_stats(db: Session = Depends(get_db)):
    """
    Get statistics for all sections (Sections I-V) and overall total
    Returns cumulative volume flow for each section
    OPTIMIZED: Single aggregation query instead of N+1 queries
    """
    # Section mapping
    section_info = {
        'I': {'name': 'Section I - Multan/BWP/Sahiwal', 'section': 'I'},
        'II': {'name': 'Section II', 'section': 'II'},
        'III': {'name': 'Section III', 'section': 'III'},
        'IV': {'name': 'Section IV', 'section': 'IV'},
        'V': {'name': 'Section V', 'section': 'V'},
    }

    # Subquery to get latest reading per device
    latest_reading_subq = (
        db.query(
            DeviceReading.device_id,
            func.max(DeviceReading.timestamp).label('max_timestamp')
        )
        .group_by(DeviceReading.device_id)
        .subquery()
    )

    # Extract section from client_id (SMS-I-XXX -> I, SMS-II-XXX -> II, etc.)
    section_extract = func.substr(Device.client_id, 5, func.length(Device.client_id))

    # Single optimized query for SMS devices with aggregation
    sms_stats = (
        db.query(
            case(
                # Extract section identifier (I, II, III, IV, V)
                (Device.client_id.like('SMS-I-%'), literal('I')),
                (Device.client_id.like('SMS-II-%'), literal('II')),
                (Device.client_id.like('SMS-III-%'), literal('III')),
                (Device.client_id.like('SMS-IV-%'), literal('IV')),
                (Device.client_id.like('SMS-V-%'), literal('V')),
                else_=literal('OTHER')
            ).label('section_id'),
            func.count(Device.id).label('sms_count'),
            func.sum(case((Device.is_active == True, 1), else_=0)).label('active_sms'),
            func.sum(func.coalesce(DeviceReading.total_volume_flow, 0)).label('cumulative_flow')
        )
        .outerjoin(
            latest_reading_subq,
            Device.id == latest_reading_subq.c.device_id
        )
        .outerjoin(
            DeviceReading,
            and_(
                DeviceReading.device_id == Device.id,
                DeviceReading.timestamp == latest_reading_subq.c.max_timestamp
            )
        )
        .filter(Device.client_id.like('SMS-%'))
        .group_by('section_id')
    ).all()

    # Query for non-SMS devices (OTHER)
    other_stats = (
        db.query(
            func.count(Device.id).label('sms_count'),
            func.sum(case((Device.is_active == True, 1), else_=0)).label('active_sms'),
            func.sum(func.coalesce(DeviceReading.total_volume_flow, 0)).label('cumulative_flow')
        )
        .outerjoin(
            latest_reading_subq,
            Device.id == latest_reading_subq.c.device_id
        )
        .outerjoin(
            DeviceReading,
            and_(
                DeviceReading.device_id == Device.id,
                DeviceReading.timestamp == latest_reading_subq.c.max_timestamp
            )
        )
        .filter(~Device.client_id.like('SMS-%'))
    ).first()

    # Build sections list
    sections = []
    total_cumulative_flow = 0
    total_sms_count = 0
    total_active_sms = 0

    # Create a dict from query results for easier lookup
    stats_dict = {row.section_id: row for row in sms_stats}

    # Add stats for each defined section (I-V)
    for section_id, info in section_info.items():
        stats = stats_dict.get(section_id)

        if stats:
            sms_count = stats.sms_count or 0
            active_count = stats.active_sms or 0
            cumulative_flow = stats.cumulative_flow or 0.0
        else:
            sms_count = 0
            active_count = 0
            cumulative_flow = 0.0

        sections.append({
            'section_id': section_id,
            'section_name': info['name'],
            'sms_count': sms_count,
            'active_sms': active_count,
            'cumulative_volume_flow': round(cumulative_flow, 2),
            'unit': 'MCF/day'
        })

        total_cumulative_flow += cumulative_flow
        total_sms_count += sms_count
        total_active_sms += active_count

    # Include "Other Devices" in totals but don't add as separate card
    if other_stats and other_stats.sms_count and other_stats.sms_count > 0:
        other_cumulative_flow = other_stats.cumulative_flow or 0.0
        total_cumulative_flow += other_cumulative_flow
        total_sms_count += other_stats.sms_count or 0
        total_active_sms += other_stats.active_sms or 0

    # Add "Total Devices" card showing combined stats from all sections
    sections.append({
        'section_id': 'TOTAL',
        'section_name': 'Total Devices',
        'sms_count': total_sms_count,
        'active_sms': total_active_sms,
        'offline_sms': total_sms_count - total_active_sms,
        'alarms_count': 0,  # Placeholder for alarm count
        'cumulative_volume_flow': round(total_cumulative_flow, 2),
        'unit': 'MCF/day'
    })

    # Add "All SMS" summary
    all_sms = {
        'section_id': 'ALL',
        'section_name': 'All SMS',
        'sms_count': total_sms_count,
        'active_sms': total_active_sms,
        'cumulative_volume_flow': round(total_cumulative_flow, 2),
        'unit': 'MCF/day'
    }

    return {
        'sections': sections,
        'all_sms': all_sms,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


@router.get("/{section_id}/devices")
@cache_response("sections:devices", ttl=60)
async def get_section_devices(section_id: str, db: Session = Depends(get_db)):
    """
    Get all devices for a specific section
    Section ID should be: I, II, III, IV, V, OTHER, or ALL
    """
    if section_id == 'ALL':
        # Get all devices (SMS and non-SMS like modem2)
        devices = db.query(Device).all()
    elif section_id == 'OTHER':
        # Get only non-SMS devices (like modem1, modem2, etc.)
        devices = db.query(Device).filter(
            ~Device.client_id.like('SMS-%')
        ).all()
    else:
        # Validate section ID
        if section_id not in ['I', 'II', 'III', 'IV', 'V']:
            raise HTTPException(status_code=400, detail="Invalid section ID. Use I, II, III, IV, V, OTHER, or ALL")

        # Map Roman numerals to Arabic for device matching
        section_map = {'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5'}
        arabic_num = section_map.get(section_id, section_id)

        # Get devices for specific section (support both SMS-I-XXX and SMS-1-XXX formats)
        devices = db.query(Device).filter(
            (Device.client_id.like(f'SMS-{section_id}-%')) |
            (Device.client_id.like(f'SMS-{arabic_num}-%'))
        ).all()

    # Get device IDs for batch query
    device_ids = [d.id for d in devices]

    # Single query: get latest reading per device using subquery (fixes N+1)
    latest_reading_subq = (
        db.query(
            DeviceReading.device_id,
            func.max(DeviceReading.timestamp).label('max_timestamp')
        )
        .filter(DeviceReading.device_id.in_(device_ids))
        .group_by(DeviceReading.device_id)
        .subquery()
    )

    latest_readings_query = (
        db.query(DeviceReading)
        .join(
            latest_reading_subq,
            and_(
                DeviceReading.device_id == latest_reading_subq.c.device_id,
                DeviceReading.timestamp == latest_reading_subq.c.max_timestamp
            )
        )
        .all()
    )

    # Build lookup map: device_id -> latest reading
    readings_map = {r.device_id: r for r in latest_readings_query}

    # Build device list with pre-fetched readings
    device_list = []
    for device in devices:
        device_data = {
            'id': device.id,
            'client_id': device.client_id,
            'device_name': device.device_name,
            'device_type': device.device_type,
            'location': device.location,
            'latitude': device.latitude,
            'longitude': device.longitude,
            'meter_type': device.meter_type,
            'units': device.units,
            'is_active': device.is_active,
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
        }

        latest_reading = readings_map.get(device.id)
        if latest_reading:
            device_data['latest_reading'] = {
                'timestamp': latest_reading.timestamp.isoformat(),
                'temperature': latest_reading.temperature,
                'static_pressure': latest_reading.static_pressure,
                'max_static_pressure': latest_reading.max_static_pressure,
                'min_static_pressure': latest_reading.min_static_pressure,
                'differential_pressure': latest_reading.differential_pressure,
                'battery': latest_reading.battery,
                'volume': latest_reading.volume,
                'total_volume_flow': latest_reading.total_volume_flow,
                # T18-T114 Analytics parameters
                'last_hour_flow_time': latest_reading.last_hour_flow_time,
                'last_hour_diff_pressure': latest_reading.last_hour_diff_pressure,
                'last_hour_static_pressure': latest_reading.last_hour_static_pressure,
                'last_hour_temperature': latest_reading.last_hour_temperature,
                'last_hour_volume': latest_reading.last_hour_volume,
                'last_hour_energy': latest_reading.last_hour_energy,
                'specific_gravity': latest_reading.specific_gravity,
                # EVC-only (ft3) fields
                'volume_ft3': latest_reading.volume_ft3,
                'total_volume_flow_ft3h': latest_reading.total_volume_flow_ft3h,
                'last_hour_volume_ft3': latest_reading.last_hour_volume_ft3,
                'primary_volume': latest_reading.primary_volume,
            }
        else:
            device_data['latest_reading'] = None

        device_list.append(device_data)

    section_names = {
        'I': 'Section I',
        'II': 'Section II',
        'III': 'Section III',
        'IV': 'Section IV',
        'V': 'Section V',
        'OTHER': 'Other Devices',
        'ALL': 'All Devices'
    }

    # Count online devices
    online_count = sum(1 for d in device_list if d.get('is_active'))

    return {
        'section_id': section_id,
        'section_name': section_names.get(section_id, 'Unknown'),
        'device_count': len(device_list),
        'sms_count': len(device_list),
        'online_count': online_count,
        'offline_count': len(device_list) - online_count,
        'devices': device_list
    }


@router.get("/{section_id}/summary")
@cache_response("sections:summary", ttl=60)
async def get_section_summary(section_id: str, db: Session = Depends(get_db)):
    """
    Get detailed summary for a specific section including all measurement parameters
    """
    if section_id not in ['I', 'II', 'III', 'IV', 'V', 'ALL']:
        raise HTTPException(status_code=400, detail="Invalid section ID")

    # Get devices for this section
    if section_id == 'ALL':
        devices = db.query(Device).filter(Device.client_id.like('SMS-%')).all()
    else:
        devices = db.query(Device).filter(
            Device.client_id.like(f'SMS-{section_id}-%')
        ).all()

    if not devices:
        raise HTTPException(status_code=404, detail="No devices found for this section")

    device_ids = [d.id for d in devices]

    # Single aggregation query instead of N+1 per-device queries
    latest_reading_subq = (
        db.query(
            DeviceReading.device_id,
            func.max(DeviceReading.timestamp).label('max_timestamp')
        )
        .filter(DeviceReading.device_id.in_(device_ids))
        .group_by(DeviceReading.device_id)
        .subquery()
    )

    aggregates = (
        db.query(
            func.count(DeviceReading.id).label('reading_count'),
            func.avg(DeviceReading.temperature).label('avg_temp'),
            func.avg(DeviceReading.static_pressure).label('avg_pressure'),
            func.avg(DeviceReading.differential_pressure).label('avg_diff_pressure'),
            func.sum(DeviceReading.volume).label('total_volume'),
            func.sum(DeviceReading.total_volume_flow).label('total_volume_flow'),
        )
        .join(
            latest_reading_subq,
            and_(
                DeviceReading.device_id == latest_reading_subq.c.device_id,
                DeviceReading.timestamp == latest_reading_subq.c.max_timestamp
            )
        )
        .first()
    )

    reading_count = aggregates.reading_count or 0
    avg_temp = float(aggregates.avg_temp or 0)
    avg_pressure = float(aggregates.avg_pressure or 0)
    avg_diff_pressure = float(aggregates.avg_diff_pressure or 0)
    total_volume = float(aggregates.total_volume or 0)
    total_volume_flow = float(aggregates.total_volume_flow or 0)

    return {
        'section_id': section_id,
        'sms_count': len(devices),
        'active_sms': sum(1 for d in devices if d.is_active),
        'measurements': {
            'temperature': {
                'average': round(avg_temp, 2),
                'unit': '°F'
            },
            'pressure': {
                'average': round(avg_pressure, 2),
                'unit': 'PSI'
            },
            'differential_pressure': {
                'average': round(avg_diff_pressure, 2),
                'unit': 'IWC'
            },
            'volume': {
                'total': round(total_volume, 2),
                'unit': 'MCF'
            },
            'total_volume_flow': {
                'cumulative': round(total_volume_flow, 2),
                'unit': 'MCF/day'
            }
        }
    }
