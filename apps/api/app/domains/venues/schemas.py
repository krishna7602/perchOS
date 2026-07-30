from pydantic import BaseModel


class VenueCreateRequest(BaseModel):
    """Create a new venue."""

    name: str
    lat: float
    lng: float
    wifi_ssid: str | None = None
    wifi_password: str | None = None  # plaintext in request, encrypted at rest
    address: str | None = None
    description: str | None = None
    logo_url: str | None = None


class VenueUpdateRequest(BaseModel):
    """Update venue details."""

    name: str | None = None
    lat: float | None = None
    lng: float | None = None
    wifi_ssid: str | None = None
    wifi_password: str | None = None
    address: str | None = None
    description: str | None = None
    logo_url: str | None = None


class VenuePublicResponse(BaseModel):
    """Public venue info returned to guests (no sensitive data)."""

    id: str
    name: str
    wifi_ssid: str | None = None
    wifi_password: str | None = None  # decrypted for display on join page
    address: str | None = None
    description: str | None = None
    logo_url: str | None = None
