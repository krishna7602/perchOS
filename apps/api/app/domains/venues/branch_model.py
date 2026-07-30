from beanie import Document, PydanticObjectId
from datetime import datetime

class Branch(Document):
    """A physical venue/location (branch) belonging to a Restaurant tenant."""

    restaurant_id: PydanticObjectId
    name: str
    lat: float | None = None
    lng: float | None = None
    
    address: str | None = None
    description: str | None = None
    logo_url: str | None = None
    
    wifi_ssid: str | None = None
    wifi_password_encrypted: str | None = None  # AES-256-GCM ciphertext
    wifi_password_iv: str | None = None
    wifi_password_tag: str | None = None
    
    qr_token: str  # opaque, rotatable, embedded in join QR
    menu_qr_token: str  # separate token for the menu QR
    
    created_at: datetime = datetime.utcnow()
    is_active: bool = True

    class Settings:
        name = "branches"
