from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_URL = f"sqlite:///{BASE_DIR.as_posix()}/lo2ta.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Lo2ta Accessories Store API"
    DATABASE_URL: str = DEFAULT_DB_URL

    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_MB: int = 8
    MAX_VIDEO_MB: int = 50

    # Brevo HTTP API Configuration
    BREVO_API_KEY: str = ""
    SMTP_FROM_EMAIL: str = "lo2tastore2026@gmail.com"
    SMTP_FROM_NAME: str = "Lo2ta Accessories"

    FIRST_MANAGER_EMAIL: str = "lo2tastore2026@gmail.com"
    FIRST_MANAGER_PASSWORD: str = ""
    FIRST_MANAGER_NAME: str = "مدير المتجر"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
