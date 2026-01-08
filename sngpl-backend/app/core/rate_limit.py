"""Rate limiting configuration"""

from slowapi import Limiter
from slowapi.util import get_remote_address


def get_identifier(request):
    """Get client identifier for rate limiting"""
    # Try to get authenticated user first
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"

    # Fall back to IP address
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(
    key_func=get_identifier,
    default_limits=["200/minute"],  # Default: 200 requests per minute
    storage_uri="memory://"  # In-memory storage (for production, use Redis)
)
