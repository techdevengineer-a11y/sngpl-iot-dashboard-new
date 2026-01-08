"""Application configuration"""

from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationError
from typing import List
import sys


class Settings(BaseSettings):
    # Database - PostgreSQL + TimescaleDB
    DATABASE_URL: str

    # Database Pool Settings
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_RECYCLE: int = 3600

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # MQTT
    MQTT_BROKER: str = "broker.emqx.io"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "evc/data"

    # API
    API_V1_PREFIX: str = "/api"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY is not empty and is secure"""
        if not v or len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long for security")
        if "change_in_production" in v.lower():
            print("⚠️  WARNING: Using default SECRET_KEY. Change this in production!", file=sys.stderr)
        return v

    @field_validator("MQTT_PORT")
    @classmethod
    def validate_mqtt_port(cls, v: int) -> int:
        """Validate MQTT port is valid"""
        if not (1 <= v <= 65535):
            raise ValueError("MQTT_PORT must be between 1 and 65535")
        return v

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_token_expiry(cls, v: int) -> int:
        """Validate token expiry is reasonable"""
        if v < 1:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be at least 1")
        if v > 10080:  # 7 days
            print(f"⚠️  WARNING: ACCESS_TOKEN_EXPIRE_MINUTES is very long ({v} minutes = {v/1440:.1f} days)", file=sys.stderr)
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env


# Initialize settings with proper error handling
try:
    settings = Settings()
except ValidationError as e:
    print("❌ Configuration Error: Invalid environment variables", file=sys.stderr)
    for error in e.errors():
        field = error['loc'][0]
        msg = error['msg']
        print(f"   - {field}: {msg}", file=sys.stderr)
    sys.exit(1)
