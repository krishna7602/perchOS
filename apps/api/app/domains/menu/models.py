from beanie import Document, PydanticObjectId


from pydantic import BaseModel, Field

class ItemVariant(BaseModel):
    name: str
    price: float

class MenuItem(Document):
    """A single menu item belonging to a venue."""

    restaurant_id: PydanticObjectId
    branch_id: PydanticObjectId
    name: str
    description: str | None = None
    price: float | None = None
    variants: list[ItemVariant] = Field(default_factory=list)
    category: str = "misc"
    is_veg: bool = True
    image_url: str | None = None
    available: bool = True
    is_coming_soon: bool = False

    class Settings:
        name = "menu_items"
