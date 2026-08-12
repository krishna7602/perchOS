import asyncio
import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Path, Request
from beanie import PydanticObjectId

from app.domains.orders.models import Order, OrderLine, OrderSource
from app.domains.orders.router import log_and_broadcast_event
from app.domains.venues.branch_model import Branch

logger = logging.getLogger("perch.orders.webhooks")
router = APIRouter(prefix="/api/orders/webhooks", tags=["order-webhooks"])


@router.post("/zomato/{branch_id}")
async def zomato_order_relay(branch_id: str, request: Request):
    """
    Zomato Order Relay Webhook Endpoint.
    Receives incoming order payload from Zomato, normalizes it, and publishes to Perch KDS.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    ext_order_id = payload.get("order_id") or payload.get("order", {}).get("order_id", f"ZOM-{PydanticObjectId()}")
    customer_info = payload.get("customer", {})
    customer_name = customer_info.get("name", "Zomato Customer")
    delivery_rider = payload.get("rider", {}).get("name", "Zomato Valet")

    # Extract items
    raw_items = payload.get("items", payload.get("order", {}).get("items", []))
    order_lines = []
    total_amount = 0.0

    for item in raw_items:
        item_name = item.get("name", "Item")
        qty = int(item.get("quantity", 1))
        price = float(item.get("price", 0.0))
        variant = item.get("variant", {}).get("name") if isinstance(item.get("variant"), dict) else None
        
        total_amount += price * qty
        order_lines.append(
            OrderLine(
                menu_item_id=PydanticObjectId(),  # Standin for external item reference
                name=item_name,
                variant_name=variant,
                price=price,
                quantity=qty,
            )
        )

    # Fallback total if provided in payload
    if "total_price" in payload:
        total_amount = float(payload["total_price"])

    order = Order(
        source=OrderSource.ZOMATO,
        external_order_id=str(ext_order_id),
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        venue_id=branch.id,
        order_token=str(ext_order_id),
        customer_handle=f"Zomato #{str(ext_order_id)[-4:]}",
        customer_name=customer_name,
        table_number=f"Zomato Delivery",
        items=order_lines,
        total=total_amount,
        payment_method="zomato_pay",
        payment_status="paid",
        order_status="received",
        channel_metadata={
            "platform": "ZOMATO",
            "rider_name": delivery_rider,
            "instructions": payload.get("instructions", "No instructions"),
            "delivery_type": payload.get("delivery_type", "DELIVERY"),
        },
        external_raw_payload=payload,
    )
    await order.insert()

    # Log audit event & broadcast real-time alert to KDS & Staff
    await log_and_broadcast_event(
        order=order,
        event_type="ORDER_CREATED",
        title=f"New Zomato Order #{ext_order_id}",
        description=f"Received Zomato delivery order with {len(order_lines)} item(s) (₹{total_amount}).",
    )

    # Broadcast directly to kitchen KDS channel
    from app.domains.chat.manager import chat_manager
    asyncio.create_task(
        chat_manager.broadcast(
            str(branch.id),
            {
                "type": "kitchen_new_order",
                "order_id": str(order.id),
                "order_token": order.order_token,
                "source": "ZOMATO",
                "table_number": order.table_number,
                "total": order.total,
            },
        )
    )

    logger.info(f"Successfully processed Zomato webhook order #{ext_order_id} for branch {branch_id}")
    return {"status": "success", "order_id": str(order.id), "external_order_id": ext_order_id}


@router.post("/swiggy/{branch_id}")
async def swiggy_order_relay(branch_id: str, request: Request):
    """
    Swiggy Order Relay Webhook Endpoint.
    Receives incoming order payload from Swiggy, normalizes it, and publishes to Perch KDS.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    ext_order_id = payload.get("swiggy_order_id") or payload.get("order_id", f"SWG-{PydanticObjectId()}")
    customer_name = payload.get("customer_name", "Swiggy Customer")
    delivery_rider = payload.get("delivery_exec_name", "Swiggy Executive")

    raw_items = payload.get("cart", {}).get("items", payload.get("items", []))
    order_lines = []
    total_amount = 0.0

    for item in raw_items:
        item_name = item.get("name", "Item")
        qty = int(item.get("quantity", 1))
        price = float(item.get("subtotal", item.get("price", 0.0)))
        
        total_amount += price * qty
        order_lines.append(
            OrderLine(
                menu_item_id=PydanticObjectId(),
                name=item_name,
                variant_name=item.get("variant_title"),
                price=price,
                quantity=qty,
            )
        )

    if "bill_total" in payload:
        total_amount = float(payload["bill_total"])

    order = Order(
        source=OrderSource.SWIGGY,
        external_order_id=str(ext_order_id),
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        venue_id=branch.id,
        order_token=str(ext_order_id),
        customer_handle=f"Swiggy #{str(ext_order_id)[-4:]}",
        customer_name=customer_name,
        table_number="Swiggy Delivery",
        items=order_lines,
        total=total_amount,
        payment_method="swiggy_pay",
        payment_status="paid",
        order_status="received",
        channel_metadata={
            "platform": "SWIGGY",
            "rider_name": delivery_rider,
            "instructions": payload.get("cooking_instructions", "Standard preparation"),
        },
        external_raw_payload=payload,
    )
    await order.insert()

    await log_and_broadcast_event(
        order=order,
        event_type="ORDER_CREATED",
        title=f"New Swiggy Order #{ext_order_id}",
        description=f"Received Swiggy order with {len(order_lines)} item(s) (₹{total_amount}).",
    )

    from app.domains.chat.manager import chat_manager
    asyncio.create_task(
        chat_manager.broadcast(
            str(branch.id),
            {
                "type": "kitchen_new_order",
                "order_id": str(order.id),
                "order_token": order.order_token,
                "source": "SWIGGY",
                "table_number": order.table_number,
                "total": order.total,
            },
        )
    )

    logger.info(f"Successfully processed Swiggy webhook order #{ext_order_id} for branch {branch_id}")
    return {"status": "success", "order_id": str(order.id), "external_order_id": ext_order_id}


