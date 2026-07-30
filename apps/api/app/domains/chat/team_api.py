from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from app.domains.auth.models import User, Role
from app.deps import get_current_user
from app.domains.chat.team_models import TeamChannel, TeamMessage, SendMessageRequest
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/admin/chat", tags=["team_chat"])

@router.get("/channels")
async def list_channels(
    branch_id: str,
    user: User = Depends(get_current_user)
):
    """List team channels for a branch based on user access."""
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN] and str(user.branch_id) != branch_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    query = {"branch_id": PydanticObjectId(branch_id)}
    
    # Non-owners only see public channels or channels they're members of
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]:
        query["$or"] = [
            {"is_public": True},
            {"members": user.id}
        ]

    channels = await TeamChannel.find(query).to_list()
    
    # Auto-create "General" channel if none exist
    if not channels and "General" not in [c.name for c in channels]:
        general = TeamChannel(
            name="General",
            description="General team discussion",
            is_public=True,
            branch_id=PydanticObjectId(branch_id),
            restaurant_id=user.restaurant_id
        )
        await general.insert()
        channels.append(general)
        
    return {
        "channels": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "is_public": getattr(c, "is_public", False)
            }
            for c in channels
        ]
    }

class CreateChannelRequest(BaseModel):
    name: str
    description: str | None = None
    is_public: bool = False
    members: List[str] = []

@router.post("/channels")
async def create_channel(
    branch_id: str,
    payload: CreateChannelRequest,
    user: User = Depends(get_current_user)
):
    """Create a new team channel."""
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]:
        raise HTTPException(status_code=403, detail="only_managers_can_create_channels")
        
    channel = TeamChannel(
        name=payload.name,
        description=payload.description,
        is_public=payload.is_public,
        members=[PydanticObjectId(m) for m in payload.members if m],
        branch_id=PydanticObjectId(branch_id),
        restaurant_id=user.restaurant_id
    )
    await channel.insert()
    return {"status": "success", "channel_id": str(channel.id)}

class PatchMembersRequest(BaseModel):
    members: List[str]

@router.patch("/{channel_id}/members")
async def update_channel_members(
    channel_id: str,
    payload: PatchMembersRequest,
    user: User = Depends(get_current_user)
):
    """Update members for a private channel."""
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    channel = await TeamChannel.get(PydanticObjectId(channel_id))
    if not channel or channel.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="not_found")
        
    channel.members = [PydanticObjectId(m) for m in payload.members if m]
    await channel.save()
    return {"status": "success"}

@router.get("/{channel_id}/messages")
async def get_messages(
    channel_id: str,
    user: User = Depends(get_current_user)
):
    """Get messages for a channel."""
    channel = await TeamChannel.get(PydanticObjectId(channel_id))
    if not channel:
        raise HTTPException(status_code=404, detail="channel_not_found")
        
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN] and channel.branch_id != user.branch_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    if not getattr(channel, "is_public", False) and user.role not in [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]:
        if user.id not in getattr(channel, "members", []):
            raise HTTPException(status_code=403, detail="not_member_of_channel")
        
    messages = await TeamMessage.find(
        {"channel_id": PydanticObjectId(channel_id)}
    ).sort("created_at").to_list()
    
    return {
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "sender_name": m.sender_name,
                "sender_role": getattr(m, "sender_role", ""),
                "content": m.content,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }

@router.post("/{channel_id}/messages")
async def send_message(
    channel_id: str,
    payload: SendMessageRequest,
    user: User = Depends(get_current_user)
):
    """Send a message to a channel."""
    channel = await TeamChannel.get(PydanticObjectId(channel_id))
    if not channel:
        raise HTTPException(status_code=404, detail="channel_not_found")
        
    if user.role not in [Role.OWNER, Role.SUPER_ADMIN] and channel.branch_id != user.branch_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    if not getattr(channel, "is_public", False) and user.role not in [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]:
        if user.id not in getattr(channel, "members", []):
            raise HTTPException(status_code=403, detail="not_member_of_channel")
        
    msg = TeamMessage(
        channel_id=channel.id,
        sender_id=user.id,
        sender_name=user.name,
        sender_role=user.role.value,
        content=payload.content
    )
    await msg.insert()
    
    return {"status": "success", "message_id": str(msg.id)}
