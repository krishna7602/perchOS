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

    # Base query: same venue and visible
    query = {
        "current_venue_id": customer.current_venue_id,
        "is_visible": True,
    }

    # Mode filtering logic
    if customer.networking_mode == NetworkingMode.HIDDEN:
        return DiscoveryResponse(profiles=[], total=0, page=page, size=size)
    else:
        query["networking_mode"] = customer.networking_mode

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
        if p.account_id:
            p_dict["account_id"] = str(p.account_id)
        if p.current_venue_id:
            p_dict["current_venue_id"] = str(p.current_venue_id)
        p_dict["recent_visits"] = [str(v) for v in p.recent_visits]
        p_dict["connections"] = [str(c) for c in p.connections]
        p_dict["favorite_cafes"] = [str(f) for f in p.favorite_cafes]
        p_dict["blocked_users"] = [str(b) for b in p.blocked_users]
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


@router.get("/search", response_model=DiscoveryResponse)
async def search_profiles(
    query: str = Query("", min_length=1),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """
    Search visible users globally by name, username, company, college, interests, tags, skills, or networking goal.
    """
    regex = {"$regex": query, "$options": "i"}
    search_filter = {
        "is_visible": True,
        "_id": {"$ne": customer.id},
        "$or": [
            {"display_name": regex},
            {"username": regex},
            {"company": regex},
            {"college": regex},
            {"interests": regex},
            {"professional_tags": regex},
            {"skills": regex},
            {"networking_mode": regex}
        ]
    }

    skip = (page - 1) * size
    total = await CustomerProfile.find(search_filter).count()
    profiles_cursor = CustomerProfile.find(search_filter).skip(skip).limit(size)
    profiles = await profiles_cursor.to_list()

    results = []
    for p in profiles:
        p_dict = p.model_dump(exclude={"account_id", "email", "device_id", "created_at", "updated_at"})
        p_dict["id"] = str(p.id)
        results.append(p_dict)

    return DiscoveryResponse(
        profiles=results,
        total=total,
        page=page,
        size=size
    )

