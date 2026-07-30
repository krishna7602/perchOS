from fastapi import APIRouter, HTTPException

from app.domains.venues.branch_model import Branch
from app.core.security import create_access_token
from app.domains.chat.moderation import generate_anon_handle
from app.domains.chat.schemas import JoinRequest, JoinResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/join", response_model=JoinResponse)
async def join_room(payload: JoinRequest):
    """Join a branch chat room.

    Accepts a QR token and optional display name.
    Returns a short-lived JWT scoped to the branch room.
    Anonymous users get a server-generated handle.
    """
    branch = await Branch.find_one(
        {"$or": [{"qr_token": payload.qr_token}, {"menu_qr_token": payload.qr_token}]}
    )
    if not branch:
        raise HTTPException(status_code=404, detail="invalid_qr")

    # Use provided name or generate an anonymous handle
    if not payload.is_anonymous and payload.display_name:
        handle = payload.display_name.strip()
    else:
        handle = generate_anon_handle()

    # Create a short-lived JWT scoped to this room (3 hours)
    token = create_access_token(
        handle,
        {"role": "guest", "venue_id": str(branch.id), "restaurant_id": str(branch.restaurant_id)},
        expires_minutes=180,
    )

    return JoinResponse(
        venue_id=str(branch.id),
        venue_name=branch.name,
        chat_token=token,
        handle=handle,
    )
