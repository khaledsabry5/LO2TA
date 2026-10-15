"""Cloudinary persistent cloud storage for product photos & videos, categories, and departments."""
import logging
import re
from fastapi import HTTPException, UploadFile, status

import cloudinary
import cloudinary.uploader
import cloudinary.api

from .config import settings
from .models import MediaType

logger = logging.getLogger("ysn.storage")

IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
VIDEO_TYPES = {"video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}


def ensure_cloudinary_configured() -> None:
    """Ensures Cloudinary credentials are set and configures the SDK."""
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="إعدادات التخزين السحابي Cloudinary غير مهيأة. يرجى ضبط CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET",
        )
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def save_upload(file: UploadFile, product_id: int) -> tuple[str, MediaType]:
    """Uploads a product media file directly to Cloudinary and returns (secure_url, media_type)."""
    ctype = (file.content_type or "").lower()
    if ctype in IMAGE_TYPES:
        media_type = MediaType.IMAGE
        resource_type = "image"
        limit_mb = settings.MAX_IMAGE_MB
    elif ctype in VIDEO_TYPES:
        media_type = MediaType.VIDEO
        resource_type = "video"
        limit_mb = settings.MAX_VIDEO_MB
    else:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")

    ensure_cloudinary_configured()

    try:
        file.file.seek(0)
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder=f"ysn_store/products/{product_id}",
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
        )
        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "تعذر الحصول على رابط الصورة من Cloudinary")
        return secure_url, media_type
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cloudinary product media upload failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"فشل رفع الملف إلى Cloudinary: {str(e)}")


def save_category_upload(file: UploadFile) -> str:
    """Uploads a category image directly to Cloudinary and returns secure_url."""
    ctype = (file.content_type or "").lower()
    if ctype not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")

    ensure_cloudinary_configured()

    try:
        file.file.seek(0)
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="ysn_store/categories",
            resource_type="image",
            use_filename=True,
            unique_filename=True,
        )
        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "تعذر الحصول على رابط الصورة من Cloudinary")
        return secure_url
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cloudinary category upload failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"فشل رفع الصورة إلى Cloudinary: {str(e)}")


def save_department_upload(file: UploadFile) -> str:
    """Uploads a department image directly to Cloudinary and returns secure_url."""
    ctype = (file.content_type or "").lower()
    if ctype not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"نوع الملف غير مدعوم: {ctype}")

    ensure_cloudinary_configured()

    try:
        file.file.seek(0)
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="ysn_store/departments",
            resource_type="image",
            use_filename=True,
            unique_filename=True,
        )
        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "تعذر الحصول على رابط الصورة من Cloudinary")
        return secure_url
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cloudinary department upload failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"فشل رفع الصورة إلى Cloudinary: {str(e)}")


def delete_media_file(url: str) -> None:
    """Safely deletes an asset from Cloudinary by extracting its public ID."""
    if not url:
        return
    if "res.cloudinary.com" in url:
        try:
            ensure_cloudinary_configured()
            # Extract public_id: everything after '/upload/' and version '/v[0-9]+/' up to the file extension
            match = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.[^.]+)?$", url)
            if match:
                public_id = match.group(1)
                cloudinary.uploader.destroy(public_id, resource_type="auto", invalidate=True)
        except Exception as e:
            logger.warning(f"Failed to delete Cloudinary media: {e}")


def delete_product_folder(product_id: int) -> None:
    """Removes all product media from Cloudinary under the product prefix."""
    try:
        ensure_cloudinary_configured()
        prefix = f"ysn_store/products/{product_id}/"
        cloudinary.api.delete_resources_by_prefix(prefix)
        try:
            cloudinary.api.delete_folder(f"ysn_store/products/{product_id}")
        except Exception:
            pass
    except Exception as e:
        logger.warning(f"Failed to delete product folder on Cloudinary: {e}")
