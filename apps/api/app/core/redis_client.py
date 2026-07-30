import redis.asyncio as aioredis

from app.core.config import settings

redis_client: aioredis.Redis = None  # type: ignore


async def init_redis() -> aioredis.Redis:
    """Create and return an async Redis connection."""
    global redis_client
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    return redis_client


async def close_redis():
    """Close the Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()


def get_redis() -> aioredis.Redis:
    """Get the current Redis client instance."""
    return redis_client
