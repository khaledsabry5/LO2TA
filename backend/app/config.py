from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Lo2ta Accessories Store API"
    DATABASE_URL: str = "postgresql+psycopg://lo2ta:lo2ta@localhost:5432/lo2ta"

    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_MB: int = 8
    MAX_VIDEO_MB: int = 50

    FIRST_MANAGER_EMAIL: str = "manager@lo2ta.com"
    FIRST_MANAGER_PASSWORD: str = "ChangeMe123!"
    FIRST_MANAGER_NAME: str = "مدير المتجر"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
