from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId
from app.domains.auth.models import User, Role
from app.domains.venues.restaurant_model import Restaurant
from app.domains.venues.branch_model import Branch
from app.deps import RequireRole
from app.core.security import hash_password
from uuid import uuid4

router = APIRouter(prefix="/superadmin", tags=["superadmin"])

class CreateCafeRequest(BaseModel):
    cafe_name: str
    password: str
    gst_number: str | None = None

@router.post("/register-cafe")
async def register_cafe(
    payload: CreateCafeRequest,
    current_user: User = Depends(RequireRole([Role.SUPER_ADMIN]))
):
    """Register a new Cafe. Creates a Restaurant tenant and an Owner User."""
    clean_name = payload.cafe_name.strip().lower().replace(" ", "")
    email_id = f"{clean_name}@perch.store"
    
    # Check if user already exists
    existing = await User.find_one(User.email == email_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cafe_already_exists"
        )
        
    # Create the Restaurant Tenant
    restaurant = Restaurant(
        name=payload.cafe_name.strip(),
        gst_number=payload.gst_number.strip() if payload.gst_number else None,
        owner_id="system"  # Will be updated once user is created
    )
    await restaurant.insert()
    
    # Create the default Branch
    branch = Branch(
        restaurant_id=restaurant.id,
        name="Main Branch",
        qr_token=str(uuid4()),
        menu_qr_token=str(uuid4()),
    )
    await branch.insert()
    
    # Create the Cafe Owner
    owner = User(
        email=email_id,
        password_hash=hash_password(payload.password),
        name=f"Owner ({payload.cafe_name.strip()})",
        role=Role.OWNER,
        restaurant_id=restaurant.id
    )
    await owner.insert()
    
    # Link restaurant to its new owner
    restaurant.owner_id = str(owner.id)
    await restaurant.save()
    
    return {
        "status": "success",
        "cafe_id": email_id,
        "restaurant_id": str(restaurant.id)
    }

class UpdateCafeRequest(BaseModel):
    cafe_name: str

@router.get("/cafes")
async def list_cafes(
    current_user: User = Depends(RequireRole([Role.SUPER_ADMIN]))
):
    """List all registered cafes and their owners."""
    restaurants = await Restaurant.find_all().to_list()
    
    # Get all owners
    owner_ids = [PydanticObjectId(r.owner_id) for r in restaurants if r.owner_id != "system"]
    owners = await User.find({"_id": {"$in": owner_ids}}).to_list()
    owner_map = {str(o.id): o for o in owners}
    
    results = []
    for r in restaurants:
        owner = owner_map.get(r.owner_id)
        results.append({
            "restaurant_id": str(r.id),
            "name": r.name,
            "owner_id": r.owner_id,
            "owner_email": owner.email if owner else None,
            "owner_name": owner.name if owner else None,
            "created_at": r.id.generation_time.isoformat() if hasattr(r.id, "generation_time") else None,
            "gst_number": r.gst_number
        })
    return {"cafes": results}

@router.patch("/cafes/{restaurant_id}")
async def update_cafe(
    restaurant_id: str,
    payload: UpdateCafeRequest,
    current_user: User = Depends(RequireRole([Role.SUPER_ADMIN]))
):
    """Update a cafe's details."""
    restaurant = await Restaurant.get(PydanticObjectId(restaurant_id))
    if not restaurant:
        raise HTTPException(status_code=404, detail="restaurant_not_found")
        
    restaurant.name = payload.cafe_name.strip()
    await restaurant.save()
    
    # Also update the owner's name if they exist
    if restaurant.owner_id and restaurant.owner_id != "system":
        owner = await User.get(PydanticObjectId(restaurant.owner_id))
        if owner:
            owner.name = f"Owner ({restaurant.name})"
            await owner.save()
            
    return {"status": "success", "message": "Cafe updated"}

@router.delete("/cafes/{restaurant_id}")
async def delete_cafe(
    restaurant_id: str,
    current_user: User = Depends(RequireRole([Role.SUPER_ADMIN]))
):
    """Delete a cafe and its owner."""
    restaurant = await Restaurant.get(PydanticObjectId(restaurant_id))
    if not restaurant:
        raise HTTPException(status_code=404, detail="restaurant_not_found")
        
    # Delete owner
    if restaurant.owner_id and restaurant.owner_id != "system":
        owner = await User.get(PydanticObjectId(restaurant.owner_id))
        if owner:
            await owner.delete()
            
    # Delete branches
    branches = await Branch.find({"restaurant_id": restaurant.id}).to_list()
    for b in branches:
        await b.delete()
        
    # Delete restaurant
    await restaurant.delete()
    return {"status": "success", "message": "Cafe and associated data deleted"}

@router.post("/cafes/{owner_id}/reset-password")
async def reset_cafe_owner_password(
    owner_id: str,
    current_user: User = Depends(RequireRole([Role.SUPER_ADMIN]))
):
    """Reset the password for a cafe owner."""
    owner = await User.get(PydanticObjectId(owner_id))
    if not owner or owner.role != Role.OWNER:
        raise HTTPException(status_code=404, detail="owner_not_found")
        
    # Generate new temp password
    import secrets
    temp_password = secrets.token_urlsafe(6)
    
    owner.password_hash = hash_password(temp_password)
    # Force password change on next login
    owner.is_active = True 
    await owner.save()
    
    return {
        "status": "success",
        "new_password": temp_password,
        "email": owner.email
    }
