import time
import json
from uuid import uuid4
from datetime import datetime
from app.core.redis_client import get_redis


def _room_key(room_id: str) -> str:
    return f"room:{room_id}:messages"


async def publish_message(room_id: str, sender_handle: str, body: str):
    """Publish a message to room sorted set and Redis channel."""
    redis = get_redis()
    if not redis:
        return None

    message = {
        "id": str(uuid4()),
        "room_id": room_id,
        "sender_handle": sender_handle,
        "body": body,
        "created_at": datetime.utcnow().isoformat(),
    }
    score = time.time()
    try:
        await redis.zadd(_room_key(room_id), {json.dumps(message): score})
        await redis.publish(f"channel:{room_id}", json.dumps(message))
    except Exception:
        pass
    return message


async def get_recent_messages(room_id: str, window_hours: int = 3):
    """Get non-expired messages within retention window from Redis sorted set."""
    redis = get_redis()
    if not redis:
        return []

    cutoff = time.time() - (window_hours * 3600)
    try:
        raw = await redis.zrangebyscore(_room_key(room_id), cutoff, "+inf")
        return [json.loads(r) for r in raw]
    except Exception:
        return []


async def prune_expired_messages(room_id: str, window_hours: int = 3):
    """Remove messages older than retention window score from room sorted set."""
    redis = get_redis()
    if not redis:
        return

    cutoff = time.time() - (window_hours * 3600)
    try:
        await redis.zremrangebyscore(_room_key(room_id), "-inf", cutoff)
    except Exception:
        pass
