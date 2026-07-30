import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# We import the old models as raw dictionaries to migrate them
# Actually, since Beanie requires strict models, it's safer to use raw motor commands for migrations!

async def run_migration():
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.perch_db

    print("Starting migration...")

    # 1. Migrate Admins -> Users
    admins = await db.admins.find().to_list(None)
    for admin in admins:
        user_doc = {
            "_id": admin["_id"],
            "email": admin["email"],
            "password_hash": admin.get("password_hash"),
            "google_id": admin.get("google_id"),
            "name": admin["name"],
            "phone": admin.get("phone"),
            "role": "super_admin" if admin.get("is_superadmin") else "owner",
            "is_active": True,
            "created_at": admin.get("created_at")
        }
        
        # If they aren't super admin, we need to create a Restaurant for them
        if not admin.get("is_superadmin"):
            restaurant_name = admin.get("restaurant_name") or f"{admin['name']}'s Restaurant"
            restaurant_doc = {
                "name": restaurant_name,
                "owner_id": str(admin["_id"]),
                "is_active": True,
                "created_at": admin.get("created_at")
            }
            res = await db.restaurants.insert_one(restaurant_doc)
            restaurant_id = res.inserted_id
            
            user_doc["restaurant_id"] = restaurant_id
            user_doc["branch_id"] = None
        else:
            user_doc["restaurant_id"] = None
            user_doc["branch_id"] = None
            
        await db.users.insert_one(user_doc)
        print(f"Migrated Admin -> User: {admin['email']}")

    # Drop old admins
    await db.admins.drop()

    # 2. Migrate Venues -> Branches (and attach to Restaurants)
    # Right now, Venues belong to `owner_id`. We need to attach them to the Restaurant owned by that owner.
    venues = await db.venues.find().to_list(None)
    for venue in venues:
        owner_id = venue.get("owner_id")
        
        # Find the restaurant for this owner
        user = await db.users.find_one({"_id": owner_id})
        restaurant_id = user.get("restaurant_id") if user else None
        
        branch_doc = {
            "_id": venue["_id"],
            "restaurant_id": restaurant_id,
            "name": venue["name"],
            "lat": venue.get("lat"),
            "lng": venue.get("lng"),
            "wifi_ssid": venue.get("wifi_ssid"),
            "wifi_password_encrypted": venue.get("wifi_password_encrypted"),
            "wifi_password_iv": venue.get("wifi_password_iv"),
            "wifi_password_tag": venue.get("wifi_password_tag"),
            "qr_token": venue.get("qr_token"),
            "menu_qr_token": venue.get("menu_qr_token"),
            "created_at": venue.get("created_at"),
            "is_active": True
        }
        await db.branches.insert_one(branch_doc)
        
        # 3. Update Menu Items
        await db.menu_items.update_many(
            {"venue_id": venue["_id"]},
            {"$set": {"restaurant_id": restaurant_id, "branch_id": venue["_id"]}, "$unset": {"venue_id": ""}}
        )
        
        # 4. Update Orders
        await db.orders.update_many(
            {"venue_id": venue["_id"]},
            {"$set": {"restaurant_id": restaurant_id, "branch_id": venue["_id"]}, "$unset": {"venue_id": ""}}
        )
        
        print(f"Migrated Venue -> Branch: {venue['name']}")
        
    # Drop old venues
    await db.venues.drop()

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(run_migration())
