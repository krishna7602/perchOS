import asyncio

from app.core.security import hash_password
from app.core.db import init_db
from app.domains.auth.models import User, Role
from app.domains.venues.restaurant_model import Restaurant


async def seed_admin():
    """Seed the development admin account.

    Creates song@admin.com with a bcrypt-hashed password.
    This is for LOCAL DEVELOPMENT ONLY — rotate before any real deployment.
    """
    await init_db()

    existing_super = await User.find_one(User.email == "superadmin@perch.store")
    if existing_super:
        await existing_super.delete()

    super_admin = User(
        email="superadmin@perch.store",
        password_hash=hash_password("admin123"),
        name="Super Admin",
        role=Role.SUPER_ADMIN,
    )
    await super_admin.insert()
    
    print("seeded dev superadmin: superadmin@perch.store with password: admin123")


if __name__ == "__main__":
    asyncio.run(seed_admin())
