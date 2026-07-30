import os
import base64
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings


@dataclass
class EncryptedValue:
    """Container for AES-256-GCM encrypted data."""

    ciphertext: str  # base64-encoded
    iv: str  # base64-encoded
    tag: str  # AESGCM appends tag to ct; kept separate for future KMS migration


def encrypt_wifi_password(plaintext: str) -> EncryptedValue:
    """Encrypt a WiFi password with AES-256-GCM.

    The key is a 32-byte value stored as hex in the WIFI_ENCRYPTION_KEY env var.
    """
    key = bytes.fromhex(settings.WIFI_ENCRYPTION_KEY)
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, plaintext.encode(), None)
    return EncryptedValue(
        ciphertext=base64.b64encode(ct).decode(),
        iv=base64.b64encode(iv).decode(),
        tag="",  # AESGCM appends the tag to ct; separate field for future KMS migration
    )


def decrypt_wifi_password(enc: EncryptedValue) -> str:
    """Decrypt a WiFi password from AES-256-GCM ciphertext."""
    key = bytes.fromhex(settings.WIFI_ENCRYPTION_KEY)
    aesgcm = AESGCM(key)
    iv = base64.b64decode(enc.iv)
    ct = base64.b64decode(enc.ciphertext)
    return aesgcm.decrypt(iv, ct, None).decode()
