from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173"
    GOOGLE_CLIENT_ID: str = ""

    # CitaPay (M-Pesa STK Push via CitaPay)
    CITAPAY_API_KEY: str = ""
    CITAPAY_WEBHOOK_SECRET: str = ""
    CITAPAY_ENV: str = "sandbox"  # "sandbox" | "production"

    class Config:
        env_file = ".env"


settings = Settings()
