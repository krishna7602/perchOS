from fastapi import APIRouter, Depends

from app.domains.venues.branch_model import Branch
from app.domains.orders.models import Order
from app.domains.menu.models import MenuItem
from app.domains.auth.models import User, Role
from app.domains.chat.manager import chat_manager
from app.deps import get_current_user, RequireRole

router = APIRouter(prefix="/admin", tags=["admin"])
require_staff = RequireRole([Role.OWNER, Role.MANAGER, Role.CHEF, Role.WAITER])


@router.get("/dashboard")
async def dashboard(user: User = Depends(require_staff)):
    """Admin dashboard stats: venue count, active rooms, today's order summary."""
    if not user.restaurant_id:
        return {
            "venue_count": 0,
            "active_chat_rooms": 0,
            "total_online_users": 0,
            "total_orders": 0,
            "total_revenue": 0,
            "total_menu_items": 0,
        }

    branches = await Branch.find(Branch.restaurant_id == user.restaurant_id).to_list()
    branch_ids = [b.id for b in branches]

    # Count orders across all branches
    total_orders = await Order.find(
        {"branch_id": {"$in": branch_ids}}
    ).count()

    # Revenue (sum of paid orders)
    paid_orders = await Order.find(
        {"branch_id": {"$in": branch_ids}, "payment_status": "paid"}
    ).to_list()
    total_revenue = sum(o.total for o in paid_orders)

    # Active chat rooms
    active_rooms = 0
    total_online = 0
    for b in branches:
        count = chat_manager.get_online_count(str(b.id))
        if count > 0:
            active_rooms += 1
            total_online += count

    # Menu items count
    total_items = await MenuItem.find(
        {"branch_id": {"$in": branch_ids}}
    ).count()

    return {
        "venue_count": len(branches),
        "active_chat_rooms": active_rooms,
        "total_online_users": total_online,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_menu_items": total_items,
    }
