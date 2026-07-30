from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.domains.orders.models import Order, OrderLine
from app.domains.venues.branch_model import Branch
from app.domains.auth.models import User, Role
from app.services.payments.dummy_gateway import DummyGateway
from app.services.payments.cod_gateway import CODGateway
from app.domains.orders.schemas import CreateOrderRequest, OrderStatusUpdate
from app.deps import get_current_user, RequireRole

router = APIRouter(tags=["orders"])
require_kitchen = RequireRole([Role.OWNER, Role.MANAGER, Role.CHEF])

GATEWAYS = {
    "dummy_card": DummyGateway(),
    "cod": CODGateway(),
}

VALID_STATUSES = {"received", "preparing", "ready", "served"}


@router.post("/orders")
async def create_order(payload: CreateOrderRequest):
    """Create a new order and process payment."""
    gateway = GATEWAYS.get(payload.payment_method)
    if not gateway:
        raise HTTPException(status_code=400, detail="unsupported_payment_method")

    branch = await Branch.get(PydanticObjectId(payload.venue_id))
    if not branch:
        raise HTTPException(status_code=404, detail="branch_not_found")

    order = Order(
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
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

    result = await gateway.charge(str(order.id), order.total)
    order.payment_status = "paid" if result["status"] == "paid" else result["status"]
    await order.save()

    # Trigger Auto Task Allocation (Background Task)
    from app.services.scheduler import TaskScheduler
    import asyncio
    asyncio.create_task(TaskScheduler.dispatch_order(str(order.id), str(branch.id)))

    return {"order": order.model_dump(mode="json")}


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order status — used by the customer order tracker page (polled every 5s)."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    return {"order": order.model_dump(mode="json")}


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


@router.patch("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    user: User = Depends(require_kitchen),
):
    """Admin: advance an order's status (Received → Preparing → Ready → Served)."""
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.domains.orders.models import Order, OrderLine
from app.domains.venues.branch_model import Branch
from app.domains.auth.models import User, Role
from app.services.payments.dummy_gateway import DummyGateway
from app.services.payments.cod_gateway import CODGateway
from app.domains.orders.schemas import CreateOrderRequest, OrderStatusUpdate
from app.deps import get_current_user, RequireRole

router = APIRouter(tags=["orders"])
require_kitchen = RequireRole([Role.OWNER, Role.MANAGER, Role.CHEF])

GATEWAYS = {
    "dummy_card": DummyGateway(),
    "cod": CODGateway(),
}

VALID_STATUSES = {"received", "preparing", "ready", "served"}


@router.post("/orders")
async def create_order(payload: CreateOrderRequest):
    """Create a new order and process payment."""
    gateway = GATEWAYS.get(payload.payment_method)
    if not gateway:
        raise HTTPException(status_code=400, detail="unsupported_payment_method")

    branch = await Branch.get(PydanticObjectId(payload.venue_id))
    if not branch:
        raise HTTPException(status_code=404, detail="branch_not_found")

    order = Order(
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
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

    result = await gateway.charge(str(order.id), order.total)
    order.payment_status = "paid" if result["status"] == "paid" else result["status"]
    await order.save()

    # Trigger Auto Task Allocation (Background Task)
    from app.services.scheduler import TaskScheduler
    import asyncio
    asyncio.create_task(TaskScheduler.dispatch_order(str(order.id), str(branch.id)))

    return {"order": order.model_dump(mode="json")}


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order status — used by the customer order tracker page (polled every 5s)."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    return {"order": order.model_dump(mode="json")}


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


@router.patch("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    user: User = Depends(require_kitchen),
):
    """Admin: advance an order's status (Received → Preparing → Ready → Served)."""
    if payload.order_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")

    order = await Order.get(PydanticObjectId(order_id))
    if not order or order.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="order_not_found")
    from datetime import datetime
    if payload.order_status in ["ready", "served"] and not order.completed_at:
        order.completed_at = datetime.utcnow()

    order.order_status = payload.order_status
    await order.save()

    return {"order": order.model_dump(mode="json")}

@router.post("/admin/orders/{order_id}/accept")
async def accept_order(
    order_id: str,
    user: User = Depends(require_kitchen)
):
    """Chef accepts an assigned order."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order or order.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    if order.assigned_chef_id != user.id:
        raise HTTPException(status_code=403, detail="not_assigned_to_you")
        
    order.order_status = "preparing"
    await order.save()
    
    # Broadcast to managers and customers that order is accepted
    from app.domains.chat.manager import chat_manager
    await chat_manager.broadcast(
        str(order.branch_id),
        {
            "type": "order_accepted",
            "order_id": str(order.id),
            "chef_name": user.name
        }
    )
    
    return {"status": "success", "order": order.model_dump(mode="json")}
    
@router.post("/admin/orders/{order_id}/reject")
async def reject_order(
    order_id: str,
    user: User = Depends(require_kitchen)
):
    """Chef rejects an order, causing the scheduler to re-assign it."""
    order = await Order.get(PydanticObjectId(order_id))
    if not order or order.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="order_not_found")
        
    if order.assigned_chef_id != user.id:
        raise HTTPException(status_code=403, detail="not_assigned_to_you")
        
    # Mark as rejected by this chef
    order.rejected_by.append(user.id)
    order.assigned_chef_id = None
    order.order_status = "received"
    await order.save()
    
    # Re-run scheduler
    from app.services.scheduler import TaskScheduler
    import asyncio
    asyncio.create_task(TaskScheduler.dispatch_order(str(order.id), str(order.branch_id)))
    
    return {"status": "success", "message": "order_rejected_and_redispatched"}
