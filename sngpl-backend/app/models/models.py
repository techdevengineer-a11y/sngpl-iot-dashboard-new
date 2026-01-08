"""Database models"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, user, guest
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))
    # Security fields
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime(timezone=True))
    password_changed_at = Column(DateTime(timezone=True))
    must_change_password = Column(Boolean, default=False)
    last_password_change = Column(DateTime(timezone=True))


class Section(Base):
    """Section model - represents geographic sections containing SMS stations (Not used - using client_id pattern instead)"""
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # e.g., "Section A", "Section B"
    description = Column(Text)
    location = Column(String)  # General area/region
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Device(Base):
    """Device model - represents SMS stations/devices"""
    __tablename__ = "devices"
    __table_args__ = (
        # Index for active device queries
        Index('ix_devices_active_lastseen', 'is_active', 'last_seen'),
    )

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, unique=True, index=True, nullable=False)
    device_name = Column(String, index=True)
    device_type = Column(String, nullable=False, default="SMS", index=True)  # SMS (default), EVC, or FC
    location = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    is_active = Column(Boolean, default=True, index=True)
    last_seen = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    readings = relationship("DeviceReading", back_populates="device", cascade="all, delete-orphan")
    alarms = relationship("Alarm", back_populates="device", cascade="all, delete-orphan")


class DeviceReading(Base):
    __tablename__ = "device_readings"
    __table_args__ = (
        # Composite index for efficient device + time range queries
        Index('ix_device_readings_device_timestamp', 'device_id', 'timestamp'),
        # Index for client_id lookups
        Index('ix_device_readings_client_timestamp', 'client_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    temperature = Column(Float)  # T12 - Temperature (°F)
    static_pressure = Column(Float)  # T11 - Static Pressure (PSI)
    differential_pressure = Column(Float)  # T10 - Differential Pressure (IWC)
    max_static_pressure = Column(Float)  # T16 - Maximum Static Pressure (PSI)
    min_static_pressure = Column(Float)  # T17 - Minimum Static Pressure (PSI)
    volume = Column(Float)  # T14 - Volume (MCF)
    total_volume_flow = Column(Float)  # T13 - Total Volume Flow (MCF/day)
    battery = Column(Float)  # T15 - Battery (V)

    # T18-T114 Analytics parameters
    last_hour_flow_time = Column(Float)  # T18 - Last Hour Flow Time
    last_hour_diff_pressure = Column(Float)  # T19 - Last Hour Differential Pressure
    last_hour_static_pressure = Column(Float)  # T110 - Last Hour Static Pressure
    last_hour_temperature = Column(Float)  # T111 - Last Hour Temperature
    last_hour_volume = Column(Float)  # T112 - Last Hour Volume
    last_hour_energy = Column(Float)  # T113 - Last Hour Energy
    specific_gravity = Column(Float)  # T114 - Specific Gravity In Use

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device", back_populates="readings")


class Alarm(Base):
    __tablename__ = "alarms"
    __table_args__ = (
        # Index for filtering unacknowledged alarms
        Index('ix_alarms_acknowledged_triggered', 'is_acknowledged', 'triggered_at'),
        # Index for device alarms
        Index('ix_alarms_device_triggered', 'device_id', 'triggered_at'),
    )

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    parameter = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    threshold_type = Column(String, nullable=False)  # low, high
    severity = Column(String, default="medium", index=True)  # low, medium, high
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True))

    device = relationship("Device", back_populates="alarms")


class AlarmThreshold(Base):
    __tablename__ = "alarm_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True, index=True)  # Null = global threshold
    parameter = Column(String, nullable=False, index=True)
    low_threshold = Column(Float)
    high_threshold = Column(Float)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        # Index for user's unread notifications
        Index('ix_notifications_user_read_created', 'user_id', 'is_read', 'created_at'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_device_id = Column(Integer, ForeignKey("devices.id"))
    related_alarm_id = Column(Integer, ForeignKey("alarms.id"))
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        # Index for efficient queries by user, action, and time range
        Index('ix_audit_logs_user_created', 'user_id', 'created_at'),
        Index('ix_audit_logs_action_created', 'action', 'created_at'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Nullable for system actions
    username = Column(String, nullable=True)  # Denormalized for deleted users
    action = Column(String, nullable=False, index=True)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type = Column(String, nullable=False)  # user, device, alarm, threshold, etc.
    resource_id = Column(Integer, nullable=True)  # ID of the affected resource
    details = Column(Text, nullable=True)  # JSON string with additional details
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, nullable=False, default="success")  # success, failure
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class LoginHistory(Base):
    """Track all login attempts for security monitoring"""
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String, nullable=False)  # success, failed, locked
    failure_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserSession(Base):
    """Active user sessions for session management"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_token = Column(String, unique=True, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PasswordHistory(Base):
    """Password history to prevent password reuse"""
    __tablename__ = "password_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SecurityEvent(Base):
    """Security events for intrusion detection and monitoring"""
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False)  # low, medium, high, critical
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    event_metadata = Column(Text, nullable=True)  # JSON string with additional data
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class SecuritySettings(Base):
    """Global security settings"""
    __tablename__ = "security_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String, unique=True, nullable=False, index=True)
    setting_value = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class IPWhitelist(Base):
    """Whitelisted IP addresses for restricted access"""
    __tablename__ = "ip_whitelist"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class APIKey(Base):
    """API keys for programmatic access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_name = Column(String, nullable=False)
    key_hash = Column(String, unique=True, nullable=False, index=True)
    permissions = Column(Text, nullable=True)  # JSON string with permissions
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Role(Base):
    """Roles for granular RBAC"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)  # e.g., "admin", "operator", "viewer"
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)  # System roles cannot be deleted
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Permission(Base):
    """Permissions for RBAC system"""
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)  # e.g., "device:create"
    description = Column(Text, nullable=True)
    resource = Column(String, nullable=False, index=True)  # e.g., "device", "user", "alarm"
    action = Column(String, nullable=False, index=True)  # e.g., "create", "read", "update", "delete"
    is_system = Column(Boolean, default=False)  # System permissions cannot be deleted
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserRole(Base):
    """Many-to-many relationship between users and roles"""
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # For temporary role assignments

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="user_roles")
    role = relationship("Role", backref="user_assignments")
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])


class RolePermission(Base):
    """Many-to-many relationship between roles and permissions"""
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    role = relationship("Role", backref="permissions")
    permission = relationship("Permission", backref="roles")
