from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db, close_db
from app.core.redis_client import init_redis, close_redis

from app.domains.auth.router import router as auth_router
from app.domains.auth.superadmin import router as superadmin_router
from app.domains.auth.staff import router as staff_router
from app.domains.venues.branches import router as branches_router
from app.domains.chat.sessions import router as sessions_router
from app.domains.chat.team_api import router as team_chat_router
from app.domains.menu.router import router as menu_router
from app.domains.orders.router import router as orders_router
from app.domains.chat.router import router as chat_ws_router
from app.routers.admin import router as admin_router
from app.domains.networking.profile_router import router as networking_profile_router
from app.domains.networking.discovery_router import router as discovery_router
from app.domains.networking.connections_router import router as connections_router
from app.domains.chat.direct_router import router as direct_chat_router
from app.routers.payments import router as payments_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize and clean up resources."""
    # Startup
    await init_db()
    await init_redis()

    # Auto-seed dev admin in development
    if settings.ENVIRONMENT == "development":
        from app.seed import seed_admin
        try:
            await seed_admin()
        except Exception as e:
            print(f"Seed warning: {e}")

    yield

    # Shutdown
    await close_redis()
    await close_db()


app = FastAPI(
    title="Perch API",
    description="Venue-based social + ordering platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        settings.PUBLIC_BASE_URL,
        "https://perchos.shop",
        "https://perch-os.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "perch-api"}


# Mount routers
app.include_router(auth_router)
app.include_router(superadmin_router)
app.include_router(staff_router)
app.include_router(branches_router)
app.include_router(sessions_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(chat_ws_router)
app.include_router(admin_router)
app.include_router(team_chat_router)
app.include_router(networking_profile_router)
app.include_router(discovery_router)
app.include_router(connections_router)
app.include_router(direct_chat_router)
app.include_router(payments_router)
