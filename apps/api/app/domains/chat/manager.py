from fastapi import WebSocket
from datetime import datetime


class ChatManager:
    """WebSocket connection manager with broadcast + unicast.

    Manages per-venue rooms. Each room maps handles to a list of active WebSocket
    connections. Designed to be backed by Redis pub/sub for horizontal
    scaling (single-process in-memory for MVP).
    """

    def __init__(self):
        # venue_id -> {handle: list[WebSocket]}
        self.rooms: dict[str, dict[str, list[WebSocket]]] = {}

    async def connect(self, venue_id: str, handle: str, ws: WebSocket):
        """Accept a WebSocket and register it in the venue room."""
        await ws.accept()
        self.rooms.setdefault(venue_id, {}).setdefault(handle, []).append(ws)
        await self.broadcast_presence(venue_id)

    def disconnect(self, venue_id: str, handle: str, ws: WebSocket) -> bool:
        """Remove a specific WebSocket from a venue room.

        Returns True if the handle has no active connections left.
        """
        room = self.rooms.get(venue_id, {})
        if handle in room:
            if ws in room[handle]:
                room[handle].remove(ws)
            if not room[handle]:
                del room[handle]
                # Clean up empty rooms
                if not room and venue_id in self.rooms:
                    del self.rooms[venue_id]
                return True
        return False

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
        for handle, wss in list(self.rooms.get(venue_id, {}).items()):
            for ws in list(wss):
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append((handle, ws))

        # Clean up stale connections
        for handle, ws in disconnected:
            if handle in self.rooms.get(venue_id, {}):
                if ws in self.rooms[venue_id][handle]:
                    self.rooms[venue_id][handle].remove(ws)
                if not self.rooms[venue_id][handle]:
                    del self.rooms[venue_id][handle]

    async def unicast(self, venue_id: str, to_handle: str, message: dict) -> bool:
        """Send a message to a specific user in a venue room.

        Returns True if delivered, False if user not found.
        """
        wss = self.rooms.get(venue_id, {}).get(to_handle, [])
        if not wss:
            return False
        
        success = False
        disconnected = []
        for ws in list(wss):
            try:
                await ws.send_json(message)
                success = True
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            if to_handle in self.rooms.get(venue_id, {}):
                if ws in self.rooms[venue_id][to_handle]:
                    self.rooms[venue_id][to_handle].remove(ws)
                if not self.rooms[venue_id][to_handle]:
                    del self.rooms[venue_id][to_handle]
                    
        return success

    def get_online_count(self, venue_id: str) -> int:
        """Get the number of online users in a venue room."""
        return len(self.rooms.get(venue_id, {}))

    def get_room_handles(self, venue_id: str) -> list[str]:
        """Get all handles in a venue room."""
        return list(self.rooms.get(venue_id, {}).keys())


# Singleton instance
chat_manager = ChatManager()
