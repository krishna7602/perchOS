from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.core.security import decode_token
from app.domains.chat.manager import chat_manager
from app.domains.chat.moderation import moderate_message
from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, VenueChatMessage, UserStatus

router = APIRouter()


class SendMessageRequest(BaseModel):
    content: str


@router.post("/chat/{venue_id}/messages")
async def send_venue_message(
    venue_id: str,
    payload: SendMessageRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """REST endpoint to send a message to a venue chat room."""
    # Ensure customer is checked into this venue
    if not customer.current_venue_id or str(customer.current_venue_id) != venue_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="must_be_checked_in_to_send_messages",
        )

    # Moderate message
    verdict = moderate_message(payload.content)
    if verdict != "allow":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"message_rejected: {verdict}",
        )

    msg = VenueChatMessage(
        venue_id=customer.current_venue_id,
        sender_id=customer.id, # type: ignore
        content=payload.content,
        created_at=datetime.utcnow()
    )
    await msg.insert()
    return {"status": "success", "message_id": str(msg.id)}


def json_safe(val):
    if hasattr(val, "__str__") and type(val).__name__ in ("PydanticObjectId", "ObjectId"):
        return str(val)
    if isinstance(val, dict):
        return {k: json_safe(v) for k, v in val.items()}
    if isinstance(val, list):
        return [json_safe(x) for x in val]
    return val


@router.get("/chat/{venue_id}/messages")
async def get_venue_messages(
    venue_id: str,
    limit: int = Query(50, ge=1, le=100),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """REST endpoint to get messages in a venue chat room with display name deduplication."""
    # Ensure customer is checked into this venue
    if not customer.current_venue_id or str(customer.current_venue_id) != venue_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="must_be_checked_in_to_view_messages",
        )

    # Fetch messages
    try:
        v_id = PydanticObjectId(venue_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_venue_id",
        )
    messages = await VenueChatMessage.find(
        VenueChatMessage.venue_id == v_id
    ).sort("-created_at").limit(limit).to_list()

    # Reorder chronologically
    messages.reverse()

    # Fetch active profiles in this venue to determine duplicate display names
    active_profiles = await CustomerProfile.find(
        CustomerProfile.current_venue_id == v_id
    ).to_list()

    display_names = [p.display_name for p in active_profiles]
    duplicates = {name for name in display_names if display_names.count(name) > 1}

    # Cache profiles to avoid N+1 queries for sender hydration
    profile_cache = {p.id: p for p in active_profiles}

    response_messages = []
    for msg in messages:
        sender = profile_cache.get(msg.sender_id)
        if not sender:
            # Fallback load if not currently active/in cache
            sender = await CustomerProfile.get(msg.sender_id)

        if not sender:
            # Placeholder for deleted/unknown sender
            display_name = "Unknown User"
            username = "unknown"
            profile_photo = None
            show_suffix = False
        else:
            display_name = sender.display_name
            username = sender.username
            profile_photo = sender.profile_photo
            show_suffix = sender.display_name in duplicates

        # Get status
        status_emoji = "🟢"  # Default to active green status
        custom_status = await UserStatus.find_one(UserStatus.user_id == msg.sender_id)
        if custom_status:
            status_emoji = custom_status.status_emoji

        response_messages.append({
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "display_name": display_name,
            "username": username,
            "show_username_suffix": show_suffix,
            "profile_photo": profile_photo,
            "status_emoji": status_emoji,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "edited": msg.edited_at is not None,
            "reactions": json_safe(msg.reactions),
            "replies": json_safe(msg.replies),
        })

    return {"messages": response_messages}



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
    import asyncio

    # Maximum session duration for customers: 2 hours (in seconds)
    MAX_SESSION_SECONDS = 2 * 60 * 60

    # Verify the chat token
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    handle = claims["sub"]
    token_venue_id = claims.get("venue_id") or claims.get("branch_id")
    role = claims.get("role")
    profile_id = claims.get("profile_id")

    # Ensure the token is scoped to this venue (or user is management)
    if role not in ["owner", "manager", "super_admin"] and token_venue_id != venue_id:
        await websocket.close(code=4003)
        return

    is_guest = role == "guest"

    # Connect to the room
    await chat_manager.connect(venue_id, handle, websocket)

    # Announce join
    await chat_manager.broadcast(
        venue_id,
        {"type": "system", "body": f"{handle} joined the room"},
    )

    session_start = datetime.utcnow()

    async def _handle_messages():
        """Inner loop that processes incoming WebSocket messages."""
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

    timed_out = False
    try:
        if is_guest:
            # Enforce 2-hour max session for customers
            await asyncio.wait_for(_handle_messages(), timeout=MAX_SESSION_SECONDS)
        else:
            # Staff/admin connections have no time limit
            await _handle_messages()
    except asyncio.TimeoutError:
        timed_out = True
        # Session expired — notify the customer and close gracefully
        try:
            await websocket.send_json({
                "type": "system",
                "body": "Your 2-hour session has ended. Thanks for perching with us! 🐦"
            })
            await websocket.close(code=4008)
        except Exception:
            pass
    except WebSocketDisconnect:
        pass
    finally:
        # Remove from live connections (WebSocket in-memory)
        is_completely_disconnected = chat_manager.disconnect(venue_id, handle, websocket)

        if is_completely_disconnected:
            # Broadcast departure
            await chat_manager.broadcast(
                venue_id,
                {"type": "system", "body": f"{handle} left the room"},
            )
            await chat_manager.broadcast_presence(venue_id)

            # Clear live presence from DB but keep all profile data persisted
            if is_guest and profile_id:
                try:
                    profile = await CustomerProfile.get(PydanticObjectId(profile_id))
                    if profile:
                        profile.current_venue_id = None
                        profile.last_active = datetime.utcnow()
                        await profile.save()
                except Exception:
                    pass

                # Mark VenueSession as inactive
                try:
                    from app.domains.networking.models import VenueSession
                    session = await VenueSession.find_one(
                        VenueSession.user_id == PydanticObjectId(profile_id),
                        VenueSession.venue_id == PydanticObjectId(venue_id),
                        VenueSession.is_active == True,
                    )
                    if session:
                        session.is_active = False
                        session.last_active = datetime.utcnow()
                        await session.save()
                except Exception:
                    pass

