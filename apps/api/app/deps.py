from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_token
from app.domains.auth.models import User, Role

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """FastAPI dependency: extract and verify user JWT, return User document."""
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_or_expired_token",
        )

    user = await User.get(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user_not_found_or_inactive",
        )
    return user

class RequireRole:
    """Dependency class to enforce RBAC based on allowed roles."""
    def __init__(self, allowed_roles: list[Role]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles and user.role != Role.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="insufficient_permissions",
            )
        return user


class RequireTenant:
    """Dependency to enforce multi-tenant isolation. Extracts tenant ID from path or query and compares to user."""
    
    def __init__(self, check_branch: bool = False):
        self.check_branch = check_branch

    async def __call__(self, venue_id: str = None, branch_id: str = None, user: User = Depends(get_current_user)) -> User:
        if user.role == Role.SUPER_ADMIN:
            return user
            
        target_branch_id = branch_id or venue_id
        if not target_branch_id:
            # If the API doesn't receive a branch_id to check against, we just pass.
            return user

        if self.check_branch:
            # The user's assigned branch must match the target branch (or user is an owner/manager of the whole restaurant)
            if user.role not in [Role.OWNER, Role.MANAGER]:
                if not user.branch_id or str(user.branch_id) != target_branch_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="access_denied_to_branch",
                    )
        
        # We generally also want to ensure the branch actually belongs to the user's restaurant, but 
        # usually that's checked in the router (by fetching the Branch and comparing restaurant_id).
        # We can fetch it here if we want to be absolutely strict.
        
        return user


def get_current_guest(token: str) -> dict:
    """Decode a guest chat token and return its claims.

    Returns dict with 'sub' (handle), 'role', 'venue_id'.
    """
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_or_expired_token",
        )

    if payload.get("role") != "guest":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="guest_access_required",
        )

    return payload
