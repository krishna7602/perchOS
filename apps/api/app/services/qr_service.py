import qrcode
import io
import base64

from app.core.config import settings


def _qr_to_base64_png(data: str) -> str:
    """Generate a QR code and return it as a base64-encoded PNG string."""
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def generate_join_qr(qr_token: str) -> str:
    """QR that opens the chat join page.

    Uses PUBLIC_BASE_URL so it resolves correctly whether
    you're on localhost or an ngrok tunnel.
    """
    url = f"{settings.PUBLIC_BASE_URL}/join/{qr_token}"
    return _qr_to_base64_png(url)


def generate_menu_qr(menu_qr_token: str) -> str:
    """QR that opens the menu browse page for a venue."""
    url = f"{settings.PUBLIC_BASE_URL}/menu/{menu_qr_token}"
    return _qr_to_base64_png(url)


def generate_wifi_native_qr(ssid: str, password: str) -> str:
    """Optional SECOND, separate QR using the OS-native WiFi format.

    Only this format triggers an automatic 'join network' OS prompt.
    Print it alongside the join QR if you want true one-scan WiFi connect.
    """
    payload = f"WIFI:T:WPA;S:{ssid};P:{password};;"
    return _qr_to_base64_png(payload)
