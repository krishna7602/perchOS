from beanie import Document
from datetime import datetime

class Restaurant(Document):
    """The root tenant representing a restaurant brand or company."""

    name: str
    owner_id: str | None = None  # Will link to the root User who created this tenant
    created_at: datetime = datetime.utcnow()
    is_active: bool = True
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None
    gst_number: str | None = None
    allow_cod: bool = True
    allow_online_payment: bool = True

    class Settings:
        name = "restaurants"
