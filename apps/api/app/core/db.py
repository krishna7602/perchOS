from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings

client: AsyncIOMotorClient = None  # type: ignore


async def init_db():
    """Initialize Motor client and Beanie ODM with all document models."""
    global client
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client.get_default_database()

    # Import all document models here to register them with Beanie
    from app.domains.auth.models import User, Attendance
    from app.domains.venues.restaurant_model import Restaurant
    from app.domains.venues.branch_model import Branch
    from app.domains.menu.models import MenuItem
    from app.domains.orders.models import Order
    from app.domains.chat.team_models import TeamChannel, TeamMessage

    await init_beanie(
        database=db,
        document_models=[User, Attendance, Restaurant, Branch, MenuItem, Order, TeamChannel, TeamMessage],
    )


async def close_db():
    """Close the Motor client connection."""
    global client
    if client:
        client.close()
