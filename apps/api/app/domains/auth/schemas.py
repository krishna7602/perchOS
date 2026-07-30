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
