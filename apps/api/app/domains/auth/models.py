from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from datetime import datetime
from enum import Enum


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    MANAGER = "manager"
    CHEF = "chef"
    WAITER = "waiter"
    CASHIER = "cashier"
    KITCHEN_STAFF = "kitchen_staff"
    INVENTORY_MANAGER = "inventory_manager"
    CLEANER = "cleaner"
    RECEPTION = "reception"
    DELIVERY_STAFF = "delivery_staff"


class StaffStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    BREAK = "BREAK"
    OFFLINE = "OFFLINE"
    PREPARING = "PREPARING"
    DELIVERING = "DELIVERING"
    CLEANING = "CLEANING"
    INVENTORY = "INVENTORY"
    NEED_HELP = "NEED_HELP"

class User(Document):
    """A user in the system with RBAC (Staff, Manager, Owner)."""

    email: EmailStr
    password_hash: str | None = None
    google_id: str | None = None
    name: str
    phone: str | None = None
    
    # Staff Details
    employee_id: str | None = None
    status: StaffStatus = StaffStatus.OFFLINE
    force_password_change: bool = False
    
    # RBAC & Tenant
    restaurant_id: PydanticObjectId | None = None  # None for super_admins usually
    branch_id: PydanticObjectId | None = None      # Optional: restriction to specific branch
    role: Role = Role.OWNER

    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"
        indexes = ["email", "restaurant_id", "branch_id", "role"]

class Attendance(Document):
    """Tracks staff clock-in, clock-out, and breaks."""
    user_id: PydanticObjectId
    restaurant_id: PydanticObjectId
    branch_id: PydanticObjectId
    
    clock_in: datetime = Field(default_factory=datetime.utcnow)
    clock_out: datetime | None = None
    
    # Total break time in minutes
    break_duration_minutes: int = 0
    
    class Settings:
        name = "attendances"
        indexes = ["user_id", "branch_id", "clock_in"]
