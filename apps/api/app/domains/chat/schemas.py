from pydantic import BaseModel


class JoinRequest(BaseModel):
    """User joining a venue chat room."""

    qr_token: str
    display_name: str | None = None
    is_anonymous: bool = False


class JoinResponse(BaseModel):
    """Response after successfully joining a venue room."""

    venue_id: str
    venue_name: str
    chat_token: str  # short-lived JWT scoped to this room
    handle: str
