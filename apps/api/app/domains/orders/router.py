from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.domains.orders.models import Order, OrderLine, Payment
from app.domains.venues.branch_model import Branch
from app.domains.auth.models import User, Role, StaffStatus
from app.services.payments.registry import get_available_gateways, get_payment_methods_info
from app.domains.orders.schemas import CreateOrderRequest, OrderStatusUpdate, VerifyPaymentRequest
from app.deps import get_current_user, RequireRole
import re

router = APIRouter(tags=["orders"])
require_kitchen = RequireRole([Role.OWNER, Role.MANAGER, Role.CHEF])


@router.get("/config/payment-methods")
async def get_payment_methods():
    """Get available payment methods based on environment configuration."""
    return get_payment_methods_info()


VALID_STATUSES = {"received", "preparing", "ready", "served"}


async def dispatch_paid_order(order: Order):
    """Triggers scheduler allocation and sends push + websocket notifications to kitchen chefs."""
    # Atomically mark as dispatched in the DB to prevent duplicate dispatches / race conditions
    result = await Order.get_motor_collection().update_one(
        {"_id": order.id, "is_dispatched": {"$ne": True}},
        {"$set": {"is_dispatched": True}}
    )
    if result.modified_count == 0:
        return # Already dispatched!

    # 1. Trigger Auto Task Allocation (Background Task)
    from app.services.scheduler import TaskScheduler
    import asyncio
    asyncio.create_task(TaskScheduler.dispatch_order(str(order.id), str(order.branch_id)))

    # 2. Trigger Push Notification & WebSocket Broadcast
    from app.domains.notifications.manager import notification_manager
    from app.domains.chat.manager import chat_manager
    from app.domains.venues.branch_model import Branch
    
    branch = await Branch.get(order.branch_id)
    venue_name = branch.name if branch else "Venue"
    
    push_payload = {
        "type": "new_order",
        "order_id": str(order.id),
        "order_token": order.order_token,
        "total": order.total,
        "venue_name": venue_name
    }
    
    asyncio.create_task(notification_manager.send_push_to_branch_role(str(order.branch_id), "chef", push_payload))
    asyncio.create_task(chat_manager.broadcast(str(order.branch_id), {"type": "system_order", "payload": push_payload}))


async def get_next_sequence(branch_id: str, sequence_name: str) -> int:
    from app.domains.orders.models import Counter
    counter = await Counter.find_one({"branch_id": branch_id, "sequence_name": sequence_name})
    if not counter:
        counter = Counter(branch_id=branch_id, sequence_name=sequence_name, sequence_value=1)
        await counter.insert()
        return 1
    counter.sequence_value += 1
    await counter.save()
    return counter.sequence_value


def generate_acronym(text: str) -> str:
    # Extracts the first letter of each word and upper cases it
    words = re.findall(r'\b\w', text)
    return "".join(words).upper()[:4]  # limit to 4 chars max


