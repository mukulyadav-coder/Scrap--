"""ScrapSetu Backend Configuration."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
class Settings(BaseSettings):
    # Storage
    STORAGE_BACKEND: str = "csv"
    CSV_DATA_DIR: str = "./data/csv"
    UPLOADS_DIR: str = "./data/uploads"
    EXPORTS_DIR: str = "./data/exports"
    
    # JWT
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_ENV: str = "development"
    APP_PORT: int = 8001
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:5173,http://localhost:19006,https://scrap-one-teal.vercel.app"
    UPLOAD_MAX_BYTES: int = 5 * 1024 * 1024

    # Admin seed
    ADMIN_SEED_EMAIL: str = ""
    ADMIN_SEED_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def get_csv_dir(self) -> Path:
        return Path(self.CSV_DATA_DIR)

    def get_uploads_dir(self) -> Path:
        return Path(self.UPLOADS_DIR)

    def get_exports_dir(self) -> Path:
        return Path(self.EXPORTS_DIR)
settings = Settings()
