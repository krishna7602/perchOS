from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, Connection, DirectMessage

router = APIRouter(prefix="/direct", tags=["networking_chat"])


class DirectMessageSendRequest(BaseModel):
    content: str


class DirectMessageResponse(BaseModel):
    id: str
    connection_id: str
    sender_id: str
    content: str
    is_read: bool
    created_at: str


@router.get("/{connection_id}/messages")
async def get_direct_messages(
    connection_id: PydanticObjectId,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Fetch paginated messages for a specific connection."""
    connection = await Connection.get(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="connection_not_found")
        
    if connection.user_a != customer.id and connection.user_b != customer.id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    skip = (page - 1) * size
    
    messages = await DirectMessage.find({"connection_id": connection_id})\
        .sort("-created_at")\
        .skip(skip)\
        .limit(size)\
        .to_list()
        
    # Mark as read if the current user is not the sender
    for msg in messages:
        if msg.sender_id != customer.id and not msg.is_read:
            msg.is_read = True
            await msg.save()
            
    return {
        "messages": [
            {
                "id": str(m.id),
                "connection_id": str(m.connection_id),
                "sender_id": str(m.sender_id),
                "content": m.content,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat()
            } for m in messages
        ]
    }


@router.post("/{connection_id}/messages")
async def send_direct_message(
    connection_id: PydanticObjectId,
    payload: DirectMessageSendRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Send a message to a connected user."""
    connection = await Connection.get(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="connection_not_found")
        
    if connection.user_a != customer.id and connection.user_b != customer.id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="content_cannot_be_empty")
        
    msg = DirectMessage(
        connection_id=connection_id,
        sender_id=customer.id, # type: ignore
        content=payload.content.strip()
    )
    await msg.insert()
    
    return {
        "id": str(msg.id),
        "connection_id": str(msg.connection_id),
        "sender_id": str(msg.sender_id),
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat()
    }
