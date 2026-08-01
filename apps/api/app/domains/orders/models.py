from beanie import Document, PydanticObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class OrderLine(BaseModel):
    """A single line item within an order."""

    menu_item_id: PydanticObjectId
    name: str
    variant_name: str | None = None
    price: float
    quantity: int


class Order(Document):
    """A customer order placed at a venue."""

    restaurant_id: Optional[PydanticObjectId] = None  # tenant isolation
    branch_id: Optional[PydanticObjectId] = None
    venue_id: Optional[PydanticObjectId] = None  # legacy support
    order_token: str | None = None  # Unique token for invoicing and tracking
    customer_handle: str  # chat display name / anon handle, no PII required
    items: list[OrderLine]
    total: float
    payment_method: str  # "dummy_card" | "cod"
    payment_status: str = "pending"  # pending | paid | failed
    order_status: str = "received"  # received | preparing | ready | served
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    
    # Workflow
    assigned_chef_id: PydanticObjectId | None = None
    assigned_waiter_id: PydanticObjectId | None = None
    rejected_by: list[PydanticObjectId] = Field(default_factory=list)

    class Settings:
        name = "orders"


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
