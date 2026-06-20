from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Password@localhost:5432/skillswap_db"

    # JWT
    SECRET_KEY: str = "super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # App
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "SkillSwap Network"
    VERSION: str = "2.0.0"

    # CORS — comma-separated origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
