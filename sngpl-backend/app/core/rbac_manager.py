"""
Advanced RBAC Manager - Database-driven permission management
Works alongside the existing rbac.py for backwards compatibility
"""

from typing import List, Optional, Set
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import User, Role, Permission, UserRole, RolePermission


class RBACManager:
    """Advanced RBAC manager using database-driven roles and permissions"""

    @staticmethod
    def get_user_permissions(db: Session, user_id: int) -> Set[str]:
        """
        Get all permission names for a user based on their roles

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Set of permission names (e.g., {'device:view', 'alarm:create'})
        """
        permissions = set()

        # Get all active roles for user
        user_roles = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.is_active == True
        ).all()

        # Get permissions for each role
        for user_role in user_roles:
            role_permissions = db.query(RolePermission).filter(
                RolePermission.role_id == user_role.role_id
            ).all()

            for role_perm in role_permissions:
                permission = db.query(Permission).filter(
                    Permission.id == role_perm.permission_id
                ).first()
                if permission:
                    permissions.add(permission.name)

        return permissions

    @staticmethod
    def user_has_permission(db: Session, user_id: int, permission_name: str) -> bool:
        """
        Check if user has a specific permission

        Args:
            db: Database session
            user_id: User ID
            permission_name: Permission to check (e.g., 'device:create')

        Returns:
            True if user has the permission
        """
        user_permissions = RBACManager.get_user_permissions(db, user_id)
        return permission_name in user_permissions

    @staticmethod
    def user_has_any_permission(db: Session, user_id: int, permission_names: List[str]) -> bool:
        """
        Check if user has any of the specified permissions

        Args:
            db: Database session
            user_id: User ID
            permission_names: List of permissions to check

        Returns:
            True if user has at least one of the permissions
        """
        user_permissions = RBACManager.get_user_permissions(db, user_id)
        return any(perm in user_permissions for perm in permission_names)

    @staticmethod
    def user_has_all_permissions(db: Session, user_id: int, permission_names: List[str]) -> bool:
        """
        Check if user has all of the specified permissions

        Args:
            db: Database session
            user_id: User ID
            permission_names: List of permissions to check

        Returns:
            True if user has all of the permissions
        """
        user_permissions = RBACManager.get_user_permissions(db, user_id)
        return all(perm in user_permissions for perm in permission_names)

    @staticmethod
    def get_user_roles(db: Session, user_id: int) -> List[Role]:
        """
        Get all active roles for a user

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of Role objects
        """
        user_roles = db.query(UserRole).join(Role).filter(
            UserRole.user_id == user_id,
            UserRole.is_active == True,
            Role.is_active == True
        ).all()

        return [ur.role for ur in user_roles]

    @staticmethod
    def user_has_role(db: Session, user_id: int, role_name: str) -> bool:
        """
        Check if user has a specific role

        Args:
            db: Database session
            user_id: User ID
            role_name: Name of the role

        Returns:
            True if user has the role
        """
        user_role = db.query(UserRole).join(Role).filter(
            UserRole.user_id == user_id,
            Role.name == role_name,
            UserRole.is_active == True,
            Role.is_active == True
        ).first()

        return user_role is not None

    @staticmethod
    def assign_role_to_user(
        db: Session,
        user_id: int,
        role_id: int,
        assigned_by: Optional[int] = None,
        expires_at: Optional[str] = None
    ) -> UserRole:
        """
        Assign a role to a user

        Args:
            db: Database session
            user_id: User ID
            role_id: Role ID
            assigned_by: User ID who assigned the role
            expires_at: Optional expiration datetime for temporary role

        Returns:
            UserRole object
        """
        # Check if role exists
        role = db.query(Role).filter(Role.id == role_id, Role.is_active == True).first()
        if not role:
            raise ValueError(f"Role with ID {role_id} not found or inactive")

        # Check if user exists
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found or inactive")

        # Check if role already assigned
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        ).first()

        if existing:
            # Reactivate if inactive
            existing.is_active = True
            existing.assigned_by = assigned_by
            existing.expires_at = expires_at
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new assignment
            user_role = UserRole(
                user_id=user_id,
                role_id=role_id,
                assigned_by=assigned_by,
                expires_at=expires_at,
                is_active=True
            )
            db.add(user_role)
            db.commit()
            db.refresh(user_role)
            return user_role

    @staticmethod
    def remove_role_from_user(db: Session, user_id: int, role_id: int) -> bool:
        """
        Remove a role from a user (deactivate)

        Args:
            db: Database session
            user_id: User ID
            role_id: Role ID

        Returns:
            True if role was removed
        """
        user_role = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        ).first()

        if user_role:
            user_role.is_active = False
            db.commit()
            return True

        return False

    @staticmethod
    def create_role(
        db: Session,
        name: str,
        description: str,
        created_by: Optional[int] = None,
        is_system: bool = False
    ) -> Role:
        """
        Create a new role

        Args:
            db: Database session
            name: Role name
            description: Role description
            created_by: User ID who created the role
            is_system: Whether this is a system role (cannot be deleted)

        Returns:
            Role object
        """
        # Check if role already exists
        existing = db.query(Role).filter(Role.name == name).first()
        if existing:
            raise ValueError(f"Role '{name}' already exists")

        role = Role(
            name=name,
            description=description,
            created_by=created_by,
            is_system=is_system,
            is_active=True
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def create_permission(
        db: Session,
        name: str,
        description: str,
        resource: str,
        action: str,
        is_system: bool = False
    ) -> Permission:
        """
        Create a new permission

        Args:
            db: Database session
            name: Permission name (e.g., 'device:create')
            description: Permission description
            resource: Resource type (e.g., 'device')
            action: Action (e.g., 'create')
            is_system: Whether this is a system permission (cannot be deleted)

        Returns:
            Permission object
        """
        # Check if permission already exists
        existing = db.query(Permission).filter(Permission.name == name).first()
        if existing:
            raise ValueError(f"Permission '{name}' already exists")

        permission = Permission(
            name=name,
            description=description,
            resource=resource,
            action=action,
            is_system=is_system
        )
        db.add(permission)
        db.commit()
        db.refresh(permission)
        return permission

    @staticmethod
    def assign_permission_to_role(db: Session, role_id: int, permission_id: int) -> RolePermission:
        """
        Assign a permission to a role

        Args:
            db: Database session
            role_id: Role ID
            permission_id: Permission ID

        Returns:
            RolePermission object
        """
        # Check if permission already assigned
        existing = db.query(RolePermission).filter(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        ).first()

        if existing:
            return existing

        role_perm = RolePermission(
            role_id=role_id,
            permission_id=permission_id
        )
        db.add(role_perm)
        db.commit()
        db.refresh(role_perm)
        return role_perm

    @staticmethod
    def remove_permission_from_role(db: Session, role_id: int, permission_id: int) -> bool:
        """
        Remove a permission from a role

        Args:
            db: Database session
            role_id: Role ID
            permission_id: Permission ID

        Returns:
            True if permission was removed
        """
        role_perm = db.query(RolePermission).filter(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        ).first()

        if role_perm:
            db.delete(role_perm)
            db.commit()
            return True

        return False

    @staticmethod
    def get_role_permissions(db: Session, role_id: int) -> List[Permission]:
        """
        Get all permissions for a role

        Args:
            db: Database session
            role_id: Role ID

        Returns:
            List of Permission objects
        """
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_id == role_id
        ).all()

        permissions = []
        for rp in role_permissions:
            permission = db.query(Permission).filter(Permission.id == rp.permission_id).first()
            if permission:
                permissions.append(permission)

        return permissions

    @staticmethod
    def get_all_roles(db: Session, include_inactive: bool = False) -> List[Role]:
        """
        Get all roles

        Args:
            db: Database session
            include_inactive: Whether to include inactive roles

        Returns:
            List of Role objects
        """
        query = db.query(Role)
        if not include_inactive:
            query = query.filter(Role.is_active == True)

        return query.all()

    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        """
        Get all permissions

        Args:
            db: Database session

        Returns:
            List of Permission objects
        """
        return db.query(Permission).all()
