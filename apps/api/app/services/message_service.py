import time
import json
from uuid import uuid4
from datetime import datetime
from app.core.redis_client import get_redis


def _room_key(room_id: str) -> str:
    return f"room:{room_id}:messages"


async def publish_message(room_id: str, message_data: dict) -> dict:
    """Store message in Redis sorted set with 30-minute retention score and publish to pub/sub."""
    redis = get_redis()
    score = time.time()
    
    if redis:
        try:
            key = _room_key(room_id)
            serialized = json.dumps(message_data)
            await redis.zadd(key, {serialized: score})
            await redis.publish(f"channel:{room_id}", serialized)
            # Auto-prune messages older than 30 minutes (1800s)
            cutoff = score - (30 * 60)
            await redis.zremrangebyscore(key, "-inf", cutoff)
        except Exception:
            pass

    return message_data


async def get_recent_messages(room_id: str, window_minutes: int = 30) -> list[dict]:
    """Get messages within 30-minute retention window from Redis sorted set."""
    redis = get_redis()
    if not redis:
        return []

    now = time.time()
    cutoff = now - (window_minutes * 60)
    key = _room_key(room_id)
    try:
        # First prune any items older than 30 mins
        await redis.zremrangebyscore(key, "-inf", cutoff)
        # Fetch remaining active items
        raw_items = await redis.zrangebyscore(key, cutoff, "+inf")
        messages = []
        for item in raw_items:
            try:
                messages.append(json.loads(item))
            except Exception:
                pass
        return messages
    except Exception:
        return []


async def prune_expired_messages(room_id: str, window_minutes: int = 30):
    """Remove messages older than 30 minutes from room sorted set."""
    redis = get_redis()
    if not redis:
        return

    cutoff = time.time() - (window_minutes * 60)
    try:
        await redis.zremrangebyscore(_room_key(room_id), "-inf", cutoff)
    except Exception:
        pass
