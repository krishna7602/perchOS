from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings

client: AsyncIOMotorClient = None  # type: ignore


async def init_db():
    """Initialize Motor client and Beanie ODM with all document models."""
    global client
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        maxPoolSize=100,
        minPoolSize=10,
        maxIdleTimeMS=45000,
        waitQueueTimeoutMS=5000,
    )
    db = client.get_default_database()

    # Import all document models here to register them with Beanie
    from app.domains.auth.models import User, Attendance
    from app.domains.venues.restaurant_model import Restaurant
    from app.domains.venues.branch_model import Branch
    from app.domains.menu.models import MenuItem
    from app.domains.orders.models import Order, Counter, Payment, OrderEvent
    from app.domains.chat.team_models import TeamChannel, TeamMessage
    from app.domains.notifications.models import PushSubscription

    from app.domains.networking.models import (
        CustomerAccount, CustomerProfile, SocialLink, Interest, ProfessionalTag,
        VenueSession, Connection, ConnectionRequest, DirectMessage, UserPreference,
        ProfileVisibility, UserStatus, VenueChatMessage, VenuePoll
    )

    await init_beanie(
        database=db,
        document_models=[
            User, Attendance, Restaurant, Branch, MenuItem, Order, Counter, Payment, OrderEvent, TeamChannel, TeamMessage,
            CustomerAccount, CustomerProfile, SocialLink, Interest, ProfessionalTag,
            VenueSession, Connection, ConnectionRequest, DirectMessage, UserPreference,
            ProfileVisibility, UserStatus, VenueChatMessage, VenuePoll, PushSubscription
        ],
    )


async def close_db():
    """Close the Motor client connection."""
    global client
    if client:
        client.close()
