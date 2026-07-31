from fastapi import APIRouter, HTTPException, Depends

from app.domains.auth.models import User, Role, StaffStatus
from app.domains.venues.restaurant_model import Restaurant
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.domains.auth.schemas import LoginRequest, GoogleLoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest):
    """Authenticate user with email + password, return JWT."""
    user = await User.find_one(User.email == payload.email)
    if (
        not user
        or not user.password_hash
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    restaurant_name = "Perch HQ"
    if user.restaurant_id:
        restaurant = await Restaurant.get(user.restaurant_id)
        if restaurant:
            restaurant_name = restaurant.name

    user.status = StaffStatus.AVAILABLE
    await user.save()

    claims = {
        "role": user.role.value,
        "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
        "branch_id": str(user.branch_id) if user.branch_id else None,
        "restaurant_name": restaurant_name
    }
    token = create_access_token(str(user.id), claims)
    return TokenResponse(token=token, name=user.name)


@router.post("/admin/google", response_model=TokenResponse)
async def admin_google_login(payload: GoogleLoginRequest):
    """Authenticate user via Google ID token, return JWT.

    Verifies the Google ID token issued to the Next.js NextAuth Google provider.
    Creates the user account on first login and provisions a default Restaurant.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail="google_oauth_not_configured",
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        info = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="invalid_google_token")

    email = info["email"]
    user = await User.find_one(User.email == email)
    if not user:
        user = User(
            email=email,
            name=info.get("name", email),
            google_id=info["sub"],
            role=Role.OWNER
        )
        await user.insert()
        
        # Provision default restaurant for new owner
        restaurant = Restaurant(
            name=f"{user.name}'s Restaurant",
            owner_id=str(user.id)
        )
        await restaurant.insert()
        
        user.restaurant_id = restaurant.id

    user.status = StaffStatus.AVAILABLE
    await user.save()

    claims = {
        "role": user.role.value,
        "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
        "branch_id": str(user.branch_id) if user.branch_id else None,
    }
    token = create_access_token(str(user.id), claims)
    return TokenResponse(token=token, name=user.name)

from app.deps import get_current_user

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Fetch current user's profile and status."""
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status
    }
