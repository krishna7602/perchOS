from pydantic import BaseModel
from beanie import PydanticObjectId


class OrderLineInput(BaseModel):
    """A single line item in an order creation request."""

    menu_item_id: str
    name: str
    variant_name: str | None = None
    price: float
    quantity: int


class CreateOrderRequest(BaseModel):
    """Create a new order."""

    venue_id: str
    customer_handle: str
    items: list[OrderLineInput]
    payment_method: str  # "dummy_card" | "cod"


class OrderStatusUpdate(BaseModel):
    """Update the status of an order (admin)."""

    order_status: str  # "received" | "preparing" | "ready" | "served"
