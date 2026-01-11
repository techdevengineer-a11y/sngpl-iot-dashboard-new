"""Rate limiting configuration"""

from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger(__name__)


def get_identifier(request):
    """Get client identifier for rate limiting"""
    # Try to get authenticated user first
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"

    # Fall back to IP address
    return get_remote_address(request)


def get_storage_uri() -> str:
    """
    Get rate limiter storage URI
    Uses Redis if available, falls back to memory
    """
    try:
        from app.core.config import settings

        # Try to build Redis URI
        redis_uri = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"

        # Add password if configured
        if settings.REDIS_PASSWORD:
            redis_uri = f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"

        logger.info(f"Rate limiter using Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        return redis_uri

    except Exception as e:
        logger.warning(f"Redis not available for rate limiting, using in-memory storage: {e}")
        return "memory://"


# Create limiter instance with Redis backend
limiter = Limiter(
    key_func=get_identifier,
    default_limits=["200/minute"],  # Default: 200 requests per minute
    storage_uri=get_storage_uri()  # Use Redis if available, memory otherwise
)
