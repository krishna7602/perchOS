from beanie import Document, PydanticObjectId


class MenuItem(Document):
    """A single menu item belonging to a venue."""

    restaurant_id: PydanticObjectId
    branch_id: PydanticObjectId
    name: str
    description: str | None = None
    price: float
    category: str = "misc"
    is_veg: bool = True
    image_url: str | None = None
    available: bool = True

    class Settings:
        name = "menu_items"
