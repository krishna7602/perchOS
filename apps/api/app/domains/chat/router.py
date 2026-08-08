from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from beanie import PydanticObjectId

from app.core.security import decode_token
from app.domains.chat.manager import chat_manager
from app.domains.chat.moderation import moderate_message
from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, VenueChatMessage, UserStatus

import uuid
from app.services.message_service import publish_message, get_recent_messages

router = APIRouter()


class SendMessageRequest(BaseModel):
    content: str


@router.post("/chat/{venue_id}/messages")
async def send_venue_message(
    venue_id: str,
    payload: SendMessageRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """REST endpoint to send a message to a venue chat room (Redis 30-min TTL)."""
    try:
        v_id = PydanticObjectId(venue_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_venue_id",
        )

    if not customer.current_venue_id or customer.current_venue_id != v_id:
        customer.current_venue_id = v_id
        await customer.save()

    # Moderate message
    verdict = moderate_message(payload.content)
    if verdict != "allow":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"message_rejected: {verdict}",
        )

    iso_now = datetime.utcnow().isoformat() + "Z"
    msg_id = str(uuid.uuid4())

    msg_dict = {
        "id": msg_id,
        "sender_id": str(customer.id),
        "display_name": customer.display_name,
        "username": customer.username,
        "show_username_suffix": False,
        "profile_photo": customer.profile_photo,
        "status_emoji": "🟢",
        "content": payload.content,
        "created_at": iso_now,
        "edited": False,
        "reactions": {},
        "replies": [],
    }

    # Store in Redis sorted set with 30-minute retention score (no DB storage)
    await publish_message(venue_id, msg_dict)
    return {"status": "success", "message_id": msg_id}


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
    """REST endpoint to get messages in a venue chat room (30-minute active window from Redis)."""
    try:
        v_id = PydanticObjectId(venue_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_venue_id",
        )

    if not customer.current_venue_id or customer.current_venue_id != v_id:
        customer.current_venue_id = v_id
        await customer.save()

    # Fetch active messages within 30-minute retention window from Redis
    messages = await get_recent_messages(venue_id, window_minutes=30)

    if len(messages) > limit:
        messages = messages[-limit:]

    return {"messages": messages}



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


# ── POLLS ENDPOINTS ──

class CreatePollRequest(BaseModel):
    question: str
    options: list[str]


class VotePollRequest(BaseModel):
    option_id: str


@router.get("/polls/{venue_id}")
async def get_venue_polls(
    venue_id: str,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Get all active polls for a venue."""
    from app.domains.networking.models import VenuePoll
    try:
        v_id = PydanticObjectId(venue_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_venue_id")

    if not customer.current_venue_id or customer.current_venue_id != v_id:
        customer.current_venue_id = v_id
        await customer.save()

    polls = await VenuePoll.find(
        VenuePoll.venue_id == v_id,
        VenuePoll.is_active == True
    ).sort("-created_at").to_list()

    user_identifier = customer.display_name

    response = []
    for poll in polls:
        total_votes = sum(len(opt.voters) for opt.voters in poll.options)
        voted_option_id = None

        options_data = []
        for opt in poll.options:
            v_count = len(opt.voters)
            percentage = round((v_count / total_votes * 100), 1) if total_votes > 0 else 0
            if user_identifier in opt.voters:
                voted_option_id = opt.id
            options_data.append({
                "id": opt.id,
                "text": opt.text,
                "votes": v_count,
                "percentage": percentage
            })

        iso_time = poll.created_at.isoformat()
        if not iso_time.endswith("Z"):
            iso_time += "Z"

        response.append({
            "id": str(poll.id),
            "question": poll.question,
            "creator_handle": poll.creator_handle,
            "created_at": iso_time,
            "total_votes": total_votes,
            "options": options_data,
            "voted_option_id": voted_option_id
        })

    return {"polls": response}


@router.post("/polls/{venue_id}")
async def create_venue_poll(
    venue_id: str,
    payload: CreatePollRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Create a new poll for a venue."""
    from app.domains.networking.models import VenuePoll, PollOption
    import uuid

    try:
        v_id = PydanticObjectId(venue_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_venue_id")

    if not customer.current_venue_id or customer.current_venue_id != v_id:
        customer.current_venue_id = v_id
        await customer.save()

    if not payload.question.strip() or len(payload.options) < 2:
        raise HTTPException(status_code=400, detail="poll_requires_question_and_2_options")

    options = [
        PollOption(id=f"opt_{uuid.uuid4().hex[:6]}", text=opt_text.strip(), voters=[])
        for opt_text in payload.options if opt_text.strip()
    ]

    poll = VenuePoll(
        venue_id=v_id,
        creator_handle=customer.display_name,
        creator_profile_id=customer.id, # type: ignore
        question=payload.question.strip(),
        options=options,
        is_active=True
    )
    await poll.insert()

    return {"status": "success", "poll_id": str(poll.id)}


@router.post("/polls/{venue_id}/{poll_id}/vote")
async def vote_venue_poll(
    venue_id: str,
    poll_id: str,
    payload: VotePollRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Vote for an option in a poll."""
    from app.domains.networking.models import VenuePoll

    try:
        v_id = PydanticObjectId(venue_id)
        if not customer.current_venue_id or customer.current_venue_id != v_id:
            customer.current_venue_id = v_id
            await customer.save()
    except Exception:
        pass

    try:
        p_id = PydanticObjectId(poll_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_poll_id")

    poll = await VenuePoll.get(p_id)
    if not poll or not poll.is_active:
        raise HTTPException(status_code=404, detail="poll_not_found")

    user_identifier = customer.display_name

    # Remove user's vote from any previous option in this poll
    for opt in poll.options:
        if user_identifier in opt.voters:
            opt.voters.remove(user_identifier)

    # Add vote to target option
    target = next((opt for opt in poll.options if opt.id == payload.option_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="option_not_found")

    target.voters.append(user_identifier)
    await poll.save()

    return {"status": "success"}


