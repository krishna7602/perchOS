from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.domains.venues.branch_model import Branch
from app.domains.menu.models import MenuItem
from app.domains.auth.models import User, Role
from app.domains.menu.schemas import MenuItemCreate, MenuItemUpdate
from app.deps import get_current_user, RequireRole

router = APIRouter(tags=["menu"])
require_manager = RequireRole([Role.OWNER, Role.MANAGER])


@router.get("/menu/{menu_qr_token}")
async def get_menu_by_qr(menu_qr_token: str):
    """Public endpoint: get all available menu items for a branch by its menu QR token."""
    branch = await Branch.find_one(Branch.menu_qr_token == menu_qr_token)
    if not branch:
        raise HTTPException(status_code=404, detail="invalid_menu_qr")

    items = await MenuItem.find(
        MenuItem.branch_id == branch.id,
        MenuItem.available == True,
    ).to_list()

    return {
        "venue_id": str(branch.id),
        "venue_name": branch.name,
        "items": [item.model_dump(mode="json") for item in items],
    }


@router.get("/menu/by-venue/{venue_id}")
async def get_menu_by_venue(venue_id: str):
    """Public endpoint: get all available menu items for a branch by its ID."""
    from bson.errors import InvalidId
    try:
        branch = await Branch.get(PydanticObjectId(venue_id))
    except InvalidId:
        raise HTTPException(status_code=404, detail="branch_not_found")
    
    if not branch:
        raise HTTPException(status_code=404, detail="branch_not_found")

    items = await MenuItem.find(
        MenuItem.branch_id == branch.id,
        MenuItem.available == True,
    ).to_list()

    return {
        "venue_id": str(branch.id),
        "venue_name": branch.name,
        "items": [item.model_dump(mode="json") for item in items],
    }


@router.get("/admin/menu/{venue_id}")
async def list_menu_items(venue_id: str, user: User = Depends(require_manager)):
    """Admin: list all menu items for a branch (including unavailable)."""
    branch = await Branch.get(PydanticObjectId(venue_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    items = await MenuItem.find(MenuItem.branch_id == branch.id).to_list()
    return {"items": [item.model_dump(mode="json") for item in items]}


@router.post("/admin/menu/{venue_id}")
async def create_menu_item(
    venue_id: str,
    payload: MenuItemCreate,
    user: User = Depends(require_manager),
):
    """Admin: add a new menu item to a branch."""
    branch = await Branch.get(PydanticObjectId(venue_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    item = MenuItem(
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        category=payload.category,
        is_veg=payload.is_veg,
        image_url=payload.image_url,
        available=payload.available,
    )
    await item.insert()
    return {"item": item.model_dump(mode="json")}


@router.put("/admin/menu/{item_id}")
async def update_menu_item(
    item_id: str,
    payload: MenuItemUpdate,
    user: User = Depends(require_manager),
):
    """Admin: update an existing menu item."""
    item = await MenuItem.get(PydanticObjectId(item_id))
    if not item or item.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="item_not_found")

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await item.save()

    return {"item": item.model_dump(mode="json")}


@router.delete("/admin/menu/{item_id}")
async def delete_menu_item(item_id: str, user: User = Depends(require_manager)):
    """Admin: delete a menu item."""
    item = await MenuItem.get(PydanticObjectId(item_id))
    if not item or item.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="item_not_found")

    await item.delete()
    return {"deleted": True}
