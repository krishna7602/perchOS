from beanie import Document
from datetime import datetime

class Restaurant(Document):
    """The root tenant representing a restaurant brand or company."""

    name: str
    owner_id: str | None = None  # Will link to the root User who created this tenant
    created_at: datetime = datetime.utcnow()
    is_active: bool = True

    class Settings:
        name = "restaurants"
