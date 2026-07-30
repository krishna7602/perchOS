import asyncio
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.seed import seed_admin

async def clear_db():
    print(f"Connecting to MongoDB: {settings.MONGO_URI}")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client.get_default_database()
    
    print(f"Dropping database: {db.name}")
    await client.drop_database(db.name)
    print("Database dropped successfully.")
    
    print("Re-seeding admin user...")
    await seed_admin()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(clear_db())
