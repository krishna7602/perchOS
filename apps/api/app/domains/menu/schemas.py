from pydantic import BaseModel, Field


class ItemVariantSchema(BaseModel):
    name: str
    price: float


class MenuItemCreate(BaseModel):
    """Create a new menu item."""

    name: str
    description: str | None = None
    price: float | None = None
    variants: list[ItemVariantSchema] = Field(default_factory=list)
    category: str = "misc"
    is_veg: bool = True
    image_url: str | None = None
    available: bool = True
    is_coming_soon: bool = False


class MenuItemUpdate(BaseModel):
    """Update an existing menu item (all fields optional)."""

    name: str | None = None
    description: str | None = None
    price: float | None = None
    variants: list[ItemVariantSchema] | None = None
    category: str | None = None
    is_veg: bool | None = None
    image_url: str | None = None
    available: bool | None = None
    is_coming_soon: bool | None = None
