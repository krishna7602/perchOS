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

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
