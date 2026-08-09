from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId
from pydantic import BaseModel
import string
import secrets
import re

from app.domains.auth.models import User, Role
from app.domains.auth.schemas import CreateStaffRequest
from app.domains.venues.branch_model import Branch
from app.deps import get_current_user, RequireRole
from app.core.security import hash_password

router = APIRouter(prefix="/admin/staff", tags=["staff"])
require_owner_or_manager = RequireRole([Role.OWNER, Role.MANAGER])

def generate_username(base_name: str, branch_name: str) -> str:
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', base_name).lower()
    clean_branch = re.sub(r'[^a-zA-Z0-9]', '', branch_name).lower()
    return f"{clean_name}_{clean_branch}@perch.store"

def generate_password() -> str:
    alphabet = string.ascii_letters + string.digits
    pwd = "".join(secrets.choice(alphabet) for _ in range(6))
    return pwd + "@12"

@router.post("")
async def create_staff(
    payload: CreateStaffRequest,
    user: User = Depends(require_owner_or_manager)
):
    """Create a new staff member (Tenant Isolated)."""
    try:
        branch_id = PydanticObjectId(payload.branch_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_branch_id")
        
    branch = await Branch.get(branch_id)
    if not branch or branch.restaurant_id != user.restaurant_id:
        raise HTTPException(status_code=404, detail="branch_not_found")
        
    try:
        role = Role(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_role")
        
    if role in [Role.SUPER_ADMIN, Role.OWNER]:
        raise HTTPException(status_code=403, detail="cannot_create_owner_or_admin")

    base_email = generate_username(payload.name, branch.name)
    final_email = base_email
    counter = 2
    while await User.find_one(User.email == final_email):
        final_email = base_email.replace("@", f"_{counter}@")
        counter += 1
        
    temp_password = generate_password()
    password_hash = hash_password(temp_password)
    
    new_staff = User(
        email=final_email,
        password_hash=password_hash,
        name=payload.name,
        phone=payload.phone,
        employee_id=payload.employee_id,
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        role=role,
        force_password_change=True,
    )
    
    await new_staff.insert()
    
    return {
        "status": "success",
        "staff": {
            "id": str(new_staff.id),
            "name": new_staff.name,
            "email": new_staff.email,
            "role": new_staff.role,
        },
        "credentials": {
            "username": final_email,
            "temporary_password": temp_password
        }
    }

@router.get("")
async def list_staff(
    branch_id: str | None = None,
    user: User = Depends(require_owner_or_manager)
):
    """List staff for a specific branch, or all if Owner."""
    query = {"restaurant_id": user.restaurant_id}
    
    if branch_id:
        query["branch_id"] = PydanticObjectId(branch_id)
    elif user.role == Role.MANAGER and user.branch_id:
        query["branch_id"] = user.branch_id
        
    staff_members = await User.find(query).to_list()
    
    return {
        "staff": [
            {
                "id": str(s.id),
                "name": s.name,
                "email": s.email,
                "role": s.role,
                "status": s.status,
                "branch_id": str(s.branch_id) if s.branch_id else None,
                "employee_id": s.employee_id,
            }
            for s in staff_members
            if s.role not in [Role.SUPER_ADMIN, Role.OWNER]
        ]
    }

from app.domains.auth.models import StaffStatus
from app.domains.auth.schemas import StaffStatusUpdate

@router.patch("/{user_id}/status")
async def update_staff_status(
    user_id: str,
    payload: StaffStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a staff member's presence status. Staff can update their own, Managers can update their staff."""
    target_user = await User.get(PydanticObjectId(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="staff_not_found")
        
    # Permission check: Self, or Owner/Manager of same restaurant
    if str(current_user.id) != user_id:
        if current_user.role not in [Role.OWNER, Role.MANAGER] or current_user.restaurant_id != target_user.restaurant_id:
            raise HTTPException(status_code=403, detail="not_authorized")
            
    try:
        new_status = StaffStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_status")
        
    target_user.status = new_status
    await target_user.save()
    
    return {"status": "success", "new_status": new_status.value}
from app.domains.auth.models import Attendance
from app.domains.orders.models import Order
from datetime import datetime, timedelta

@router.get("/{user_id}/analytics")
async def get_staff_analytics(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get performance analytics for a specific staff member."""
    target_user = await User.get(PydanticObjectId(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="staff_not_found")
        
    # Permission check: Self, or Owner/Manager of same restaurant
    if str(current_user.id) != user_id:
        if current_user.role not in [Role.OWNER, Role.MANAGER] or current_user.restaurant_id != target_user.restaurant_id:
            raise HTTPException(status_code=403, detail="not_authorized")

    # 1. Calculate Working Hours (Last 7 Days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    attendances = await Attendance.find(
        Attendance.user_id == PydanticObjectId(user_id),
        Attendance.clock_in >= week_ago
    ).to_list()
    
    total_minutes = 0
    for att in attendances:
        end_time = att.clock_out if att.clock_out else datetime.utcnow()
        duration = end_time - att.clock_in
        minutes = int(duration.total_seconds() / 60) - att.break_duration_minutes
        total_minutes += max(0, minutes)
        
    hours_logged = round(total_minutes / 60.0, 1)

    # 2. Chef & Waiter Performance Stats (Last 7 Days)
    from beanie.operators import In
    chef_orders = await Order.find(
        Order.assigned_chef_id == PydanticObjectId(user_id),
        Order.created_at >= week_ago,
        In(Order.order_status, ["ready", "served"])
    ).to_list()
    
    orders_prepared = len(chef_orders)
    avg_prep_time_mins = 0
    if orders_prepared > 0:
        total_prep_seconds = sum(
            (o.completed_at - o.created_at).total_seconds() 
            for o in chef_orders 
            if o.completed_at
        )
        avg_prep_time_mins = round((total_prep_seconds / orders_prepared) / 60.0, 1)

    waiter_orders = await Order.find(
        Order.assigned_waiter_id == PydanticObjectId(user_id),
        Order.created_at >= week_ago,
        Order.order_status == "served"
    ).to_list()

    orders_delivered = len(waiter_orders)
    cash_collected = sum(o.total for o in waiter_orders if o.payment_method == "cod" and o.payment_status == "paid")
    avg_delivery_time_mins = 0
    if orders_delivered > 0:
        total_deliv_seconds = sum(
            (o.completed_at - o.created_at).total_seconds()
            for o in waiter_orders
            if o.completed_at
        )
        avg_delivery_time_mins = round((total_deliv_seconds / orders_delivered) / 60.0, 1)

    return {
        "status": "success",
        "data": {
            "hours_logged": hours_logged,
            "orders_prepared": orders_prepared,
            "avg_prep_time_mins": avg_prep_time_mins,
            "orders_delivered": orders_delivered,
            "cash_collected": round(cash_collected, 2),
            "avg_delivery_time_mins": avg_delivery_time_mins
        }
    }

class UpdateStaffRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    branch_id: str | None = None
    phone: str | None = None

@router.patch("/{user_id}")
async def update_staff(
    user_id: str,
    payload: UpdateStaffRequest,
    current_user: User = Depends(get_current_user)
):
    """Update a staff member's details."""
    target_user = await User.get(PydanticObjectId(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="staff_not_found")
        
    if current_user.role not in [Role.OWNER, Role.MANAGER] or current_user.restaurant_id != target_user.restaurant_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    if payload.name:
        target_user.name = payload.name
    if payload.role:
        target_user.role = Role(payload.role)
    if payload.branch_id:
        target_user.branch_id = PydanticObjectId(payload.branch_id)
        
    await target_user.save()
    return {"status": "success", "message": "Staff updated"}

@router.delete("/{user_id}")
async def delete_staff(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a staff member."""
    target_user = await User.get(PydanticObjectId(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="staff_not_found")
        
    if current_user.role not in [Role.OWNER, Role.MANAGER] or current_user.restaurant_id != target_user.restaurant_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    await target_user.delete()
    return {"status": "success", "message": "Staff deleted"}

@router.post("/{user_id}/reset-password")
async def reset_staff_password(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reset a staff member's password."""
    target_user = await User.get(PydanticObjectId(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="staff_not_found")
        
    if current_user.role not in [Role.OWNER, Role.MANAGER] or current_user.restaurant_id != target_user.restaurant_id:
        raise HTTPException(status_code=403, detail="not_authorized")
        
    import secrets
    temp_password = secrets.token_urlsafe(6)
    
    from app.core.security import hash_password
    target_user.password_hash = hash_password(temp_password)
    target_user.is_active = True
    await target_user.save()
    
    return {
        "status": "success",
        "new_password": temp_password,
        "email": target_user.email
    }
