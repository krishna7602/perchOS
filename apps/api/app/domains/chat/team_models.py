from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime

class TeamChannel(Document):
    """A chat channel for a specific branch."""
    name: str
    description: str | None = None
    is_public: bool = False
    members: list[PydanticObjectId] = Field(default_factory=list)
    branch_id: PydanticObjectId
    restaurant_id: PydanticObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "team_channels"
        indexes = ["branch_id"]

class TeamMessage(Document):
    """A message sent in a team channel."""
    channel_id: PydanticObjectId
    sender_id: PydanticObjectId
    sender_name: str
    sender_role: str = ""
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "team_messages"
        indexes = ["channel_id", "created_at"]

class SendMessageRequest(BaseModel):
    content: str
