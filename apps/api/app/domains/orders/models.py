from enum import Enum
from beanie import Document, PydanticObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any, Optional


class OrderSource(str, Enum):
    PERCH = "PERCH"
    ZOMATO = "ZOMATO"
    SWIGGY = "SWIGGY"


class OrderLine(BaseModel):
    """A single line item within an order."""

    menu_item_id: PydanticObjectId
    name: str
    variant_name: str | None = None
    price: float
    quantity: int


class Order(Document):
    """A customer order placed at a venue or through an external aggregator."""

    source: OrderSource = OrderSource.PERCH
    external_order_id: str | None = None  # e.g., ZOM-82931, SWG-29182
    channel_metadata: dict[str, Any] | None = None  # rider info, delivery driver details, prep time buffer
    external_raw_payload: dict[str, Any] | None = None  # raw webhook payload audit log

    restaurant_id: Optional[PydanticObjectId] = None  # tenant isolation
    branch_id: Optional[PydanticObjectId] = None
    venue_id: Optional[PydanticObjectId] = None  # legacy support
    order_token: str | None = None  # Unique token for invoicing and tracking
    customer_handle: str  # chat display name / anon handle, no PII required
    customer_name: str | None = None
    customer_email: str | None = None
    table_number: str | None = None
    access_token: str | None = None
    items: list[OrderLine]
    total: float
    payment_method: str  # "dummy_card" | "cod" | "zomato_pay" | "swiggy_pay"
    payment_status: str = "pending"  # pending | paid | failed
    order_status: str = "received"  # received | preparing | ready | served
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    
    # Workflow
    assigned_chef_id: PydanticObjectId | None = None
    assigned_waiter_id: PydanticObjectId | None = None
    assigned_waiter_name: str | None = None
    rejected_by: list[PydanticObjectId] = Field(default_factory=list)
    waiter_rejected_by: list[PydanticObjectId] = Field(default_factory=list)
    pickup_status: str = "pending"  # pending | accepted | rejected | completed
    is_dispatched: bool = False

    class Settings:
        name = "orders"
        indexes = ["branch_id", "source", "order_status", "external_order_id"]


class OrderEvent(Document):
    """Audit log event tracking every order lifecycle action."""

    restaurant_id: PydanticObjectId
    branch_id: PydanticObjectId
    order_id: PydanticObjectId
    order_token: str
    table_number: str | None = None
    event_type: str  # ORDER_CREATED | CHEF_ACCEPTED | ORDER_READY | WAITER_PICKUP_ACCEPTED | WAITER_PICKUP_REJECTED | CASH_CONFIRMED_SERVED | CUSTOMER_SELF_PICKUP
    title: str
    description: str
    performed_by_id: PydanticObjectId | None = None
    performed_by_name: str | None = None
    performed_by_role: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "order_events"
        indexes = ["branch_id", "order_id", "created_at"]


class Payment(Document):
    order_id: PydanticObjectId
    venue_id: PydanticObjectId
    customer_handle: str
    provider: str                    # "razorpay" | "dummy" | "cod"
    provider_order_id: str | None = None
    provider_payment_id: str | None = None
    amount: float
    currency: str = "INR"
    status: str = "pending"          # pending | paid | failed | refunded
    method: str | None = None        # upi | card | netbanking | wallet | cod
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "payments"


class Counter(Document):
    """Atomic counter for auto-incrementing fields like order tokens."""
    branch_id: str
    sequence_name: str
    sequence_value: int = 0

    class Settings:
        name = "counters"
