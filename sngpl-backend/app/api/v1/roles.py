"""
Roles and Permissions Management API
RBAC administration endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, Role, Permission, UserRole, RolePermission
from app.api.v1.auth import get_current_user
from app.core.rbac_manager import RBACManager
from app.services.audit_service import audit_service

router = APIRouter()


# Pydantic models for request/response
class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    resource: str
    action: str
    is_system: bool

    class Config:
        from_attributes = True


class UserRoleAssignment(BaseModel):
    user_id: int
    role_id: int
    expires_at: Optional[datetime] = None


class RolePermissionAssignment(BaseModel):
    role_id: int
    permission_id: int


class UserPermissionsResponse(BaseModel):
    user_id: int
    username: str
    permissions: List[str]
    roles: List[str]


# Role Management Endpoints

@router.get("/roles", response_model=List[RoleResponse])
async def get_all_roles(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all roles (requires admin or user with security:view permission)"""
    # Check permission
    if not RBACManager.user_has_permission(db, current_user.id, "security:view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )

    roles = RBACManager.get_all_roles(db, include_inactive=include_inactive)
    return roles


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific role by ID"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view roles"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    return role


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new role (requires security:manage permission)"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create roles"
        )

    try:
        role = RBACManager.create_role(
            db=db,
            name=role_data.name,
            description=role_data.description or "",
            created_by=current_user.id
        )

        # Audit log
        audit_service.log(
            db=db,
            action="ROLE_CREATED",
            resource_type="role",
            user_id=current_user.id,
            resource_id=role.id,
            details={"role_name": role.name},
            status="success"
        )

        return role

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a role (deactivate, system roles cannot be deleted)"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete roles"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )

    role.is_active = False
    db.commit()

    # Audit log
    audit_service.log(
        db=db,
        action="ROLE_DELETED",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role.id,
        details={"role_name": role.name},
        status="success"
    )


# Permission Management Endpoints

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all permissions"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view permissions"
        )

    permissions = RBACManager.get_all_permissions(db)
    return permissions


@router.get("/roles/{role_id}/permissions", response_model=List[PermissionResponse])
async def get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all permissions for a specific role"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view role permissions"
        )

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    permissions = RBACManager.get_role_permissions(db, role_id)
    return permissions


@router.post("/roles/{role_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def assign_permission_to_role(
    role_id: int,
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a permission to a role"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage role permissions"
        )

    try:
        RBACManager.assign_permission_to_role(db, role_id, permission_id)

        # Audit log
        audit_service.log(
            db=db,
            action="PERMISSION_ASSIGNED",
            resource_type="role",
            user_id=current_user.id,
            resource_id=role_id,
            details={"permission_id": permission_id},
            status="success"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/roles/{role_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_permission_from_role(
    role_id: int,
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a permission from a role"""
    if not RBACManager.user_has_permission(db, current_user.id, "security:manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage role permissions"
        )

    success = RBACManager.remove_permission_from_role(db, role_id, permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission assignment not found"
        )

    # Audit log
    audit_service.log(
        db=db,
        action="PERMISSION_REMOVED",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role_id,
        details={"permission_id": permission_id},
        status="success"
    )


# User Role Assignment Endpoints

@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all permissions for a user"""
    # Users can view their own permissions, or admins can view anyone's
    if user_id != current_user.id:
        if not RBACManager.user_has_permission(db, current_user.id, "user:view"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view user permissions"
            )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )

    permissions = list(RBACManager.get_user_permissions(db, user_id))
    roles = [role.name for role in RBACManager.get_user_roles(db, user_id)]

    return {
        "user_id": user_id,
        "username": user.username,
        "permissions": permissions,
        "roles": roles
    }


@router.post("/users/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def assign_role_to_user(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a role to a user"""
    if not RBACManager.user_has_permission(db, current_user.id, "user:manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage user roles"
        )

    try:
        RBACManager.assign_role_to_user(
            db=db,
            user_id=user_id,
            role_id=role_id,
            assigned_by=current_user.id
        )

        # Audit log
        audit_service.log(
            db=db,
            action="USER_ROLE_ASSIGNED",
            resource_type="user",
            user_id=current_user.id,
            resource_id=user_id,
            details={"role_id": role_id},
            status="success"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/users/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a role from a user"""
    if not RBACManager.user_has_permission(db, current_user.id, "user:manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage user roles"
        )

    success = RBACManager.remove_role_from_user(db, user_id, role_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User role assignment not found"
        )

    # Audit log
    audit_service.log(
        db=db,
        action="USER_ROLE_REMOVED",
        resource_type="user",
        user_id=current_user.id,
        resource_id=user_id,
        details={"role_id": role_id},
        status="success"
    )
