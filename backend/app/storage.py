"""Local media storage for product photos & videos.

Swap this module for an S3 / Cloudinary implementation in production; the
rest of the code only depends on `save_upload` and `delete_media_file`.
"""
import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from .config import settings
from .models import MediaType

IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
VIDEO_TYPES = {"video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}

UPLOAD_ROOT = Path(settings.UPLOAD_DIR).resolve()
CHUNK = 1024 * 1024


def save_upload(file: UploadFile, product_id: int) -> tuple[str, MediaType]:
    ctype = (file.content_type or "").lower()
    if ctype in IMAGE_TYPES:
        media_type, ext, limit_mb = MediaType.IMAGE, IMAGE_TYPES[ctype], settings.MAX_IMAGE_MB
    elif ctype in VIDEO_TYPES:
        media_type, ext, limit_mb = MediaType.VIDEO, VIDEO_TYPES[ctype], settings.MAX_VIDEO_MB
    else:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")

    folder = UPLOAD_ROOT / "products" / str(product_id)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    dest = folder / name

    limit = limit_mb * 1024 * 1024
    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := file.file.read(CHUNK):
                written += len(chunk)
                if written > limit:
                    raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"الحد الأقصى {limit_mb} ميجابايت")
                out.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return f"/uploads/products/{product_id}/{name}", media_type


def delete_media_file(url: str) -> None:
    if not url.startswith("/uploads/"):
        return  # external / seeded asset – nothing to delete
    path = (UPLOAD_ROOT / url.removeprefix("/uploads/")).resolve()
    if UPLOAD_ROOT in path.parents:
        path.unlink(missing_ok=True)


def delete_product_folder(product_id: int) -> None:
    shutil.rmtree(UPLOAD_ROOT / "products" / str(product_id), ignore_errors=True)


def save_category_upload(file: UploadFile) -> str:
    ctype = (file.content_type or "").lower()
    if ctype not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")
    ext = IMAGE_TYPES[ctype]
    limit_mb = settings.MAX_IMAGE_MB
    folder = UPLOAD_ROOT / "categories"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    dest = folder / name
    limit = limit_mb * 1024 * 1024
    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := file.file.read(CHUNK):
                written += len(chunk)
                if written > limit:
                    raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"الحد الأقصى {limit_mb} ميجابايت")
                out.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return f"/uploads/categories/{name}"


def save_department_upload(file: UploadFile) -> str:
    ctype = (file.content_type or "").lower()
    if ctype not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")
    ext = IMAGE_TYPES[ctype]
    limit_mb = settings.MAX_IMAGE_MB
    folder = UPLOAD_ROOT / "departments"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    dest = folder / name
    limit = limit_mb * 1024 * 1024
    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := file.file.read(CHUNK):
                written += len(chunk)
                if written > limit:
                    raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"الحد الأقصى {limit_mb} ميجابايت")
                out.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return f"/uploads/departments/{name}"
