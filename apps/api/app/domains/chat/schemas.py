from pydantic import BaseModel


from app.domains.networking.models import NetworkingMode, SocialLinks

class JoinRequest(BaseModel):
    """User joining a venue chat room and onboarding to networking."""
    
    qr_token: str
    device_id: str  # Unique device identifier for session tracking
    
    # Step 1 & 2: Identity
    name: str
    display_picture: str | None = None
    
    # Step 3: Interests & Mode
    interests: list[str] = []
    mode: NetworkingMode = NetworkingMode.NETWORKING
    
    # Step 4: Professional Info
    company: str | None = None
    college: str | None = None
    job_title: str | None = None
    industry: str | None = None
    skills: list[str] = []
    professional_tags: list[str] = []
    
    # Step 5: Social Links
    social_links: SocialLinks | None = None
    
    # Step 6: Privacy
    is_visible: bool = True



class JoinResponse(BaseModel):
    """Response after successfully joining a venue room."""

    venue_id: str
    venue_name: str
    chat_token: str  # short-lived JWT scoped to this room
    handle: str
