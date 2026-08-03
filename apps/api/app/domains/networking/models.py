from beanie import Document, PydanticObjectId, Indexed
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid


class NetworkingMode(str, Enum):
    NETWORKING = "Networking"
    PROFESSIONAL = "Professional"
    SOCIAL = "Social"
    STUDY = "Study"
    DATING = "Dating"
    BUSINESS = "Business"
    FRIENDS = "Friends"
    HIDDEN = "Hidden"


class WaveStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    IGNORED = "IGNORED"


class CustomerAccount(Document):
    google_id: Indexed(str)  # type: ignore
    email: Indexed(str)  # type: ignore
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "customer_accounts"
        indexes = ["google_id", "email"]


class SocialLinks(BaseModel):
    linkedin: str | None = None
    instagram: str | None = None
    github: str | None = None
    portfolio: str | None = None
    website: str | None = None
    x: str | None = None
    behance: str | None = None
    dribbble: str | None = None
    leetcode: str | None = None
    codeforces: str | None = None
    medium: str | None = None
    youtube: str | None = None
    spotify: str | None = None
    discord: str | None = None


class SocialLink(Document):
    user_id: PydanticObjectId
    linkedin: str | None = None
    instagram: str | None = None
    github: str | None = None
    portfolio: str | None = None
    website: str | None = None

    class Settings:
        name = "social_links"
        indexes = ["user_id"]


class Interest(Document):
    name: Indexed(str, unique=True)  # type: ignore

    class Settings:
        name = "interests"


class ProfessionalTag(Document):
    name: Indexed(str, unique=True)  # type: ignore

    class Settings:
        name = "professional_tags"


class CustomerProfile(Document):
    """The networking profile for a customer."""
    account_id: PydanticObjectId | None = None
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field(default_factory=lambda: f"user_{str(uuid.uuid4())[:8]}")
    display_name: str = "Guest User"
    email: str | None = None
    profile_photo: str | None = None
    headline: str | None = None
    bio: str | None = None
    company: str | None = None
    college: str | None = None
    skills: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    professional_tags: list[str] = Field(default_factory=list)
    networking_mode: NetworkingMode = NetworkingMode.NETWORKING
    is_visible: bool = True
    onboarding_completed: bool = False
    
    current_venue_id: PydanticObjectId | None = None
    last_active: datetime = Field(default_factory=datetime.utcnow)
    
    recent_visits: list[PydanticObjectId] = Field(default_factory=list)
    badges: list[str] = Field(default_factory=list)
    favorite_cafes: list[PydanticObjectId] = Field(default_factory=list)
    connections: list[PydanticObjectId] = Field(default_factory=list)
    blocked_users: list[PydanticObjectId] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Legacy device_id field for compatibility with older code
    device_id: str | None = None

    class Settings:
        name = "customer_profiles"
        indexes = ["uuid", "username", "email", "current_venue_id", "networking_mode", "is_visible"]


class ConnectionRequest(Document):
    """A 'Wave' sent from one customer to another."""
    sender_id: PydanticObjectId
    receiver_id: Indexed(PydanticObjectId)  # type: ignore
    status: WaveStatus = WaveStatus.PENDING
    venue_id: PydanticObjectId
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "connection_requests"
        indexes = ["receiver_id", "sender_id", "status"]


class Connection(Document):
    """An established connection between two customers."""
    user_a: PydanticObjectId
    user_b: PydanticObjectId
    venue_id: PydanticObjectId
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "connections"
        indexes = ["user_a", "user_b"]


class DirectMessage(Document):
    """A direct message between two connected customers."""
    connection_id: PydanticObjectId
    sender_id: PydanticObjectId
    content: str
    is_read: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "direct_messages"
        indexes = ["connection_id", "created_at"]


class VenueSession(Document):
    user_id: PydanticObjectId
    venue_id: PydanticObjectId
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    class Settings:
        name = "venue_sessions"
        indexes = ["user_id", "venue_id", "is_active"]


class UserPreference(Document):
    user_id: PydanticObjectId
    notifications_enabled: bool = True
    dark_mode: bool = False

    class Settings:
        name = "user_preferences"
        indexes = ["user_id"]


class ProfileVisibility(Document):
    user_id: PydanticObjectId
    mode: str = "VISIBLE"  # VISIBLE, HIDDEN

    class Settings:
        name = "profile_visibilities"
        indexes = ["user_id"]


class UserStatus(Document):
    user_id: PydanticObjectId
    status_emoji: str = "🟢"
    status_text: str | None = None

    class Settings:
        name = "user_statuses"
        indexes = ["user_id"]


class VenueChatMessage(Document):
    venue_id: PydanticObjectId
    sender_id: PydanticObjectId
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    edited_at: datetime | None = None
    
    # Future Ready
    read_receipts: list[PydanticObjectId] = Field(default_factory=list)
    reactions: list[dict] = Field(default_factory=list)
    replies: list[dict] = Field(default_factory=list)

    class Settings:
        name = "venue_chat_messages"
        indexes = ["venue_id", "created_at"]
