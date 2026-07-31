from beanie import Document, PydanticObjectId, Indexed
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class NetworkingMode(str, Enum):
    NETWORKING = "Networking"
    PROFESSIONAL = "Professional"
    SOCIAL = "Social"
    STUDY = "Study"
    DATING = "Dating"
    BUSINESS = "Business"
    FRIENDS = "Friends"
    HIDDEN = "Hidden"


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


class CustomerProfile(Document):
    """The networking profile for a customer."""
    # Identity
    device_id: Indexed(str)  # type: ignore # Used instead of OTP for Phase 1 to track unique sessions
    
    # Basic Info
    name: str
    display_picture: str | None = None
    headline: str | None = None
    bio: str | None = None
    
    # Professional
    company: str | None = None
    college: str | None = None
    job_title: str | None = None
    industry: str | None = None
    professional_tags: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    
    # Social / Interests
    interests: list[str] = Field(default_factory=list)
    social_tags: list[str] = Field(default_factory=list)
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    
    # Networking & Privacy
    mode: NetworkingMode = NetworkingMode.NETWORKING
    is_visible: bool = True
    
    # Location context (updated when joining a room)
    current_venue_id: PydanticObjectId | None = None
    last_active: datetime = Field(default_factory=datetime.utcnow)
    
    # Analytics / Future
    recent_visits: list[PydanticObjectId] = Field(default_factory=list)
    badges: list[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "customer_profiles"
        indexes = ["device_id", "current_venue_id", "mode", "is_visible"]


class WaveStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    IGNORED = "IGNORED"


class ConnectionRequest(Document):
    """A 'Wave' sent from one customer to another."""
    sender_id: PydanticObjectId
    receiver_id: Indexed(PydanticObjectId) # type: ignore
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

