"""Data Retention API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.api.v1.auth import get_current_user
from app.models.models import User
from app.services.retention_service import retention_service

router = APIRouter()


class RetentionResult(BaseModel):
    archived_count: int
    deleted_count: int
    cutoff_date: Optional[str]
    archive_files: Optional[list[str]]
    status: str
    error: Optional[str] = None


class AllRetentionResult(BaseModel):
    device_readings: RetentionResult
    alarms: RetentionResult
    audit_logs: RetentionResult
    execution_time: str


@router.post("/archive/readings", response_model=RetentionResult)
async def archive_device_readings(
    retention_days: int = Query(90, ge=1, le=3650, description="Keep readings newer than this many days"),
    delete_after_archive: bool = Query(True, description="Delete readings after archiving"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archive old device readings to JSON files

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = retention_service.archive_device_readings(
        db=db,
        retention_days=retention_days,
        delete_after_archive=delete_after_archive
    )

    return RetentionResult(**result)


@router.post("/archive/alarms", response_model=RetentionResult)
async def archive_alarms(
    retention_days: int = Query(180, ge=1, le=3650, description="Keep alarms newer than this many days"),
    delete_after_archive: bool = Query(False, description="Delete alarms after archiving (default False for compliance)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archive old acknowledged alarms to JSON files

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = retention_service.archive_alarms(
        db=db,
        retention_days=retention_days,
        delete_after_archive=delete_after_archive
    )

    return RetentionResult(**result)


@router.post("/archive/audit-logs", response_model=RetentionResult)
async def archive_audit_logs(
    retention_days: int = Query(365, ge=1, le=3650, description="Keep audit logs newer than this many days"),
    delete_after_archive: bool = Query(False, description="Delete audit logs after archiving (default False for compliance)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archive old audit logs to JSON files

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = retention_service.archive_audit_logs(
        db=db,
        retention_days=retention_days,
        delete_after_archive=delete_after_archive
    )

    return RetentionResult(**result)


@router.post("/archive/all", response_model=AllRetentionResult)
async def archive_all_data(
    current_user: User = Depends(get_current_user)
):
    """
    Run all retention policies

    Archives:
    - Device readings (90 days)
    - Alarms (180 days)
    - Audit logs (365 days)

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = retention_service.run_all_retention_policies()

    return AllRetentionResult(**result)


@router.get("/config")
async def get_retention_config(
    current_user: User = Depends(get_current_user)
):
    """
    Get current retention policy configuration

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import os

    return {
        "device_readings": {
            "retention_days": int(os.getenv("READINGS_RETENTION_DAYS", "90")),
            "delete_after_archive": os.getenv("DELETE_ARCHIVED_READINGS", "true").lower() == "true"
        },
        "alarms": {
            "retention_days": int(os.getenv("ALARMS_RETENTION_DAYS", "180")),
            "delete_after_archive": os.getenv("DELETE_ARCHIVED_ALARMS", "false").lower() == "true"
        },
        "audit_logs": {
            "retention_days": int(os.getenv("AUDIT_RETENTION_DAYS", "365")),
            "delete_after_archive": os.getenv("DELETE_ARCHIVED_AUDIT", "false").lower() == "true"
        },
        "archive_directory": os.getenv("ARCHIVE_DIR", "./archives")
    }
