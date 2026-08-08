from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.deps import get_current_customer
from app.domains.networking.models import CustomerProfile, ConnectionRequest, Connection, WaveStatus

router = APIRouter(prefix="/connections", tags=["networking_connections"])


class WaveRequest(BaseModel):
    receiver_id: PydanticObjectId


@router.post("/wave")
async def send_wave(
    payload: WaveRequest,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Send a Wave to another customer."""
    if not customer.current_venue_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="must_be_in_venue_to_network"
        )
        
    receiver = await CustomerProfile.get(payload.receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="receiver_not_found")
        
    if receiver.current_venue_id != customer.current_venue_id:
        raise HTTPException(status_code=400, detail="receiver_not_in_same_venue")

    # Check if existing request
    existing = await ConnectionRequest.find_one({
        "$or": [
            {"sender_id": customer.id, "receiver_id": payload.receiver_id},
            {"sender_id": payload.receiver_id, "receiver_id": customer.id}
        ]
    })
    
    if existing:
        return {"status": "already_exists", "wave_id": str(existing.id)}

    wave = ConnectionRequest(
        sender_id=customer.id, # type: ignore
        receiver_id=payload.receiver_id,
        venue_id=customer.current_venue_id
    )
    await wave.insert()

    # Real-time notification via WebSocket
    try:
        from app.domains.chat.manager import chat_manager
        await chat_manager.unicast(
            str(customer.current_venue_id),
            receiver.display_name,
            {
                "type": "wave_notification",
                "wave_id": str(wave.id),
                "sender_id": str(customer.id),
                "sender_name": customer.display_name,
                "sender_photo": customer.profile_photo,
            }
        )
    except Exception as e:
        print("Error sending WS wave notification:", e)
    
    return {"status": "sent", "wave_id": str(wave.id)}


@router.post("/wave/{wave_id}/accept")
async def accept_wave(
    wave_id: PydanticObjectId,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Accept a pending Wave request."""
    wave = await ConnectionRequest.get(wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="wave_not_found")
        
    if wave.receiver_id != customer.id:
        raise HTTPException(status_code=403, detail="not_authorized")

    # Idempotency check: if already accepted, return existing connection
    if wave.status == WaveStatus.ACCEPTED:
        existing_conn = await Connection.find_one({
            "$or": [
                {"user_a": wave.sender_id, "user_b": wave.receiver_id},
                {"user_a": wave.receiver_id, "user_b": wave.sender_id}
            ]
        })
        conn_id = str(existing_conn.id) if existing_conn else None
        return {"status": "accepted", "connection_id": conn_id}
        
    if wave.status != WaveStatus.PENDING:
        raise HTTPException(status_code=400, detail="wave_not_pending")
        
    wave.status = WaveStatus.ACCEPTED
    await wave.save()
    
    # Create the actual connection
    connection = Connection(
        user_a=wave.sender_id,
        user_b=wave.receiver_id,
        venue_id=wave.venue_id
    )
    await connection.insert()
    
    # Realtime push notification to BOTH sides
    sender = await CustomerProfile.get(wave.sender_id)
    sender_handle = sender.display_name if sender else ""
    receiver_handle = customer.display_name

    from app.domains.chat.manager import chat_manager
    if sender_handle:
        await chat_manager.push_event(sender_handle, "wave_accepted", {"request_id": str(wave_id), "by": receiver_handle})
    if receiver_handle:
        await chat_manager.push_event(receiver_handle, "wave_accepted", {"request_id": str(wave_id), "by": receiver_handle})

    return {"status": "accepted", "connection_id": str(connection.id)}



@router.post("/wave/{wave_id}/ignore")
async def ignore_wave(
    wave_id: PydanticObjectId,
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Ignore a pending Wave request."""
    wave = await ConnectionRequest.get(wave_id)
    if not wave or wave.receiver_id != customer.id:
        raise HTTPException(status_code=404, detail="wave_not_found")
        
    wave.status = WaveStatus.IGNORED
    await wave.save()
    
    return {"status": "ignored"}


@router.get("/")
async def get_my_connections(customer: CustomerProfile = Depends(get_current_customer)):
    """Get list of active connections for the current user."""
    connections = await Connection.find(
        {"$or": [{"user_a": customer.id}, {"user_b": customer.id}]}
    ).to_list()
    
    # Hydrate with profile info
    results = []
    for conn in connections:
        other_user_id = conn.user_a if conn.user_a != customer.id else conn.user_b
        other_profile = await CustomerProfile.get(other_user_id)
        if other_profile:
            results.append({
                "connection_id": str(conn.id),
                "user": {
                    "id": str(other_profile.id),
                    "name": other_profile.name,
                    "display_picture": other_profile.display_picture,
                    "headline": other_profile.headline,
                },
                "venue_id": str(conn.venue_id),
                "created_at": conn.created_at
            })
            
    return results


@router.get("/pending")
async def get_pending_waves(customer: CustomerProfile = Depends(get_current_customer)):
    """Get list of incoming pending wave requests for the current user."""
    waves = await ConnectionRequest.find({
        "receiver_id": customer.id,
        "status": WaveStatus.PENDING
    }).to_list()
    
    results = []
    for w in waves:
        sender = await CustomerProfile.get(w.sender_id)
        if sender:
            results.append({
                "wave_id": str(w.id),
                "sender_id": str(sender.id),
                "sender_name": sender.display_name,
                "sender_photo": sender.profile_photo,
                "created_at": w.created_at
            })
    return results
