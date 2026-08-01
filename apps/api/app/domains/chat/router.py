from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.security import decode_token
from app.domains.chat.manager import chat_manager
from app.domains.chat.moderation import moderate_message

router = APIRouter()


@router.websocket("/ws/room/{venue_id}")
async def room_ws(
    websocket: WebSocket,
    venue_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint for venue chat rooms.

    Message types (client → server):
        - {"type": "message", "body": "..."} — broadcast to room
        - {"type": "dm_request", "to": "handle", "body": "..."} — private DM request
        - {"type": "dm_accept", "to": "handle"} — accept a DM request
        - {"type": "dm_message", "to": "handle", "body": "..."} — send DM after accepted

    Message types (server → client):
        - {"type": "presence", "online": [...], "count": N}
        - {"type": "message", "from": "handle", "body": "..."}
        - {"type": "rejected", "reason": "..."}
        - {"type": "dm_request", "from": "handle", "body": "..."}
        - {"type": "dm_accept", "from": "handle"}
        - {"type": "dm_message", "from": "handle", "body": "..."}
        - {"type": "system", "body": "..."}
    """
    # Verify the chat token
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    handle = claims["sub"]
    token_venue_id = claims.get("venue_id") or claims.get("branch_id")
    role = claims.get("role")

    # Ensure the token is scoped to this venue (or user is management)
    if role not in ["owner", "manager", "super_admin"] and token_venue_id != venue_id:
        await websocket.close(code=4003)
        return

    # Connect to the room
    await chat_manager.connect(venue_id, handle, websocket)

    # Announce join
    await chat_manager.broadcast(
        venue_id,
        {"type": "system", "body": f"{handle} joined the room"},
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                # Broadcast message with moderation
                body = data.get("body", "")
                verdict = moderate_message(body)
                if verdict != "allow":
                    await websocket.send_json(
                        {"type": "rejected", "reason": verdict}
                    )
                    continue

                await chat_manager.broadcast(
                    venue_id,
                    {"type": "message", "from": handle, "body": body},
                )

            elif msg_type == "dm_request":
                # Permission-gated unicast DM request
                to_handle = data.get("to", "")
                body = data.get("body", "")

                verdict = moderate_message(body)
                if verdict != "allow":
                    await websocket.send_json(
                        {"type": "rejected", "reason": verdict}
                    )
                    continue

                delivered = await chat_manager.unicast(
                    venue_id,
                    to_handle,
                    {"type": "dm_request", "from": handle, "body": body},
                )
                if not delivered:
                    await websocket.send_json(
                        {"type": "system", "body": f"{to_handle} is not online"}
                    )

            elif msg_type == "dm_accept":
                # Accept a DM request
                to_handle = data.get("to", "")
                await chat_manager.unicast(
                    venue_id,
                    to_handle,
                    {"type": "dm_accept", "from": handle},
                )

            elif msg_type == "dm_message":
                # Send a DM (after accept)
                to_handle = data.get("to", "")
                body = data.get("body", "")

                verdict = moderate_message(body)
                if verdict != "allow":
                    await websocket.send_json(
                        {"type": "rejected", "reason": verdict}
                    )
                    continue

                await chat_manager.unicast(
                    venue_id,
                    to_handle,
                    {"type": "dm_message", "from": handle, "body": body},
                )

    except WebSocketDisconnect:
        is_completely_disconnected = chat_manager.disconnect(venue_id, handle, websocket)
        if is_completely_disconnected:
            await chat_manager.broadcast(
                venue_id,
                {"type": "system", "body": f"{handle} left the room"},
            )
            await chat_manager.broadcast_presence(venue_id)
