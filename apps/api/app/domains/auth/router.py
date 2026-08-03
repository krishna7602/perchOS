from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.domains.auth.models import User, Role, StaffStatus
from app.domains.venues.restaurant_model import Restaurant
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.domains.auth.schemas import LoginRequest, GoogleLoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleCodeExchangeRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/google/exchange")
async def exchange_google_code(payload: GoogleCodeExchangeRequest):
    """Exchange Google OAuth authorization code for an ID token.

    The frontend opens a popup to Google's consent screen which redirects back
    with an auth code. This endpoint exchanges that code for tokens server-side
    (keeping the client secret secure) and returns the id_token to the frontend.
    """
    import httpx

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="google_oauth_not_configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": payload.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": payload.redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if resp.status_code != 200:
        detail = "google_token_exchange_failed"
        try:
            body = resp.json()
            detail = body.get("error_description", body.get("error", detail))
        except Exception:
            pass
        raise HTTPException(status_code=401, detail=detail)

    tokens = resp.json()
    id_token_value = tokens.get("id_token")
    if not id_token_value:
        raise HTTPException(status_code=401, detail="no_id_token_in_response")

    return {"id_token": id_token_value}


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
from app.domains.auth.providers import get_auth_provider
from app.domains.networking.models import (
    CustomerAccount, CustomerProfile, SocialLink, VenueSession, NetworkingMode
)
from app.domains.venues.branch_model import Branch
from app.domains.auth.schemas import CustomerLoginRequest, CustomerLoginResponse, CustomerOnboardingRequest
from app.deps import get_current_customer
import re
import uuid
from datetime import datetime

async def generate_unique_username(display_name: str) -> str:
    clean_name = re.sub(r'[^a-zA-Z0-9_]', '', display_name.lower().replace(' ', ''))
    if not clean_name:
        clean_name = "user"
    base_username = clean_name[:25]
    username = base_username
    counter = 2
    while True:
        existing = await CustomerProfile.find_one(CustomerProfile.username == username)
        if not existing:
            return username
        suffix = str(counter)
        username = base_username[:30 - len(suffix)] + suffix
        counter += 1

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

@router.post("/customer/login", response_model=CustomerLoginResponse)
async def customer_login(payload: CustomerLoginRequest):
    """Authenticate customer via OAuth provider (Google), return JWT and status."""
    provider = get_auth_provider(payload.provider)
    user_info = await provider.authenticate(payload.credential)

    # 1. Check/create CustomerAccount
    account = await CustomerAccount.find_one(CustomerAccount.google_id == user_info["uid"])
    if not account:
        account = CustomerAccount(
            google_id=user_info["uid"],
            email=user_info["email"],
            email_verified=user_info["email_verified"],
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        await account.insert()
    else:
        account.last_login = datetime.utcnow()
        await account.save()

    # 2. Check/create CustomerProfile
    profile = await CustomerProfile.find_one(CustomerProfile.account_id == account.id)
    if not profile:
        username = await generate_unique_username(user_info["name"])
        profile = CustomerProfile(
            account_id=account.id, # type: ignore
            uuid=str(uuid.uuid4()),
            username=username,
            display_name=user_info["name"],
            email=user_info["email"],
            profile_photo=user_info["profile_picture"],
            networking_mode=NetworkingMode.NETWORKING,
            is_visible=True,
            onboarding_completed=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_active=datetime.utcnow()
        )
        await profile.insert()
    else:
        profile.last_active = datetime.utcnow()
        await profile.save()

    # 3. Handle QR Token joining if provided
    venue_id_str = None
    venue_name = None
    if payload.venue_qr_token:
        branch = await Branch.find_one({
            "$or": [
                {"qr_token": payload.venue_qr_token},
                {"menu_qr_token": payload.venue_qr_token}
            ]
        })
        if branch:
            venue_id_str = str(branch.id)
            venue_name = branch.name
            profile.current_venue_id = branch.id
            
            # Update recent visits
            if not profile.recent_visits or profile.recent_visits[-1] != branch.id:
                profile.recent_visits.append(branch.id)
                if len(profile.recent_visits) > 10:
                    profile.recent_visits.pop(0)
            await profile.save()

            # Record VenueSession
            session_rec = VenueSession(
                user_id=profile.id, # type: ignore
                venue_id=branch.id,
                joined_at=datetime.utcnow(),
                last_active=datetime.utcnow(),
                is_active=True
            )
            await session_rec.insert()

    # 4. Create JWT Token (role: "guest", profile_id)
    token = create_access_token(
        profile.display_name,
        {
            "role": "guest",
            "venue_id": venue_id_str,
            "profile_id": str(profile.id)
        },
        expires_minutes=180
    )

    return CustomerLoginResponse(
        token=token,
        name=profile.display_name,
        username=profile.username,
        onboarding_completed=profile.onboarding_completed,
        profile_photo=profile.profile_photo,
        venue_id=venue_id_str,
        venue_name=venue_name
    )

@router.post("/customer/onboarding")
async def customer_onboarding(
    payload: CustomerOnboardingRequest,
    customer: CustomerProfile = Depends(get_current_customer)
):
    """Complete lightweight onboarding for first-time customer login."""
    customer.headline = payload.headline
    customer.company = payload.company
    customer.college = payload.college
    
    # Allow maximum 3 interests
    customer.interests = payload.interests[:3]
    customer.professional_tags = payload.professional_tags
    
    # Parse Networking Goal
    try:
        customer.networking_mode = NetworkingMode(payload.networking_mode)
    except ValueError:
        customer.networking_mode = NetworkingMode.NETWORKING

    customer.onboarding_completed = True
    customer.updated_at = datetime.utcnow()
    await customer.save()

    # Handle social links
    if payload.social_links:
        # Upsert SocialLink document
        sl = await SocialLink.find_one(SocialLink.user_id == customer.id)
        
        cleaned_links = {
            k: (v.strip() if isinstance(v, str) and v.strip() else None)
            for k, v in payload.social_links.items()
        }

        if not sl:
            sl = SocialLink(
                user_id=customer.id, # type: ignore
                linkedin=cleaned_links.get("linkedin"),
                instagram=cleaned_links.get("instagram"),
                github=cleaned_links.get("github"),
                portfolio=cleaned_links.get("portfolio"),
                website=cleaned_links.get("website")
            )
            await sl.insert()
        else:
            sl.linkedin = cleaned_links.get("linkedin", sl.linkedin)
            sl.instagram = cleaned_links.get("instagram", sl.instagram)
            sl.github = cleaned_links.get("github", sl.github)
            sl.portfolio = cleaned_links.get("portfolio", sl.portfolio)
            sl.website = cleaned_links.get("website", sl.website)
            await sl.save()

    return {"status": "success", "profile": customer}

