import asyncio
from app.core.redis_client import get_redis
from app.services.message_service import prune_expired_messages


async def prune_all_rooms_loop():
    """Background task looping every 5 minutes to prune expired chat messages across all rooms."""
    while True:
        try:
            redis = get_redis()
            if redis:
                room_keys = await redis.keys("room:*:messages")
                for key in room_keys:
                    key_str = key.decode() if isinstance(key, bytes) else key
                    parts = key_str.split(":")
                    if len(parts) >= 2:
                        room_id = parts[1]
                        await prune_expired_messages(room_id)
        except Exception as e:
            print(f"Error pruning chat messages: {e}")

        await asyncio.sleep(300)  # run every 5 minutes
