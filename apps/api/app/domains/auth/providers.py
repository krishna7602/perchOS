from abc import ABC, abstractmethod
from typing import Any, Dict
from fastapi import HTTPException, status
from app.core.config import settings


class AuthProvider(ABC):
    """Abstract base class for modular authentication providers."""

    @abstractmethod
    async def authenticate(self, credential: str) -> Dict[str, Any]:
        """Verify the credential and return verified profile information:
        
        {
            "uid": str,
            "email": str,
            "email_verified": bool,
            "name": str,
            "profile_picture": str | None
        }
        """
        pass


class GoogleAuthProvider(AuthProvider):
    """Google OAuth provider verifying ID tokens."""

    async def authenticate(self, credential: str) -> Dict[str, Any]:
        # Dev bypass/mock flow for testing in offline/mock environment
        if (
            credential.startswith("mock_")
            or (settings.ENVIRONMENT == "development" and not settings.GOOGLE_CLIENT_ID)
        ):
            # Parse dummy data from mock token or return standard dev user info
            # Format: mock_{anything}_{email_username}
            # The full credential (minus "mock_" prefix) is used as a stable google_id
            # to ensure each mock token creates a distinct account
            raw = credential[5:] if credential.startswith("mock_") else credential
            parts = raw.rsplit("_", 1)  # split from right to get username as last part
            google_id = f"mock_{raw}"  # full token as unique ID
            username = parts[-1] if parts else "john.doe"
            email = f"{username}@gmail.com"
            name = username.replace(".", " ").title()
            
            return {
                "uid": google_id,
                "email": email,
                "email_verified": True,
                "name": name,
                "profile_picture": f"https://api.dicebear.com/7.x/adventurer/svg?seed={username}"
            }

        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="google_oauth_not_configured"
            )

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            return {
                "uid": info["sub"],
                "email": info["email"],
                "email_verified": info.get("email_verified", False),
                "name": info.get("name", info["email"]),
                "profile_picture": info.get("picture")
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"invalid_google_token: {str(e)}"
            )


# Factory/Registry for future extensibility (Apple, Microsoft, etc.)
PROVIDERS: Dict[str, AuthProvider] = {
    "google": GoogleAuthProvider()
}


def get_auth_provider(name: str) -> AuthProvider:
    if name not in PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported auth provider: {name}"
        )
    return PROVIDERS[name]
