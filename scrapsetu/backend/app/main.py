"""ScrapSetu FastAPI application."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.marketplace import router as marketplace_router
from app.api.uploads import router as uploads_router
from app.config import settings
from app.services.auth_service import seed_admin_user

logger = logging.getLogger(__name__)


def provision_configured_admin() -> None:
    if len(settings.JWT_SECRET) < 32:
        raise RuntimeError("Configure a JWT_SECRET of at least 32 characters before startup.")
    if bool(settings.ADMIN_SEED_EMAIL) != bool(settings.ADMIN_SEED_PASSWORD):
        raise RuntimeError("Configure both ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to seed an administrator.")
    if settings.ADMIN_SEED_EMAIL and settings.ADMIN_SEED_PASSWORD:
        if (
            len(settings.ADMIN_SEED_PASSWORD) < 12
            or len(settings.ADMIN_SEED_PASSWORD.encode("utf-8")) > 72
            or not any(char.isupper() for char in settings.ADMIN_SEED_PASSWORD)
            or not any(char.isdigit() for char in settings.ADMIN_SEED_PASSWORD)
        ):
            raise RuntimeError("The admin seed password must be 12-72 UTF-8 bytes and include an uppercase letter and a digit.")
        seed_admin_user(settings.ADMIN_SEED_EMAIL, settings.ADMIN_SEED_PASSWORD)
    else:
        logger.info("No admin seed configured; provision an administrator through the secure deployment process.")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    provision_configured_admin()
    yield


app = FastAPI(title="ScrapSetu API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(marketplace_router)
app.include_router(uploads_router)
Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}
