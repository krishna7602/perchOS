from pydantic import BaseModel


class MenuItemCreate(BaseModel):
    """Create a new menu item."""

    name: str
    description: str | None = None
    price: float
    category: str = "misc"
    is_veg: bool = True
    image_url: str | None = None
    available: bool = True


class MenuItemUpdate(BaseModel):
    """Update an existing menu item (all fields optional)."""

    name: str | None = None
    description: str | None = None
    price: float | None = None
    category: str | None = None
    is_veg: bool | None = None
    image_url: str | None = None
    available: bool | None = None
