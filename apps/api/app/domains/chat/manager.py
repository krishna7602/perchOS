from fastapi import WebSocket
from datetime import datetime


class ChatManager:
    """WebSocket connection manager with broadcast + unicast.

    Manages per-venue rooms. Each room maps handles to active WebSocket
    connections. Designed to be backed by Redis pub/sub for horizontal
    scaling (single-process in-memory for MVP).
    """

    def __init__(self):
        # venue_id -> {handle: WebSocket}
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, venue_id: str, handle: str, ws: WebSocket):
        """Accept a WebSocket and register it in the venue room."""
        await ws.accept()
        self.rooms.setdefault(venue_id, {})[handle] = ws
        await self.broadcast_presence(venue_id)

    def disconnect(self, venue_id: str, handle: str):
        """Remove a handle from a venue room."""
        room = self.rooms.get(venue_id, {})
        room.pop(handle, None)
        # Clean up empty rooms
        if not room and venue_id in self.rooms:
            del self.rooms[venue_id]

    async def broadcast_presence(self, venue_id: str):
        """Send updated online user list to everyone in the room."""
        handles = list(self.rooms.get(venue_id, {}).keys())
        await self.broadcast(
            venue_id,
            {
                "type": "presence",
                "online": handles,
                "count": len(handles),
            },
        )

    async def broadcast(self, venue_id: str, message: dict):
        """Send a message to all connected clients in a venue room."""
        disconnected = []
        for handle, ws in self.rooms.get(venue_id, {}).items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(handle)

        # Clean up stale connections
        for handle in disconnected:
            self.rooms.get(venue_id, {}).pop(handle, None)

    async def unicast(self, venue_id: str, to_handle: str, message: dict) -> bool:
        """Send a message to a specific user in a venue room.

        Returns True if delivered, False if user not found.
        """
        ws = self.rooms.get(venue_id, {}).get(to_handle)
        if not ws:
            return False
        try:
            await ws.send_json(message)
            return True
        except Exception:
            self.rooms.get(venue_id, {}).pop(to_handle, None)
            return False

    def get_online_count(self, venue_id: str) -> int:
        """Get the number of online users in a venue room."""
        return len(self.rooms.get(venue_id, {}))

    def get_room_handles(self, venue_id: str) -> list[str]:
        """Get all handles in a venue room."""
        return list(self.rooms.get(venue_id, {}).keys())


# Singleton instance
chat_manager = ChatManager()