@router.post("/simulator")
async def simulate_external_order(
    branch_id: str,
    source: str = "ZOMATO",
    item_name: str = "Paneer Tikka Special",
    total: float = 350.0,
):
    """
    Dev & Testing Simulator Endpoint.
    Injects a mock Zomato or Swiggy order directly into a branch for KDS testing.
    """
    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    source_enum = OrderSource.ZOMATO if source.upper() == "ZOMATO" else OrderSource.SWIGGY
    mock_id = f"{source_enum.value[:3]}-{secrets_token_hex(4).upper()}"

    order = Order(
        source=source_enum,
        external_order_id=mock_id,
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        venue_id=branch.id,
        order_token=mock_id,
        customer_handle=f"{source_enum.value.capitalize()} Guest",
        customer_name="Simulated Customer",
        table_number=f"{source_enum.value.capitalize()} Delivery",
        items=[
            OrderLine(
                menu_item_id=PydanticObjectId(),
                name=item_name,
                variant_name="Full Plate",
                price=total,
                quantity=1,
            )
        ],
        total=total,
        payment_method=f"{source.lower()}_pay",
        payment_status="paid",
        order_status="received",
        channel_metadata={
            "platform": source_enum.value,
            "rider_name": "Test Driver",
            "instructions": "Extra spicy, no cutlery needed",
        },
    )
    await order.insert()

    await log_and_broadcast_event(
        order=order,
        event_type="ORDER_CREATED",
        title=f"Simulated {source_enum.value} Order #{mock_id}",
        description=f"Simulated {source_enum.value} delivery order (₹{total}).",
    )

    from app.domains.chat.manager import chat_manager
    asyncio.create_task(
        chat_manager.broadcast(
            str(branch.id),
            {
                "type": "kitchen_new_order",
                "order_id": str(order.id),
                "order_token": order.order_token,
                "source": source_enum.value,
                "table_number": order.table_number,
                "total": order.total,
            },
        )
    )

    return {"status": "simulated", "order_id": str(order.id), "external_order_id": mock_id, "source": source_enum.value}


def secrets_token_hex(nbytes: int) -> str:
    import secrets
    return secrets.token_hex(nbytes)