@router.post("/orders")
async def create_order(payload: CreateOrderRequest):
    """Create a new order and process payment."""
    gateways = get_available_gateways()
    gateway = gateways.get(payload.payment_method)
    if not gateway:
        raise HTTPException(status_code=400, detail="unsupported_payment_method")


    branch = await Branch.get(PydanticObjectId(payload.venue_id))
    if not branch:
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    from app.domains.venues.restaurant_model import Restaurant
    restaurant = await Restaurant.get(branch.restaurant_id)
    key_id = restaurant.razorpay_key_id if restaurant else None
    key_secret = restaurant.razorpay_key_secret if restaurant else None

    # Generate Order Token
    seq = await get_next_sequence(str(branch.id), "orders")
    rest_acr = generate_acronym(restaurant.name) if restaurant else "UNK"
    branch_acr = generate_acronym(branch.name)
    order_token = f"{rest_acr}-{branch_acr}-{seq}"

    order = Order(
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        venue_id=branch.id,
        order_token=order_token,
        customer_handle=payload.customer_handle,
        items=[
            OrderLine(
                menu_item_id=PydanticObjectId(i.menu_item_id),
                name=i.name,
                price=i.price,
                quantity=i.quantity,
            )
            for i in payload.items
        ],
        total=sum(i.price * i.quantity for i in payload.items),
        payment_method=payload.payment_method,
    )
    await order.insert()

    result = await gateway.charge(str(order.id), order.total, key_id, key_secret)
    
    payment = Payment(
        order_id=order.id,
        venue_id=branch.id,
        customer_handle=payload.customer_handle,
        provider=payload.payment_method,
        amount=order.total,
        status=result["status"],
        provider_order_id=result.get("reference"),
    )
    await payment.insert()
    
    order.payment_status = "paid" if result["status"] == "paid" else result["status"]
    await order.save()

    if order.payment_status == "paid" or order.payment_method == "cod":
        import asyncio
        asyncio.create_task(dispatch_paid_order(order))

    return {
        "order": order.model_dump(mode="json"),
        "provider_order_id": payment.provider_order_id,
        "razorpay_key_id": key_id
    }


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order status — used by the customer order tracker page (polled every 5s)."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    branch = await Branch.get(order.branch_id)
    from app.domains.venues.restaurant_model import Restaurant
    restaurant = await Restaurant.get(order.restaurant_id) if order.restaurant_id else None
    
    response = order.model_dump(mode="json")
    response["gst_number"] = branch.gst_number if (branch and branch.gst_number) else (restaurant.gst_number if restaurant else None)
    response["cafe_name"] = restaurant.name if restaurant else None
    response["venue_name"] = branch.name if branch else None

    # Check if there are waiters in the branch
    waiters_count = await User.find(User.branch_id == order.branch_id, User.role == Role.WAITER).count()
    response["has_waiters"] = waiters_count > 0

    return {"order": response}


