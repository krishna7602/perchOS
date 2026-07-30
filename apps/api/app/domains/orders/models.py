from beanie import Document, PydanticObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class OrderLine(BaseModel):
    """A single line item within an order."""

    menu_item_id: PydanticObjectId
    name: str
    price: float
    quantity: int


class Order(Document):
    """A customer order placed at a venue."""

    restaurant_id: Optional[PydanticObjectId] = None  # tenant isolation
    branch_id: Optional[PydanticObjectId] = None
    venue_id: Optional[PydanticObjectId] = None  # legacy support
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
    rejected_by: list[PydanticObjectId] = Field(default_factory=list)

    class Settings:
        name = "orders"
