from fastapi import APIRouter, HTTPException

from app.domains.venues.branch_model import Branch
from app.core.security import create_access_token
from app.domains.chat.moderation import generate_anon_handle
from app.domains.chat.schemas import JoinRequest, JoinResponse
from app.domains.networking.models import CustomerProfile, SocialLinks

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

    # Upsert CustomerProfile based on device_id
    profile = await CustomerProfile.find_one(CustomerProfile.device_id == payload.device_id)
    if not profile:
        profile = CustomerProfile(
            device_id=payload.device_id,
            name=payload.name,
        )
    
    # Update profile fields
    profile.name = payload.name
    profile.display_picture = payload.display_picture
    profile.interests = payload.interests
    profile.mode = payload.mode
    profile.company = payload.company
    profile.college = payload.college
    profile.job_title = payload.job_title
    profile.industry = payload.industry
    profile.skills = payload.skills
    profile.professional_tags = payload.professional_tags
    if payload.social_links:
        profile.social_links = payload.social_links
    profile.is_visible = payload.is_visible
    
    profile.current_venue_id = branch.id
    
    # Update recent visits if not already visited recently
    if not profile.recent_visits or profile.recent_visits[-1] != branch.id:
        profile.recent_visits.append(branch.id)
        if len(profile.recent_visits) > 10:
            profile.recent_visits.pop(0)

    await profile.save()

    # Create a short-lived JWT scoped to this room (3 hours)
    token = create_access_token(
        profile.name,
        {
            "role": "guest",
            "venue_id": str(branch.id),
            "restaurant_id": str(branch.restaurant_id),
            "profile_id": str(profile.id)
        },
        expires_minutes=180,
    )

    return JoinResponse(
        venue_id=str(branch.id),
        venue_name=branch.name,
        chat_token=token,
        handle=profile.name,
    )
