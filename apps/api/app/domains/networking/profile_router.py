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