@router.post("/orders/{order_id}/verify-payment")
async def verify_payment(order_id: str, payload: VerifyPaymentRequest):
    """Manually verify a Razorpay payment from the frontend to bypass webhook delays."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    payment = await Payment.find_one(Payment.order_id == order.id)
    if not payment:
        raise HTTPException(status_code=404, detail="payment_not_found")
        
    if payment.status == "paid":
        return {"ok": True, "status": "already_paid"}
        
    from app.domains.venues.restaurant_model import Restaurant
    restaurant = await Restaurant.get(order.restaurant_id)
    key_secret = restaurant.razorpay_key_secret if restaurant else None
    
    if not key_secret:
        raise HTTPException(status_code=400, detail="razorpay_not_configured")
        
    gateway = GATEWAYS.get("razorpay")
    
    # Verify signature
    is_valid = gateway.verify_payment_signature(
        payload.razorpay_order_id, 
        payload.razorpay_payment_id, 
        payload.razorpay_signature, 
        key_secret
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="invalid_signature")
        
    # Mark as paid
    payment.status = "paid"
    payment.provider_payment_id = payload.razorpay_payment_id
    await payment.save()
    
    already_paid = (order.payment_status == "paid")

    order.payment_status = "paid"
    order.order_status = "received"
    await order.save()
    
    if not already_paid:
        import asyncio
        asyncio.create_task(dispatch_paid_order(order))
    
    return {"ok": True, "order": order.model_dump(mode="json")}


@router.get("/admin/orders/{venue_id}")
async def list_venue_orders(venue_id: str, user: User = Depends(require_kitchen)):
    """Admin: list all orders for a branch (for the kanban board)."""
    branch = await Branch.get(PydanticObjectId(venue_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    orders = await Order.find(

        Order.branch_id == branch.id,
    ).sort("-created_at").to_list()

    return {"orders": [o.model_dump(mode="json") for o in orders]}


@router.get("/admin/orders/{venue_id}/analytics")
async def get_branch_kitchen_analytics(venue_id: str, user: User = Depends(require_kitchen)):
    """Admin: Get kitchen analytics for a branch."""
    branch = await Branch.get(PydanticObjectId(venue_id))
    if not branch or (user.role not in [Role.SUPER_ADMIN] and branch.restaurant_id != user.restaurant_id):
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    from datetime import datetime, timedelta
    from beanie.operators import In
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    orders = await Order.find(
        Order.branch_id == branch.id,
        Order.created_at >= today,
        In(Order.order_status, ["ready", "served"])
    ).to_list()
    
    orders_prepared = len(orders)
    avg_prep_time_mins = 0
    
    if orders_prepared > 0:
        total_prep_seconds = sum(
            (o.completed_at - o.created_at).total_seconds() 
            for o in orders 
            if o.completed_at
        )
        avg_prep_time_mins = round((total_prep_seconds / orders_prepared) / 60.0, 1)

    return {
        "status": "success",
        "data": {
            "hours_logged": 0, # Venue level, not applicable
            "orders_prepared": orders_prepared,
            "avg_prep_time_mins": avg_prep_time_mins
        }
    }


@router.patch("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    user: User = Depends(require_kitchen),
):
    """Admin: advance an order's status (Received → Preparing → Ready → Served)."""
    oid = PydanticObjectId(order_id)
    order = await Order.get(oid)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    branch = await Branch.get(order.branch_id)
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    if payload.order_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")

    if payload.order_status in ["preparing", "ready"] and user.role != Role.CHEF:
        raise HTTPException(status_code=403, detail="only_chefs_can_prepare_orders")
        
    if payload.order_status == "served" and user.role != Role.WAITER:
        raise HTTPException(status_code=403, detail="only_waiters_can_serve_orders")

    update_data = {"order_status": payload.order_status}
    if payload.order_status in ["ready", "served"] and not order.completed_at:
        from datetime import datetime
        update_data["completed_at"] = datetime.utcnow()
    if payload.order_status == "served":
        update_data["payment_status"] = "paid"

    await Order.get_motor_collection().update_one(
        {"_id": oid},
        {"$set": update_data}
    )
    order = await Order.get(oid)

    # Broadcast WebSocket update for status change
    from app.domains.notifications.manager import notification_manager
    from app.domains.chat.manager import chat_manager
    import asyncio

    push_payload = {
        "type": f"order_{payload.order_status}",
        "order_id": str(order.id),
        "order_token": order.order_token,
        "order_status": payload.order_status,
        "message": f"Order {order.order_token} is now {payload.order_status}."
    }

    asyncio.create_task(chat_manager.broadcast(str(branch.id), {
        "type": "order_status_updated",
        "order_id": str(order.id),
        "order_token": order.order_token,
        "order_status": payload.order_status,
        "order": order.model_dump(mode="json")
    }))

    if order.customer_handle:
        asyncio.create_task(chat_manager.unicast(str(branch.id), order.customer_handle, {
            "type": "system_order",
            "payload": push_payload
        }))

    # Handle staff status updates and notifications
    if payload.order_status == "ready":
        if order.assigned_chef_id:
            active_orders = await Order.find(
                Order.assigned_chef_id == order.assigned_chef_id,
                Order.order_status == "preparing"
            ).to_list()
            if not active_orders:
                chef = await User.get(order.assigned_chef_id)
                if chef:
                    chef.status = StaffStatus.AVAILABLE
                    await chef.save()
        
        waiters = await User.find(User.branch_id == branch.id, User.role == Role.WAITER).to_list()
        if waiters:
            asyncio.create_task(notification_manager.send_push_to_branch_role(str(branch.id), "waiter", push_payload))
        else:
            if order.customer_handle:
                asyncio.create_task(notification_manager.send_push_to_user(order.customer_handle, push_payload))

    elif payload.order_status == "served":
        if order.assigned_waiter_id:
            active_orders = await Order.find(
                Order.assigned_waiter_id == order.assigned_waiter_id,
                Order.order_status != "served"
            ).to_list()
            if not active_orders:
                waiter = await User.get(order.assigned_waiter_id)
                if waiter:
                    waiter.status = StaffStatus.AVAILABLE
                    await waiter.save()

    return {"order": order.model_dump(mode="json")}


