"""Database Backup API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from app.api.v1.auth import get_current_user
from app.models.models import User
from app.services.backup_service import backup_service

router = APIRouter()


class BackupResult(BaseModel):
    success: bool
    backup_name: Optional[str] = None
    backup_path: Optional[str] = None
    database_size: Optional[int] = None
    backup_size: Optional[int] = None
    compression_ratio: Optional[str] = None
    compressed: Optional[bool] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class BackupInfo(BaseModel):
    filename: str
    filepath: str
    size: int
    size_mb: str
    compressed: bool
    created_at: str
    modified_at: str


class RestoreResult(BaseModel):
    success: bool
    backup_restored: Optional[str] = None
    database_path: Optional[str] = None
    safety_backup: Optional[dict] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class CleanupResult(BaseModel):
    deleted_count: int
    remaining_count: int
    max_backups: int
    error: Optional[str] = None


class BackupStats(BaseModel):
    total_backups: int
    max_backups: Optional[int] = None
    total_size: int
    total_size_mb: str
    average_size_mb: Optional[str] = None
    oldest_backup: Optional[BackupInfo] = None
    newest_backup: Optional[BackupInfo] = None
    backup_directory: Optional[str] = None
    compression_enabled: Optional[bool] = None
    error: Optional[str] = None


@router.post("/create", response_model=BackupResult)
async def create_backup(
    backup_name: Optional[str] = Query(None, description="Optional custom backup name"),
    current_user: User = Depends(get_current_user)
):
    """
    Create a database backup

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = backup_service.create_backup(backup_name)

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to create backup")
        )

    return BackupResult(**result)


@router.get("/list", response_model=List[BackupInfo])
async def list_backups(
    current_user: User = Depends(get_current_user)
):
    """
    List all available backups

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    backups = backup_service.list_backups()
    return [BackupInfo(**b) for b in backups]


@router.post("/restore", response_model=RestoreResult)
async def restore_backup(
    backup_filename: str = Query(..., description="Name of the backup file to restore"),
    create_safety_backup: bool = Query(True, description="Create safety backup before restore"),
    current_user: User = Depends(get_current_user)
):
    """
    Restore database from a backup

    WARNING: This will replace the current database!

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = backup_service.restore_backup(backup_filename, create_safety_backup)

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to restore backup")
        )

    return RestoreResult(**result)


@router.delete("/delete/{backup_filename}")
async def delete_backup(
    backup_filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific backup file

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = backup_service.delete_backup(backup_filename)

    if not result.get("success"):
        raise HTTPException(
            status_code=404,
            detail=result.get("error", "Backup file not found")
        )

    return result


@router.post("/cleanup", response_model=CleanupResult)
async def cleanup_old_backups(
    current_user: User = Depends(get_current_user)
):
    """
    Delete old backups exceeding retention limit

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = backup_service.cleanup_old_backups()

    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to cleanup backups")
        )

    return CleanupResult(**result)


@router.get("/stats", response_model=BackupStats)
async def get_backup_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get backup statistics

    Requires: Admin role
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    stats = backup_service.get_backup_stats()

    if "error" in stats:
        raise HTTPException(
            status_code=500,
            detail=stats.get("error", "Failed to get backup stats")
        )

    return BackupStats(**stats)
