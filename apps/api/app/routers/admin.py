from fastapi import APIRouter, Depends

from app.domains.venues.branch_model import Branch
from app.domains.venues.restaurant_model import Restaurant
from app.domains.orders.models import Order
from app.domains.menu.models import MenuItem
from app.domains.auth.models import User, Role
from app.domains.chat.manager import chat_manager
from app.deps import get_current_user, RequireRole
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])
require_owner = RequireRole([Role.OWNER])
require_management = RequireRole([Role.OWNER, Role.MANAGER, Role.SUPER_ADMIN])
require_staff = RequireRole([Role.OWNER, Role.MANAGER, Role.CHEF, Role.WAITER])


@router.get("/dashboard")
async def dashboard(user: User = Depends(require_staff)):
    """Admin dashboard stats: venue count, active rooms, today's order summary."""
    if user.role == Role.SUPER_ADMIN:
        # Global stats for Super Admin
        branches = await Branch.find_all().to_list()
        branch_ids = [b.id for b in branches]
        total_orders = await Order.find_all().count()
        paid_orders = await Order.find(Order.payment_status == "paid").to_list()
        total_revenue = sum(o.total for o in paid_orders)
        active_rooms = 0
        total_online = 0
        for b in branches:
            count = chat_manager.get_online_count(str(b.id))
            if count > 0:
                active_rooms += 1
                total_online += count
        total_items = await MenuItem.find_all().count()
        return {
            "venue_count": len(branches),
            "active_chat_rooms": active_rooms,
            "total_online_users": total_online,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_menu_items": total_items,
        }

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


class PaymentSettingsUpdate(BaseModel):
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None
    allow_cod: bool | None = None
    allow_online_payment: bool | None = None


@router.get("/settings/payments")
async def get_payment_settings(user: User = Depends(require_management)):
    """Get the current restaurant's payment configuration."""
    if not user.restaurant_id:
        return {"error": "no_restaurant"}
    
    restaurant = await Restaurant.get(user.restaurant_id)
    if not restaurant:
        return {"error": "not_found"}
        
    return {
        "razorpay_key_id": restaurant.razorpay_key_id or "",
        "razorpay_key_secret": restaurant.razorpay_key_secret or "",
        "razorpay_webhook_secret": restaurant.razorpay_webhook_secret or "",
        "allow_cod": getattr(restaurant, "allow_cod", True),
        "allow_online_payment": getattr(restaurant, "allow_online_payment", True),
    }


@router.patch("/settings/payments")
async def update_payment_settings(payload: PaymentSettingsUpdate, user: User = Depends(require_management)):
    """Update the restaurant's Razorpay and payment configuration."""
    if not user.restaurant_id:
        return {"error": "no_restaurant"}
        
    restaurant = await Restaurant.get(user.restaurant_id)
    if not restaurant:
        return {"error": "not_found"}
        
    if payload.razorpay_key_id is not None:
        restaurant.razorpay_key_id = payload.razorpay_key_id
    if payload.razorpay_key_secret is not None:
        if payload.razorpay_key_secret != "********": # Don't update if it's the masked value
            restaurant.razorpay_key_secret = payload.razorpay_key_secret
    if payload.razorpay_webhook_secret is not None:
        if payload.razorpay_webhook_secret != "********":
            restaurant.razorpay_webhook_secret = payload.razorpay_webhook_secret
    if payload.allow_cod is not None:
        restaurant.allow_cod = payload.allow_cod
    if payload.allow_online_payment is not None:
        restaurant.allow_online_payment = payload.allow_online_payment
        
    await restaurant.save()
    return {"status": "success"}


@router.patch("/orders/{order_id}/cash-collected")
async def mark_cash_collected(order_id: str, user: User = Depends(require_staff)):
    """Mark a Cash on Delivery order payment as collected by staff."""
    from beanie import PydanticObjectId
    from fastapi import HTTPException

    try:
        obj_id = PydanticObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_order_id")

    order = await Order.get(obj_id)
    if not order or order.payment_method != "cod":
        raise HTTPException(status_code=400, detail="not_a_cod_order")

    order.payment_status = "paid"
    await order.save()
    return order

