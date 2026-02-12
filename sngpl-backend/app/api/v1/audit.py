"""Audit Logs API endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.api.v1.auth import get_current_user
from app.models.models import User, AuditLog
from app.services.audit_service import audit_service

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    limit: int
    offset: int


class UserActivitySummary(BaseModel):
    user_id: int
    period_days: int
    total_actions: int
    action_breakdown: dict
    last_activity: Optional[datetime]


@router.get("/", response_model=AuditLogListResponse)
async def get_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    search: Optional[str] = Query(None, description="Search by username"),
    start_date: Optional[datetime] = Query(None, description="Filter logs from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs until this date"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit logs with optional filters

    Requires: Admin role
    """
    # Only admins can view audit logs
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    logs = audit_service.get_logs(
        db=db,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        search=search,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

    # Get total count for pagination
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if search:
        query = query.filter(AuditLog.username.ilike(f"%{search}%"))
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    total = query.count()

    return AuditLogListResponse(
        logs=logs,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/user/{user_id}/summary", response_model=UserActivitySummary)
async def get_user_activity_summary(
    user_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get activity summary for a specific user

    Requires: Admin role or own user ID
    """
    # Only admins or the user themselves can view activity summary
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    summary = audit_service.get_user_activity_summary(db, user_id, days)
    return UserActivitySummary(**summary)


@router.get("/actions", response_model=list[str])
async def get_available_actions(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of all possible audit log actions

    Useful for filtering
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "EXPORT",
        "ACKNOWLEDGE",
        "VIEW"
    ]


@router.get("/resource-types", response_model=list[str])
async def get_available_resource_types(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of all possible resource types

    Useful for filtering
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return [
        "user",
        "device",
        "alarm",
        "threshold",
        "notification",
        "report",
        "settings"
    ]
