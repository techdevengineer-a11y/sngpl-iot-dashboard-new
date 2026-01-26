"""User management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import User
from app.api.v1.auth import get_current_user, get_password_hash, verify_password
from app.services.audit_service import audit_service
from app.core.password_validator import PasswordValidator

router = APIRouter()

# In-memory storage for failed login attempts (use Redis in production for distributed systems)
failed_password_attempts: Dict[int, Dict] = {}
LOCKOUT_THRESHOLD = 4  # Lock after 4 failed attempts
LOCKOUT_DURATION = 15  # minutes
WARNING_THRESHOLD = 3  # Warn after 3 failed attempts


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not v.isalnum() and "_" not in v:
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid_roles = ["admin", "user", "viewer"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_roles = ["admin", "user", "viewer"]
            if v not in valid_roles:
                raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


def check_account_locked(user_id: int) -> tuple[bool, int, str]:
    """
    Check if account is locked due to failed password attempts
    Returns: (is_locked, remaining_attempts, lock_message)
    """
    if user_id not in failed_password_attempts:
        return False, LOCKOUT_THRESHOLD, ""

    attempt_data = failed_password_attempts[user_id]
    attempts = attempt_data.get('count', 0)
    locked_until = attempt_data.get('locked_until')

    # Check if still locked
    if locked_until and datetime.now() < locked_until:
        remaining_time = (locked_until - datetime.now()).total_seconds() / 60
        return True, 0, f"Account temporarily locked. Try again in {int(remaining_time)} minutes."

    # Lock expired, reset attempts
    if locked_until and datetime.now() >= locked_until:
        del failed_password_attempts[user_id]
        return False, LOCKOUT_THRESHOLD, ""

    remaining = LOCKOUT_THRESHOLD - attempts
    return False, remaining, ""


def record_failed_attempt(user_id: int) -> tuple[bool, str]:
    """
    Record a failed password attempt
    Returns: (should_lock, message)
    """
    if user_id not in failed_password_attempts:
        failed_password_attempts[user_id] = {'count': 1, 'last_attempt': datetime.now()}
        remaining = LOCKOUT_THRESHOLD - 1
        return False, f"Current password is incorrect. {remaining} attempts remaining."

    attempt_data = failed_password_attempts[user_id]
    attempt_data['count'] += 1
    attempt_data['last_attempt'] = datetime.now()

    attempts = attempt_data['count']

    # Lock account after threshold
    if attempts >= LOCKOUT_THRESHOLD:
        attempt_data['locked_until'] = datetime.now() + timedelta(minutes=LOCKOUT_DURATION)
        return True, f"Too many failed attempts. Account locked for {LOCKOUT_DURATION} minutes."

    # Warning at threshold - 1
    remaining = LOCKOUT_THRESHOLD - attempts
    if attempts == WARNING_THRESHOLD:
        return False, f"⚠️ WARNING: Current password is incorrect. Only {remaining} attempt remaining before account lockout!"

    return False, f"Current password is incorrect. {remaining} attempts remaining."


def reset_failed_attempts(user_id: int):
    """Reset failed attempts on successful password change"""
    if user_id in failed_password_attempts:
        del failed_password_attempts[user_id]


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can list users"
        )

    query = db.query(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if role:
        query = query.filter(User.role == role)

    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID (admin or self)"""
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email already exists
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )

    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="CREATE", resource_type="user",
        user=current_user, resource_id=new_user.id,
        details={"username": new_user.username, "role": new_user.role},
        status="success"
    )

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user (admin or self - limited fields)"""
    # Check authorization
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Non-admin users can only update their own profile (limited fields)
    if current_user.role != "admin":
        # Only allow email updates for non-admin
        if user_data.role is not None or user_data.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change role or active status"
            )

    # Update fields
    if user_data.email is not None:
        # Check if email is already used by another user
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = user_data.email

        user.role = user_data.role

    if user_data.is_active is not None and current_user.role == "admin":
        user.is_active = user_data.is_active

    db.commit()
    db.refresh(user)

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="UPDATE", resource_type="user",
        user=current_user, resource_id=user.id,
        details={"username": user.username, "updated_by": current_user.username},
        status="success"
    )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )

    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    username = user.username

    db.delete(user)
    db.commit()

    # Audit log
    audit_service.log_from_request(
        db=db, request=request,
        action="DELETE", resource_type="user",
        user=current_user, resource_id=user_id,
        details={"username": username},
        status="success"
    )

    return None


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user password with enhanced security validation"""
    # Only allow users to change their own password
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only change your own password"
        )

    # Check if account is locked due to failed attempts
    is_locked, remaining_attempts, lock_message = check_account_locked(current_user.id)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=lock_message
        )

    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        # Record failed attempt and get appropriate message
        should_lock, error_message = record_failed_attempt(current_user.id)

        # Log failed attempt
        from app.models.models import SecurityEvent
        security_event = SecurityEvent(
            event_type="password_change_failed",
            severity="medium" if should_lock else "low",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            description=f"Failed password change attempt - {'account locked' if should_lock else 'incorrect current password'}"
        )
        db.add(security_event)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Validate new password complexity
    is_valid, errors = PasswordValidator.validate_password(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password does not meet complexity requirements", "errors": errors}
        )

    # Check password history to prevent reuse
    if not PasswordValidator.check_password_history(db, current_user.id, password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password was used recently. Please choose a different password (last {PasswordValidator.PASSWORD_HISTORY_COUNT} passwords cannot be reused)"
        )

    # Hash new password and add current to history
    new_password_hash = get_password_hash(password_data.new_password)

    # Add current password to history before changing
    if current_user.hashed_password:
        PasswordValidator.add_to_password_history(db, current_user.id, current_user.hashed_password)

    # Update password
    current_user.hashed_password = new_password_hash
    current_user.last_password_change = datetime.utcnow()
    current_user.password_changed_at = datetime.utcnow()
    current_user.must_change_password = False

    db.commit()

    # Reset failed attempts on successful password change
    reset_failed_attempts(current_user.id)

    # Log successful password change
    audit_service.log_from_request(
        db=db, request=request,
        action="PASSWORD_CHANGE", resource_type="user",
        user=current_user, resource_id=current_user.id,
        details={"username": current_user.username, "success": True},
        status="success"
    )

    return {"message": "Password changed successfully"}


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user password (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reset passwords"
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Reset password
    user.hashed_password = get_password_hash(new_password)
    db.commit()

    return {"message": f"Password reset successfully for user {user.username}"}
