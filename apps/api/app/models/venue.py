from beanie import Document, PydanticObjectId
from datetime import datetime


class Venue(Document):
    """A physical venue (cafe, restaurant) with QR tokens and optional WiFi."""

    owner_id: PydanticObjectId
    name: str
    lat: float
    lng: float
    wifi_ssid: str | None = None
    wifi_password_encrypted: str | None = None  # AES-256-GCM ciphertext
    wifi_password_iv: str | None = None
    wifi_password_tag: str | None = None
    qr_token: str  # opaque, rotatable, embedded in join QR
    menu_qr_token: str  # separate token for the menu QR
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "venues"
