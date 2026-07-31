from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any

from app.core.config import settings
from app.deps import get_current_user
from app.domains.auth.models import User
from app.domains.notifications.models import PushSubscription

router = APIRouter()

class SubscriptionRequest(BaseModel):
    endpoint: str
    keys: Dict[str, str]

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe_to_push(
    sub_data: SubscriptionRequest,
    user: User = Depends(get_current_user)
):
    handle = str(user.id)
    branch_id = str(user.branch_id) if user.branch_id else None

    # Check if exists
    existing = await PushSubscription.find_one(PushSubscription.endpoint == sub_data.endpoint)
    if existing:
        existing.user_handle = handle
        existing.branch_id = branch_id
        existing.keys = sub_data.keys
        await existing.save()
    else:
        new_sub = PushSubscription(
            user_handle=handle,
            branch_id=branch_id,
            endpoint=sub_data.endpoint,
            keys=sub_data.keys
        )
        await new_sub.insert()

    return {"status": "ok"}
