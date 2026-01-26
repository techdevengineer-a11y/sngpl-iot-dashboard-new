"""Role-Based Access Control (RBAC) middleware and decorators"""

from functools import wraps
from typing import List, Optional
from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.models.models import User
from app.api.v1.auth import get_current_user
from app.db.database import get_db


class RBACPermissions:
    """Define permissions for different roles"""

    # Role hierarchy (higher number = more permissions)
    ROLE_HIERARCHY = {
        "admin": 3,
        "user": 2,
        "guest": 1
    }

    # Permission mappings: resource_type -> action -> allowed_roles
    PERMISSIONS = {
        "user": {
            "create": ["admin"],
            "read": ["admin", "user"],
            "update": ["admin"],
            "delete": ["admin"],
            "change_password": ["admin", "user"]  # Users can change their own password
        },
        "device": {
            "create": ["admin"],
            "read": ["admin", "user", "guest"],
            "update": ["admin", "user"],
            "delete": ["admin"]
        },
        "alarm": {
            "create": ["admin"],  # System creates alarms
            "read": ["admin", "user", "guest"],
            "update": ["admin", "user"],  # Acknowledge alarms
            "delete": ["admin"]
        },
        "threshold": {
            "create": ["admin"],
            "read": ["admin", "user"],
            "update": ["admin"],
            "delete": ["admin"]
        },
        "notification": {
            "create": ["admin"],
            "read": ["admin", "user"],
            "update": ["admin", "user"],
            "delete": ["admin"]
        },
        "report": {
            "create": ["admin", "user"],
            "read": ["admin", "user"],
            "export": ["admin", "user"]
        },
        "audit": {
            "read": ["admin"],
            "export": ["admin"]
        },
        "retention": {
            "execute": ["admin"]
        },
        "analytics": {
            "read": ["admin", "user"]
        },
        "dashboard": {
            "read": ["admin", "user", "guest"]
        }
    }

    @classmethod
    def has_permission(cls, user: User, resource_type: str, action: str, resource_owner_id: Optional[int] = None) -> bool:
        """
        Check if user has permission for an action on a resource

        Args:
            user: The user to check
            resource_type: Type of resource (user, device, alarm, etc.)
            action: Action to perform (create, read, update, delete)
            resource_owner_id: ID of the resource owner (for self-access checks)

        Returns:
            True if user has permission, False otherwise
        """
        # Check if user is active
        if not user.is_active:
            return False

        # Admin has all permissions
        if user.role == "admin":
            return True

        # Check resource-specific permissions
        if resource_type not in cls.PERMISSIONS:
            # If resource not defined, deny by default
            return False

        resource_perms = cls.PERMISSIONS[resource_type]

        if action not in resource_perms:
            # If action not defined for resource, deny by default
            return False

        allowed_roles = resource_perms[action]

        # Check if user's role is in allowed roles
        if user.role in allowed_roles:
            return True

        # Check if user owns the resource (for self-access)
        if resource_owner_id and user.id == resource_owner_id:
            # Allow users to access their own resources
            return True

        return False

    @classmethod
    def check_role_level(cls, user: User, required_role: str) -> bool:
        """
        Check if user has required role level or higher

        Args:
            user: The user to check
            required_role: Minimum required role

        Returns:
            True if user has sufficient role level
        """
        if not user.is_active:
            return False

        user_level = cls.ROLE_HIERARCHY.get(user.role, 0)
        required_level = cls.ROLE_HIERARCHY.get(required_role, 999)

        return user_level >= required_level


def require_role(required_role: str):
    """
    Decorator to require a minimum role level for an endpoint

    Usage:
        @router.get("/admin-only")
        @require_role("admin")
        async def admin_endpoint(current_user: User = Depends(get_current_user)):
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = None, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            if not RBACPermissions.check_role_level(current_user, required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires {required_role} role or higher"
                )

            return await func(*args, current_user=current_user, **kwargs)

        return wrapper
    return decorator


def require_permission(resource_type: str, action: str):
    """
    Decorator to require specific permission for an endpoint

    Usage:
        @router.post("/devices")
        @require_permission("device", "create")
        async def create_device(current_user: User = Depends(get_current_user)):
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = None, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            if not RBACPermissions.has_permission(current_user, resource_type, action):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: requires {action} on {resource_type}"
                )

            return await func(*args, current_user=current_user, **kwargs)

        return wrapper
    return decorator


# Dependency functions for FastAPI
async def require_admin(current_user: User = Depends(get_current_user)):
    """FastAPI dependency to require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_user_or_admin(current_user: User = Depends(get_current_user)):
    """FastAPI dependency to require user or admin role"""
    if current_user.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User or Admin access required"
        )
    return current_user


def check_permission(resource_type: str, action: str):
    """
    FastAPI dependency factory for permission checking

    Usage:
        @router.post("/devices")
        async def create_device(
            current_user: User = Depends(check_permission("device", "create"))
        ):
            pass
    """
    async def permission_checker(current_user: User = Depends(get_current_user)):
        if not RBACPermissions.has_permission(current_user, resource_type, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: requires {action} on {resource_type}"
            )
        return current_user

    return permission_checker
