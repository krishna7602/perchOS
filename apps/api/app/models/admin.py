from beanie import Document
from pydantic import EmailStr
from datetime import datetime


class Admin(Document):
    """Admin user — venue owner or superadmin."""

    email: EmailStr
    password_hash: str | None = None  # None if account is Google-only
    google_id: str | None = None
    name: str
    restaurant_name: str | None = None
    phone: str | None = None
    is_superadmin: bool = False
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "admins"
