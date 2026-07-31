from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4
from beanie import PydanticObjectId

from app.domains.venues.branch_model import Branch
from app.domains.auth.models import User, Role
from app.services.qr_service import (
    generate_join_qr,
    generate_menu_qr,
    generate_wifi_native_qr,
)
from app.services.encryption_service import (
    encrypt_wifi_password,
    decrypt_wifi_password,
    EncryptedValue,
)
from app.domains.venues.schemas import VenueCreateRequest, VenueUpdateRequest, VenuePublicResponse
from app.deps import get_current_user, RequireRole

router = APIRouter(tags=["branches"])
require_owner = RequireRole([Role.OWNER])
require_manager = RequireRole([Role.OWNER, Role.MANAGER])

@router.post("/admin/venues")
async def create_branch(payload: VenueCreateRequest, user: User = Depends(require_owner)):
    """Create a new branch and generate QR codes. (Owner only)"""
    if not user.restaurant_id:
        raise HTTPException(status_code=400, detail="user_has_no_restaurant")

    enc = encrypt_wifi_password(payload.wifi_password) if payload.wifi_password else None

    branch = Branch(
        restaurant_id=user.restaurant_id,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        wifi_ssid=payload.wifi_ssid,
        wifi_password_encrypted=enc.ciphertext if enc else None,
        wifi_password_iv=enc.iv if enc else None,
        wifi_password_tag=enc.tag if enc else None,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        gst_number=payload.gst_number,
        description=payload.description,
        logo_url=payload.logo_url,
        qr_token=str(uuid4()),
        menu_qr_token=str(uuid4()),
    )
    await branch.insert()

    result = {
        "venue": branch.model_dump(mode="json"),
        "join_qr_png_base64": generate_join_qr(branch.qr_token),
        "menu_qr_png_base64": generate_menu_qr(branch.menu_qr_token),
    }

    if payload.wifi_ssid and payload.wifi_password:
        result["wifi_qr_png_base64"] = generate_wifi_native_qr(
            payload.wifi_ssid, payload.wifi_password
        )

    return result


@router.get("/admin/venues")
async def list_branches(user: User = Depends(require_manager)):
    """List all branches for the current user's restaurant."""
    if not user.restaurant_id:
        return {"venues": []}
        
    branches = await Branch.find(Branch.restaurant_id == user.restaurant_id).to_list()
    return {"venues": [b.model_dump(mode="json") for b in branches]}


@router.get("/admin/venues/{branch_id}")
async def get_branch(branch_id: str, user: User = Depends(require_manager)):
    """Get a single branch by ID."""
    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")
    return {"venue": branch.model_dump(mode="json")}


@router.get("/admin/venues/{branch_id}/qr")
async def get_branch_qr(branch_id: str, user: User = Depends(require_manager)):
    """Get/regenerate QR codes for a branch."""
    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    result = {
        "join_qr_png_base64": generate_join_qr(branch.qr_token),
        "menu_qr_png_base64": generate_menu_qr(branch.menu_qr_token),
    }

    if branch.wifi_ssid and branch.wifi_password_encrypted:
        password = decrypt_wifi_password(
            EncryptedValue(
                ciphertext=branch.wifi_password_encrypted,
                iv=branch.wifi_password_iv or "",
                tag=branch.wifi_password_tag or "",
            )
        )
        result["wifi_qr_png_base64"] = generate_wifi_native_qr(branch.wifi_ssid, password)

    return result


@router.patch("/admin/venues/{branch_id}")
async def update_branch(branch_id: str, payload: VenueUpdateRequest, user: User = Depends(require_manager)):
    """Update a branch's details."""
    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    if payload.name is not None:
        branch.name = payload.name
    if payload.lat is not None:
        branch.lat = payload.lat
    if payload.lng is not None:
        branch.lng = payload.lng
    if payload.wifi_ssid is not None:
        branch.wifi_ssid = payload.wifi_ssid
    if payload.address is not None:
        branch.address = payload.address
    if payload.phone is not None:
        branch.phone = payload.phone
    if payload.email is not None:
        branch.email = payload.email
    if payload.gst_number is not None:
        branch.gst_number = payload.gst_number
    if payload.description is not None:
        branch.description = payload.description
    if payload.logo_url is not None:
        branch.logo_url = payload.logo_url

    if payload.wifi_password is not None:
        if payload.wifi_password == "":
            branch.wifi_password_encrypted = None
            branch.wifi_password_iv = None
            branch.wifi_password_tag = None
        else:
            enc = encrypt_wifi_password(payload.wifi_password)
            branch.wifi_password_encrypted = enc.ciphertext
            branch.wifi_password_iv = enc.iv
            branch.wifi_password_tag = enc.tag

    await branch.save()
    return {"venue": branch.model_dump(mode="json")}


@router.delete("/admin/venues/{branch_id}")
async def delete_branch(branch_id: str, user: User = Depends(require_owner)):
    """Delete a branch (Owner only)."""
    branch = await Branch.get(PydanticObjectId(branch_id))
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")

    await branch.delete()
    return {"deleted": True}


@router.get("/venues/by-qr/{qr_token}", response_model=VenuePublicResponse)
async def get_branch_by_qr(qr_token: str):
    """Public endpoint: look up a branch by its join QR token."""
    branch = await Branch.find_one(
        {"$or": [{"qr_token": qr_token}, {"menu_qr_token": qr_token}]}
    )
    if not branch:
        raise HTTPException(status_code=404, detail="invalid_qr")

    wifi_password = None
    if branch.wifi_password_encrypted and branch.wifi_password_iv:
        wifi_password = decrypt_wifi_password(
            EncryptedValue(
                ciphertext=branch.wifi_password_encrypted,
                iv=branch.wifi_password_iv,
                tag=branch.wifi_password_tag or "",
            )
        )

    return VenuePublicResponse(
        id=str(branch.id),
        name=branch.name,
        wifi_ssid=branch.wifi_ssid,
        wifi_password=wifi_password,
        address=branch.address,
        phone=branch.phone,
        email=branch.email,
        gst_number=branch.gst_number,
        description=branch.description,
        logo_url=branch.logo_url,
    )
