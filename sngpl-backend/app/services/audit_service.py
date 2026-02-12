"""Audit Logging Service for tracking user actions"""

import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request

from app.models.models import AuditLog, User
from app.core.logging_config import get_logger

logger = get_logger("audit")


class AuditService:
    """Service for creating and managing audit logs"""

    @staticmethod
    def log_action(
        db: Session,
        action: str,
        resource_type: str,
        user: Optional[User] = None,
        resource_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success"
    ) -> AuditLog:
        """
        Create an audit log entry

        Args:
            db: Database session
            action: Action performed (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
            resource_type: Type of resource (user, device, alarm, threshold, etc.)
            user: User who performed the action (optional for system actions)
            resource_id: ID of the affected resource
            details: Additional details as dictionary
            ip_address: IP address of the request
            user_agent: User agent string
            status: Status of the action (success, failure)

        Returns:
            Created AuditLog instance
        """
        try:
            audit_log = AuditLog(
                user_id=user.id if user else None,
                username=user.username if user else "system",
                action=action.upper(),
                resource_type=resource_type,
                resource_id=resource_id,
                details=json.dumps(details) if details else None,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status
            )

            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)

            logger.info(
                f"Audit log created: {action} on {resource_type} "
                f"(ID: {resource_id}) by {user.username if user else 'system'}"
            )

            return audit_log

        except Exception as e:
            logger.error(f"Error creating audit log: {e}", exc_info=True)
            db.rollback()
            raise

    @staticmethod
    def log_from_request(
        db: Session,
        request: Request,
        action: str,
        resource_type: str,
        user: Optional[User] = None,
        resource_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success"
    ) -> AuditLog:
        """
        Create an audit log entry from a FastAPI Request object

        Automatically extracts IP address and user agent from the request
        """
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        return AuditService.log_action(
            db=db,
            action=action,
            resource_type=resource_type,
            user=user,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status
        )

    @staticmethod
    def get_logs(
        db: Session,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
        limit: int = 100,
        offset: int = 0
    ):
        """
        Retrieve audit logs with optional filters

        Args:
            db: Database session
            user_id: Filter by user ID
            action: Filter by action type
            resource_type: Filter by resource type
            search: Search by username substring
            start_date: Filter logs from this date
            end_date: Filter logs until this date
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of AuditLog instances
        """
        query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

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

        return query.offset(offset).limit(limit).all()

    @staticmethod
    def get_user_activity_summary(db: Session, user_id: int, days: int = 30):
        """
        Get activity summary for a specific user

        Args:
            db: Database session
            user_id: User ID
            days: Number of days to look back

        Returns:
            Dictionary with activity statistics
        """
        from datetime import datetime, timedelta

        start_date = datetime.now() - timedelta(days=days)

        logs = db.query(AuditLog).filter(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= start_date
        ).all()

        # Count actions by type
        action_counts = {}
        for log in logs:
            action_counts[log.action] = action_counts.get(log.action, 0) + 1

        return {
            "user_id": user_id,
            "period_days": days,
            "total_actions": len(logs),
            "action_breakdown": action_counts,
            "last_activity": logs[0].created_at if logs else None
        }


# Create global instance
audit_service = AuditService()
