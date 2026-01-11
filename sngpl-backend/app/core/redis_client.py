"""
Redis client configuration and cache utilities
Provides Redis connection and caching decorator for API responses
"""
import json
import redis
from functools import wraps
from typing import Optional, Callable, Any
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Redis client instance (singleton)
redis_client: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
    """Get Redis client instance"""
    global redis_client

    if redis_client is None:
        try:
            from app.core.config import settings

            redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )

            # Test connection
            redis_client.ping()
            logger.info(f"Redis connected: {settings.REDIS_HOST}:{settings.REDIS_PORT}")

        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            redis_client = None

    return redis_client


def cache_response(
    key_prefix: str,
    ttl: int = 60,
    serialize: bool = True
):
    """
    Decorator to cache API responses in Redis

    Args:
        key_prefix: Prefix for cache key (e.g., "dashboard:stats")
        ttl: Time to live in seconds (default 60s)
        serialize: Whether to JSON serialize the response (default True)

    Usage:
        @cache_response("dashboard:stats", ttl=60)
        async def get_dashboard_stats(...):
            return {...}
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            client = get_redis_client()

            # If Redis unavailable, call function directly
            if client is None:
                return await func(*args, **kwargs)

            # Build cache key from prefix and function arguments
            # For simplicity, we'll use just the prefix + function name
            # In production, you might want to include specific params
            cache_key = f"{key_prefix}:{func.__name__}"

            # Add user context if available (for user-specific caching)
            if 'current_user' in kwargs:
                user = kwargs['current_user']
                if hasattr(user, 'id'):
                    cache_key += f":user_{user.id}"

            try:
                # Try to get from cache
                cached = client.get(cache_key)

                if cached:
                    logger.debug(f"Cache HIT: {cache_key}")
                    if serialize:
                        return json.loads(cached)
                    return cached

                # Cache miss - call the function
                logger.debug(f"Cache MISS: {cache_key}")
                result = await func(*args, **kwargs)

                # Store in cache
                if serialize:
                    client.setex(cache_key, ttl, json.dumps(result, default=str))
                else:
                    client.setex(cache_key, ttl, result)

                return result

            except Exception as e:
                # If Redis fails, log and continue without caching
                logger.warning(f"Redis error for {cache_key}: {e}")
                return await func(*args, **kwargs)

        return wrapper
    return decorator


def invalidate_cache(key_pattern: str):
    """
    Invalidate cache keys matching a pattern

    Args:
        key_pattern: Pattern to match (e.g., "dashboard:*")
    """
    client = get_redis_client()
    if client is None:
        return

    try:
        keys = client.keys(key_pattern)
        if keys:
            client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache keys matching '{key_pattern}'")
    except Exception as e:
        logger.warning(f"Cache invalidation failed for pattern '{key_pattern}': {e}")


def clear_all_cache():
    """Clear all cache entries (use with caution!)"""
    client = get_redis_client()
    if client is None:
        return

    try:
        client.flushdb()
        logger.warning("All cache cleared!")
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
