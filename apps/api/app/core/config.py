from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Shared
    PUBLIC_BASE_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017/perch"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change_me_to_a_random_32_char_string"

    # WiFi encryption (AES-256 key as hex string — 64 hex chars = 32 bytes)
    WIFI_ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Payments
    PAYMENT_PROVIDER: str = "dummy"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Web Push
    VAPID_PRIVATE_KEY: str = "IffaCJ9sXWNdWcm6eEoF5fi5XyTgyYzVgp4tvvlHV4A"
    VAPID_PUBLIC_KEY: str = "BLVwMxkN5af4K0gIsdiw21vM4--G1eiq-mStLPpCyjqn0dnc6OSwGzSnmW4SpBwyct1jXGYcqtLOi_3ayWVgESQ"
    VAPID_CLAIM_EMAIL: str = "mailto:admin@perch.com"

    # Aggregators / POS Integration (Zomato & Swiggy)
    ZOMATO_API_KEY: str = "MOCK_ZOMATO_KEY"
    ZOMATO_POS_BASE_URL: str = "https://api.zomato.com/v1/pos"
    ZOMATO_WEBHOOK_SECRET: str = ""
    SWIGGY_API_KEY: str = "MOCK_SWIGGY_KEY"
    SWIGGY_POS_BASE_URL: str = "https://partner.swiggy.com/v1/pos"
    SWIGGY_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
