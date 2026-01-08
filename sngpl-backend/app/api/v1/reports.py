"""Reports export endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import User, Device, Alarm
from app.api.v1.auth import get_current_user
from app.services.export_service import export_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/devices/pdf")
async def export_devices_pdf(
    device_type: Optional[str] = Query(None, description="Filter by device type (EVC/FC)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export devices list to PDF"""
    try:
        # Build query
        query = db.query(Device)

        if device_type:
            query = query.filter(Device.device_type == device_type)

        if is_active is not None:
            query = query.filter(Device.is_active == is_active)

        devices = query.all()

        # Generate PDF
        pdf_buffer = export_service.generate_devices_pdf(devices, db)

        # Return as streaming response
        filename = f"sngpl_devices_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error generating devices PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report"
        )


@router.get("/devices/excel")
async def export_devices_excel(
    device_type: Optional[str] = Query(None, description="Filter by device type (EVC/FC)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export devices list to Excel"""
    try:
        # Build query
        query = db.query(Device)

        if device_type:
            query = query.filter(Device.device_type == device_type)

        if is_active is not None:
            query = query.filter(Device.is_active == is_active)

        devices = query.all()

        # Generate Excel
        excel_buffer = export_service.generate_devices_excel(devices, db)

        # Return as streaming response
        filename = f"sngpl_devices_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error generating devices Excel: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Excel report"
        )


@router.get("/alarms/pdf")
async def export_alarms_pdf(
    severity: Optional[str] = Query(None, description="Filter by severity (low/medium/high)"),
    is_acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged status"),
    days: int = Query(7, description="Days to include (default: 7)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export alarms to PDF"""
    try:
        # Build query
        query = db.query(Alarm)

        # Filter by date range
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.filter(Alarm.created_at >= cutoff_date)

        if severity:
            query = query.filter(Alarm.severity == severity)

        if is_acknowledged is not None:
            query = query.filter(Alarm.is_acknowledged == is_acknowledged)

        alarms = query.order_by(Alarm.created_at.desc()).all()

        # Generate PDF
        pdf_buffer = export_service.generate_alarms_pdf(alarms, db)

        # Return as streaming response
        filename = f"sngpl_alarms_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error generating alarms PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report"
        )


@router.get("/alarms/excel")
async def export_alarms_excel(
    severity: Optional[str] = Query(None, description="Filter by severity (low/medium/high)"),
    is_acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged status"),
    days: int = Query(7, description="Days to include (default: 7)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export alarms to Excel"""
    try:
        # Build query
        query = db.query(Alarm)

        # Filter by date range
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.filter(Alarm.created_at >= cutoff_date)

        if severity:
            query = query.filter(Alarm.severity == severity)

        if is_acknowledged is not None:
            query = query.filter(Alarm.is_acknowledged == is_acknowledged)

        alarms = query.order_by(Alarm.created_at.desc()).all()

        # Generate Excel
        excel_buffer = export_service.generate_alarms_excel(alarms, db)

        # Return as streaming response
        filename = f"sngpl_alarms_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error generating alarms Excel: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Excel report"
        )
