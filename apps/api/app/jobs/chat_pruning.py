import asyncio
from app.core.redis_client import get_redis
from app.services.message_service import prune_expired_messages


async def prune_all_rooms_loop():
    """Background task looping every 2 minutes to prune expired chat messages (>30 min) across all rooms."""
    while True:
        try:
            redis = get_redis()
            if redis:
                try:
                    room_keys = await redis.keys("room:*:messages")
                    for key in room_keys:
                        key_str = key.decode() if isinstance(key, bytes) else key
                        parts = key_str.split(":")
                        if len(parts) >= 2:
                            room_id = parts[1]
                            await prune_expired_messages(room_id, window_minutes=30)
                except Exception:
                    pass
        except Exception:
            pass

        await asyncio.sleep(120)  # run every 2 minutes
