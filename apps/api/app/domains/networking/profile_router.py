from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, NetworkingMode, SocialLinks

router = APIRouter(prefix="/profile", tags=["networking_profile"])


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    display_picture: str | None = None
    headline: str | None = None
    bio: str | None = None
    company: str | None = None
    college: str | None = None
    job_title: str | None = None
    industry: str | None = None
    professional_tags: list[str] | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None
    social_tags: list[str] | None = None
    social_links: SocialLinks | None = None
    mode: NetworkingMode | None = None
    is_visible: bool | None = None


@router.get("/me")
async def get_my_profile(customer: CustomerProfile = Depends(get_current_customer)):
    """Fetch the current authenticated customer's profile."""
    return customer


@router.put("/me")
async def update_my_profile(
    payload: ProfileUpdateRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Update the current authenticated customer's profile."""
    update_data = payload.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(customer, key, value)
        
    await customer.save()
    return customer


class VisibilityToggleRequest(BaseModel):
    is_visible: bool


@router.patch("/visibility")
async def toggle_visibility(
    payload: VisibilityToggleRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Toggle visibility status for discovery."""
    customer.is_visible = payload.is_visible
    await customer.save()
    return {"status": "success", "is_visible": customer.is_visible}


from beanie import PydanticObjectId
from fastapi import HTTPException
from app.domains.networking.models import Connection, ConnectionRequest, WaveStatus, SocialLink

@router.get("/{id_or_username}")
async def get_public_profile(
    id_or_username: str,
    current_user: CustomerProfile = Depends(get_current_customer),
):
    """Fetch public profile safely by id (PydanticObjectId), uuid, or username."""
    profile = None
    try:
        profile = await CustomerProfile.get(PydanticObjectId(id_or_username))
    except Exception:
        pass

    if not profile:
        profile = await CustomerProfile.find_one(CustomerProfile.uuid == id_or_username)
    if not profile:
        profile = await CustomerProfile.find_one(CustomerProfile.username == id_or_username)

    if not profile:
        raise HTTPException(status_code=404, detail="profile_not_found")

    if not profile.is_visible and profile.id != current_user.id:
        connected = await Connection.find_one({
            "$or": [
                {"user_a": current_user.id, "user_b": profile.id},
                {"user_a": profile.id, "user_b": current_user.id}
            ]
        })
        if not connected:
            raise HTTPException(status_code=403, detail="profile_is_hidden")

    connection_status = "none"
    connection_id = None
    if profile.id == current_user.id:
        connection_status = "self"
    else:
        connected = await Connection.find_one({
            "$or": [
                {"user_a": current_user.id, "user_b": profile.id},
                {"user_a": profile.id, "user_b": current_user.id}
            ]
        })
        if connected:
            connection_status = "connected"
            connection_id = str(connected.id)
        else:
            req_sent = await ConnectionRequest.find_one({
                "sender_id": current_user.id,
                "receiver_id": profile.id,
                "status": WaveStatus.PENDING
            })
            if req_sent:
                connection_status = "wave_sent"
            else:
                req_received = await ConnectionRequest.find_one({
                    "sender_id": profile.id,
                    "receiver_id": current_user.id,
                    "status": WaveStatus.PENDING
                })
                if req_received:
                    connection_status = "wave_received"
                    connection_id = str(req_received.id)

    social_links_doc = await SocialLink.find_one(SocialLink.user_id == profile.id)
    social_links_data = {}
    if social_links_doc:
        social_links_data = {
            "linkedin": social_links_doc.linkedin,
            "instagram": social_links_doc.instagram,
            "github": social_links_doc.github,
            "portfolio": social_links_doc.portfolio,
            "website": social_links_doc.website
        }

    p_dict = profile.model_dump(exclude={"account_id", "email", "device_id", "created_at", "updated_at"})
    p_dict["id"] = str(profile.id)
    p_dict["connection_status"] = connection_status
    p_dict["connection_id"] = connection_id
    p_dict["social_links"] = social_links_data

    return p_dict

