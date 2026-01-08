"""Notification endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.models import Notification, User
from app.api.v1.auth import get_current_user

router = APIRouter()


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    read: bool = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if read is not None:
        query = query.filter(Notification.is_read == read)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()

    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted"}
