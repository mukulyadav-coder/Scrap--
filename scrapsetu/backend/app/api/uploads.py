"""Persistent local file uploads; use a private object store in production."""
import uuid
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import settings
from app.security.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/uploads", tags=["uploads"])
_ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    image: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    content_type = (image.content_type or "").lower()
    suffix = _ALLOWED_TYPES.get(content_type)
    if suffix is None:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

    destination_dir = settings.get_uploads_dir().resolve()
    destination_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{suffix}"
    destination = destination_dir / name
    total = 0
    try:
        with destination.open("wb") as stream:
            while chunk := await image.read(64 * 1024):
                total += len(chunk)
                if total > settings.UPLOAD_MAX_BYTES:
                    raise HTTPException(status_code=413, detail="Image exceeds the upload size limit.")
                stream.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except OSError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not persist the uploaded image.") from exc
    finally:
        await image.close()

    return {
        "file_path": f"/uploads/{name}",
        "content_type": content_type,
        "size_bytes": str(total),
    }