@router.post("/admin/orders/{order_id}/accept")
async def accept_order(order_id: str, user: User = Depends(RequireRole([Role.CHEF]))):
    oid = PydanticObjectId(order_id)
    order = await Order.get(oid)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    branch = await Branch.get(order.branch_id)
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    # Atomic concurrency guard: Update only if order_status is 'received'
    result = await Order.get_motor_collection().update_one(
        {"_id": oid, "order_status": "received"},
        {"$set": {"order_status": "preparing", "assigned_chef_id": user.id}}
    )
    
    if result.modified_count == 0:
        latest_order = await Order.get(oid)
        if not latest_order:
            raise HTTPException(status_code=404, detail="order_not_found")
        if latest_order.order_status != "received":
            raise HTTPException(
                status_code=409,
                detail=f"Order has already been processed (current status: {latest_order.order_status})."
            )

    order = await Order.get(oid)

    # Update chef status
    user.status = StaffStatus.PREPARING
    await user.save()
    
    # Trigger Notifications & WebSockets
    from app.domains.notifications.manager import notification_manager
    from app.domains.chat.manager import chat_manager
    import asyncio

    push_payload = {
        "type": "order_accepted",
        "order_id": str(order.id),
        "order_token": order.order_token,
        "chef_id": str(user.id),
        "chef_name": user.name,
        "venue_name": branch.name,
        "message": f"{order.order_token} order is taken by {user.name}"
    }

    # 1. Broadcast to branch (Admin Dashboard, Kitchen, Waiters)
    asyncio.create_task(chat_manager.broadcast(str(branch.id), {
        "type": "order_accepted",
        "order_id": str(order.id),
        "order_token": order.order_token,
        "chef_id": str(user.id),
        "chef_name": user.name,
        "order": order.model_dump(mode="json")
    }))

    # 2. Unicast WebSocket message to customer
    if order.customer_handle:
        asyncio.create_task(chat_manager.unicast(str(branch.id), order.customer_handle, {
            "type": "system_order",
            "payload": push_payload
        }))

    # 3. Web Push to waiters and managers
    asyncio.create_task(notification_manager.send_push_to_branch_role(str(branch.id), "waiter", push_payload))
    asyncio.create_task(notification_manager.send_push_to_branch_role(str(branch.id), "manager", push_payload))
    if order.customer_handle:
        asyncio.create_task(notification_manager.send_push_to_user(order.customer_handle, push_payload))

    return {"status": "success", "order": order.model_dump(mode="json")}


@router.post("/admin/orders/{order_id}/reject")
async def reject_order(order_id: str, user: User = Depends(RequireRole([Role.CHEF]))):
    oid = PydanticObjectId(order_id)
    order = await Order.get(oid)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    branch = await Branch.get(order.branch_id)
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    result = await Order.get_motor_collection().update_one(
        {"_id": oid, "order_status": "received"},
        {
            "$addToSet": {"rejected_by": user.id},
            "$set": {"assigned_chef_id": None}
        }
    )
    if result.modified_count == 0:
        latest = await Order.get(oid)
        if latest and latest.order_status != "received":
            raise HTTPException(status_code=409, detail=f"Cannot reject order in status '{latest.order_status}'")

    # Try scheduling it to another chef
    from app.services.scheduler import TaskScheduler
    import asyncio
    asyncio.create_task(TaskScheduler.dispatch_order(str(order.id), str(branch.id)))
    
    return {"status": "success", "message": "Order rejected and rescheduled."}


@router.post("/admin/orders/{order_id}/assign-waiter")
async def assign_waiter(order_id: str, user: User = Depends(RequireRole([Role.OWNER, Role.MANAGER, Role.WAITER]))):
    oid = PydanticObjectId(order_id)
    order = await Order.get(oid)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    branch = await Branch.get(order.branch_id)
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    result = await Order.get_motor_collection().update_one(
        {"_id": oid},
        {"$set": {"assigned_waiter_id": user.id}}
    )
    order = await Order.get(oid)

    user.status = StaffStatus.DELIVERING
    await user.save()

    from app.domains.chat.manager import chat_manager
    import asyncio
    asyncio.create_task(chat_manager.broadcast(str(branch.id), {
        "type": "order_waiter_assigned",
        "order_id": str(order.id),
        "waiter_id": str(user.id),
        "waiter_name": user.name
    }))
    
    return {"status": "success", "order": order.model_dump(mode="json")}


@router.post("/orders/{order_id}/self-pickup")
async def self_pickup_order(order_id: str):
    """Customer self-pickups the order, marking it as served."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    if order.order_status != "ready":
        raise HTTPException(status_code=400, detail="order_not_ready_for_pickup")
        
    order.order_status = "served"
    order.payment_status = "paid"
    from datetime import datetime
    order.completed_at = datetime.utcnow()
    await order.save()
    
    return {"status": "success", "order": order.model_dump(mode="json")}
