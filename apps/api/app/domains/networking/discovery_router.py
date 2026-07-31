from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, NetworkingMode

router = APIRouter(prefix="/discovery", tags=["networking_discovery"])


class DiscoveryResponse(BaseModel):
    profiles: list[dict]
    total: int
    page: int
    size: int


@router.get("/", response_model=DiscoveryResponse)
async def discover_profiles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """
    Fetch paginated list of visible users currently checked into the same venue.
    Filters out users in incompatible Networking Modes.
    """
    if not customer.current_venue_id:
        return DiscoveryResponse(profiles=[], total=0, page=page, size=size)

    # Base query: same venue, visible, and not the current user
    query = {
        "current_venue_id": customer.current_venue_id,
        "is_visible": True,
        "_id": {"$ne": customer.id},
    }

    # Mode filtering logic
    if customer.mode == NetworkingMode.HIDDEN:
        return DiscoveryResponse(profiles=[], total=0, page=page, size=size)
    else:
        query["mode"] = customer.mode

    # Pagination
    skip = (page - 1) * size
    
    # Fetch total and profiles
    total = await CustomerProfile.find(query).count()
    profiles_cursor = CustomerProfile.find(query).skip(skip).limit(size)
    
    profiles = await profiles_cursor.to_list()
    
    # Simple Match % calculation based on common interests and professional tags
    def calculate_match_percentage(p: CustomerProfile) -> int:
        match_score = 0
        total_possible = len(customer.interests) + len(customer.professional_tags)
        if total_possible == 0:
            return 0
            
        common_interests = set(customer.interests).intersection(p.interests)
        common_tags = set(customer.professional_tags).intersection(p.professional_tags)
        
        score = len(common_interests) + len(common_tags)
        return int((score / total_possible) * 100) if total_possible > 0 else 0

    results = []
    for p in profiles:
        p_dict = p.model_dump(exclude={"device_id", "created_at", "updated_at"})
        p_dict["id"] = str(p.id)
        p_dict["match_percentage"] = calculate_match_percentage(p)
        results.append(p_dict)
        
    # Sort by match percentage descending
    results.sort(key=lambda x: x["match_percentage"], reverse=True)

    return DiscoveryResponse(
        profiles=results,
        total=total,
        page=page,
        size=size
    )
