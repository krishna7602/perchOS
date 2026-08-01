from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class PushSubscription(Document):
    user_handle: str = Field(index=True)
    branch_id: Optional[str] = Field(None, index=True)
    role: Optional[str] = Field(None)
    endpoint: str = Field(unique=True)
    keys: dict
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "push_subscriptions"
