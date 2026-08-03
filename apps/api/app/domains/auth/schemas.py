from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Admin email/password login."""

    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    """Admin Google OAuth login — sends the Google ID token for server-side verification."""

    id_token: str


class TokenResponse(BaseModel):
    """JWT token response."""

    token: str
    name: str


class CreateStaffRequest(BaseModel):
    """Payload to create a new staff member."""
    
    name: str
    phone: str | None = None
    role: str
    branch_id: str
    employee_id: str | None = None


class StaffStatusUpdate(BaseModel):
    """Payload to update staff status."""
    status: str


class CustomerLoginRequest(BaseModel):
    provider: str
    credential: str
    venue_qr_token: str | None = None


class CustomerLoginResponse(BaseModel):
    token: str
    name: str
    username: str
    onboarding_completed: bool
    profile_photo: str | None = None
    email: str | None = None
    venue_id: str | None = None
    venue_name: str | None = None


class CustomerOnboardingRequest(BaseModel):
    headline: str | None = None
    company: str | None = None
    college: str | None = None
    interests: list[str] = []
    professional_tags: list[str] = []
    networking_mode: str = "Networking"
    social_links: dict | None = None

