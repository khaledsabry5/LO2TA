"""Category CRUD router for YSN Accessories Store."""
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ..deps import DB, StaffUser
from ..models import Category, Product
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate, ProductPage
from ..storage import delete_media_file, save_category_upload

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: DB):
    """Public endpoint to list all dynamic categories with products count."""
    categories = db.scalars(select(Category).order_by(Category.id.asc())).all()
    results = []
    for cat in categories:
        count = db.scalar(
            select(func.count(Product.id)).where(
                Product.category_id == cat.id,
                Product.is_active.is_(True),
            )
        )
        cat_out = CategoryOut.model_validate(cat)
        cat_out.products_count = count or 0
        results.append(cat_out)
    return results


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: DB):
    """Public endpoint to get a single category by ID."""
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التصنيف غير موجود")
    count = db.scalar(
        select(func.count(Product.id)).where(
            Product.category_id == cat.id,
            Product.is_active.is_(True),
        )
    )
    cat_out = CategoryOut.model_validate(cat)
    cat_out.products_count = count or 0
    return cat_out


@router.get("/{category_id}/products", response_model=ProductPage)
def get_category_products(
    category_id: int,
    db: DB,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Public endpoint to list all active products under a specific category."""
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التصنيف غير موجود")

    stmt = select(Product).where(
        Product.category_id == category_id,
        Product.is_active.is_(True),
    )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.options(
            selectinload(Product.category),
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ProductPage(total=total or 0, items=items)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    db: DB,
    _: StaffUser,
    name: str = Form(...),
    file: UploadFile | None = File(None),
    image_url: str | None = Form(None),
):
    """Staff only: Create a new category with name and image upload."""
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يجب إدخال اسم التصنيف")

    existing = db.scalar(select(Category).where(func.lower(Category.name) == clean_name.lower()))
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يوجد تصنيف آخر بنفس هذا الاسم بالفعل")

    img_path = image_url
    if file:
        img_path = save_category_upload(file)

    if not img_path:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يجب رفع صورة للتصنيف أو توفير رابط الصورة")

    # Enforce women/men image isolation: Prevent women's category from using male image
    if any(w in clean_name.lower() for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
        if "photo-1507679799987" in img_path or img_path.endswith("men.jpg") or img_path.endswith("men_category.jpg"):
            img_path = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
    elif any(w in clean_name.lower() for w in ("رجال", "رجالي", "men")):
        if "photo-1508214751196" in img_path or img_path.endswith("women.jpg") or img_path.endswith("women_category.jpg"):
            img_path = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"

    category = Category(name=clean_name, image_url=img_path)
    db.add(category)
    db.commit()
    db.refresh(category)

    res = CategoryOut.model_validate(category)
    res.products_count = 0
    return res


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    db: DB,
    _: StaffUser,
    name: str | None = Form(None),
    file: UploadFile | None = File(None),
    image_url: str | None = Form(None),
):
    """Staff only: Update an existing category name and/or image."""
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التصنيف غير موجود")

    if name:
        clean_name = name.strip()
        existing = db.scalar(
            select(Category).where(
                func.lower(Category.name) == clean_name.lower(),
                Category.id != category_id,
            )
        )
        if existing:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "يوجد تصنيف آخر بنفس هذا الاسم بالفعل")
        cat.name = clean_name

    if file and file.filename:
        new_img = save_category_upload(file)
        if cat.image_url and cat.image_url.startswith("/uploads/"):
            delete_media_file(cat.image_url)
        cat.image_url = new_img
    elif image_url and image_url.strip():
        cat.image_url = image_url.strip()

    # Enforce women/men image isolation on update
    target_name = (cat.name or "").lower()
    if any(w in target_name for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
        if not cat.image_url or "photo-1507679799987" in cat.image_url or cat.image_url.endswith("men.jpg") or cat.image_url.endswith("men_category.jpg"):
            cat.image_url = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
    elif any(w in target_name for w in ("رجال", "رجالي", "men")):
        if not cat.image_url or "photo-1508214751196" in cat.image_url or cat.image_url.endswith("women.jpg") or cat.image_url.endswith("women_category.jpg"):
            cat.image_url = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"

    db.commit()
    db.refresh(cat)

    count = db.scalar(select(func.count(Product.id)).where(Product.category_id == cat.id))
    res = CategoryOut.model_validate(cat)
    res.products_count = count or 0
    return res


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(category_id: int, db: DB, _: StaffUser):
    """Staff only: Delete category. Prevent deletion if products are attached."""
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التصنيف غير موجود")

    products_count = db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id))
    if products_count and products_count > 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"لا يمكن حذف التصنيف لأنه مرتبط بـ {products_count} منتج حالياً. قم بنقل أو حذف المنتجات أولاً.",
        )

    if cat.image_url and cat.image_url.startswith("/uploads/"):
        delete_media_file(cat.image_url)

    db.delete(cat)
    db.commit()
    return {"ok": True, "message": "تم حذف التصنيف بنجاح"}
