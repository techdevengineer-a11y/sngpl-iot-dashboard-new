"""
Sections API endpoints
Provides section-level aggregated data and SMS listings
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.db.database import get_db
from app.models.models import Device, DeviceReading
from datetime import datetime, timedelta

router = APIRouter(prefix="/sections", tags=["sections"])


@router.get("/stats")
async def get_section_stats(db: Session = Depends(get_db)):
    """
    Get statistics for all sections (Sections I-V) and overall total
    Returns cumulative volume flow for each section
    """
    sections = []

    # Section mapping
    section_info = {
        'I': {'name': 'Section I - Multan/BWP/Sahiwal', 'section': 'I'},
        'II': {'name': 'Section II', 'section': 'II'},
        'III': {'name': 'Section III', 'section': 'III'},
        'IV': {'name': 'Section IV', 'section': 'IV'},
        'V': {'name': 'Section V', 'section': 'V'},
    }

    total_cumulative_flow = 0
    total_sms_count = 0
    total_active_sms = 0

    # Get stats for each section
    for section, info in section_info.items():
        # Get all devices in this section
        devices = db.query(Device).filter(
            Device.client_id.like(f'SMS-{section}-%')
        ).all()

        sms_count = len(devices)
        active_count = sum(1 for d in devices if d.is_active)

        # Calculate cumulative volume flow for this section
        # Get latest reading for each device and sum their total_volume_flow
        cumulative_flow = 0

        for device in devices:
            latest_reading = db.query(DeviceReading).filter(
                DeviceReading.device_id == device.id
            ).order_by(DeviceReading.timestamp.desc()).first()

            if latest_reading and latest_reading.total_volume_flow:
                cumulative_flow += latest_reading.total_volume_flow

        sections.append({
            'section_id': section,
            'section_name': info['name'],
            'sms_count': sms_count,
            'active_sms': active_count,
            'cumulative_volume_flow': round(cumulative_flow, 2),
            'unit': 'MCF/day'
        })

        total_cumulative_flow += cumulative_flow
        total_sms_count += sms_count
        total_active_sms += active_count

    # Get non-SMS devices (like modem2) as a separate section
    other_devices = db.query(Device).filter(
        ~Device.client_id.like('SMS-%')
    ).all()

    other_sms_count = len(other_devices)
    other_active_count = sum(1 for d in other_devices if d.is_active)
    other_cumulative_flow = 0

    for device in other_devices:
        latest_reading = db.query(DeviceReading).filter(
            DeviceReading.device_id == device.id
        ).order_by(DeviceReading.timestamp.desc()).first()

        if latest_reading and latest_reading.total_volume_flow:
            other_cumulative_flow += latest_reading.total_volume_flow
            total_cumulative_flow += latest_reading.total_volume_flow

        if device.is_active:
            total_active_sms += 1
        total_sms_count += 1

    # Add "Other Devices" section if there are any
    if other_sms_count > 0:
        sections.append({
            'section_id': 'OTHER',
            'section_name': 'Other Devices',
            'sms_count': other_sms_count,
            'active_sms': other_active_count,
            'cumulative_volume_flow': round(other_cumulative_flow, 2),
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
        'timestamp': datetime.utcnow().isoformat()
    }


@router.get("/{section_id}/devices")
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

    # Prepare device data with latest readings
    device_list = []
    for device in devices:
        # Get latest reading
        latest_reading = db.query(DeviceReading).filter(
            DeviceReading.device_id == device.id
        ).order_by(DeviceReading.timestamp.desc()).first()

        device_data = {
            'id': device.id,
            'client_id': device.client_id,
            'device_name': device.device_name,
            'device_type': device.device_type,
            'location': device.location,
            'latitude': device.latitude,
            'longitude': device.longitude,
            'is_active': device.is_active,
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
        }

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
                'specific_gravity': latest_reading.specific_gravity
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

    # Calculate aggregated statistics
    total_temp = 0
    total_pressure = 0
    total_diff_pressure = 0
    total_volume = 0
    total_volume_flow = 0
    reading_count = 0

    for device in devices:
        latest = db.query(DeviceReading).filter(
            DeviceReading.device_id == device.id
        ).order_by(DeviceReading.timestamp.desc()).first()

        if latest:
            total_temp += latest.temperature or 0
            total_pressure += latest.static_pressure or 0
            total_diff_pressure += latest.differential_pressure or 0
            total_volume += latest.volume or 0
            total_volume_flow += latest.total_volume_flow or 0
            reading_count += 1

    avg_temp = total_temp / reading_count if reading_count > 0 else 0
    avg_pressure = total_pressure / reading_count if reading_count > 0 else 0
    avg_diff_pressure = total_diff_pressure / reading_count if reading_count > 0 else 0

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
