import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta

from app.core.config import settings


def hash_password(raw: str) -> str:
    """Hash a plaintext password with bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(raw.encode('utf-8'), salt).decode('utf-8')


def verify_password(raw: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(raw.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False


def create_access_token(
    subject: str,
    extra: dict | None = None,
    expires_minutes: int = 60 * 12,
) -> str:
    """Create a HS256 JWT with subject, extra claims, and expiry."""
    payload = {
        **(extra or {}),
        "sub": subject,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and verify a HS256 JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
