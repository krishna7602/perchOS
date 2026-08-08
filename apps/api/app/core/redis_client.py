import redis.asyncio as aioredis

from app.core.config import settings

redis_client: aioredis.Redis = None  # type: ignore


async def init_redis() -> aioredis.Redis:
    """Create and return an async Redis connection."""
    global redis_client
    url = settings.REDIS_URL
    if "upstash.io" in url and url.startswith("redis://"):
        url = url.replace("redis://", "rediss://", 1)

    redis_client = aioredis.from_url(
        url,
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
