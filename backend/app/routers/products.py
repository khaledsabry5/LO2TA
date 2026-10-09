from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..deps import DB, StaffUser
from ..models import Category, Gender, Product, ProductMedia
from ..schemas import (
    DiscountIn,
    MediaOut,
    ProductAdminOut,
    ProductAdminPage,
    ProductCreate,
    ProductOut,
    ProductPage,
    ProductUpdate,
)
from ..storage import delete_media_file, delete_product_folder, save_upload

router = APIRouter(prefix="/products", tags=["products"])

LATEST_LIMIT = 20


def _get_product(db, product_id: int) -> Product:
    product = db.scalar(select(Product).where(Product.id == product_id).options(selectinload(Product.media)))
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المنتج غير موجود")
    return product


def _apply_filters(stmt, category, gender, q, discounted):
    if category:
        stmt = stmt.where(Product.category == category)
    if gender:
        stmt = stmt.where(Product.gender == gender)
    if discounted:
        stmt = stmt.where(Product.discount_percent > 0)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.description.ilike(like)))
    return stmt


# ================================ PUBLIC ==================================== #
@router.get("", response_model=ProductPage)
def list_products(
    db: DB,
    category: Category | None = None,
    gender: Gender | None = None,
    q: str | None = Query(default=None, max_length=100),
    discounted: bool = False,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    stmt = _apply_filters(select(Product).where(Product.is_active.is_(True)), category, gender, q, discounted)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.options(selectinload(Product.media))
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ProductPage(total=total or 0, items=items)


@router.get("/latest", response_model=list[ProductOut])
def latest_products(db: DB):
    """Exactly the latest 20 active products, mixed across all categories."""
    return db.scalars(
        select(Product)
        .where(Product.is_active.is_(True))
        .options(selectinload(Product.media))
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(LATEST_LIMIT)
    ).all()


# ========================= STAFF (Manager + Admin) ========================== #
@router.get("/manage/all", response_model=ProductAdminPage)
def manage_list(
    db: DB,
    _: StaffUser,
    category: Category | None = None,
    gender: Gender | None = None,
    q: str | None = Query(default=None, max_length=100),
    discounted: bool = False,
    low_stock: int | None = Query(default=None, ge=0, description="Only products with stock <= value"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    stmt = _apply_filters(select(Product), category, gender, q, discounted)
    if low_stock is not None:
        stmt = stmt.where(Product.stock <= low_stock)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.options(selectinload(Product.media)).order_by(Product.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return ProductAdminPage(total=total or 0, items=items)


@router.get("/manage/{product_id}", response_model=ProductAdminOut)
def manage_get(product_id: int, db: DB, _: StaffUser):
    return _get_product(db, product_id)


@router.post("", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DB, user: StaffUser):
    product = Product(**data.model_dump(), created_by_id=user.id)
    db.add(product)
    db.commit()
    return _get_product(db, product.id)


@router.patch("/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, data: ProductUpdate, db: DB, _: StaffUser):
    product = _get_product(db, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    return _get_product(db, product_id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DB, _: StaffUser):
    product = _get_product(db, product_id)
    db.delete(product)  # order items keep their snapshot (FK -> SET NULL)
    db.commit()
    delete_product_folder(product_id)


# ------------------------------- Discounts --------------------------------- #
@router.put("/{product_id}/discount", response_model=ProductAdminOut)
def apply_discount(product_id: int, data: DiscountIn, db: DB, _: StaffUser):
    product = _get_product(db, product_id)
    product.discount_percent = data.percent
    db.commit()
    return _get_product(db, product_id)


@router.delete("/{product_id}/discount", response_model=ProductAdminOut)
def remove_discount(product_id: int, db: DB, _: StaffUser):
    product = _get_product(db, product_id)
    product.discount_percent = 0
    db.commit()
    return _get_product(db, product_id)


# --------------------------------- Media ----------------------------------- #
@router.post("/{product_id}/media", response_model=list[MediaOut], status_code=status.HTTP_201_CREATED)
def upload_media(product_id: int, db: DB, _: StaffUser, files: list[UploadFile] = File(...)):
    product = _get_product(db, product_id)
    if len(files) > 10:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "الحد الأقصى 10 ملفات في المرة الواحدة")
    next_order = max((m.sort_order for m in product.media), default=-1) + 1
    created: list[ProductMedia] = []
    for i, f in enumerate(files):
        url, mtype = save_upload(f, product_id)
        media = ProductMedia(product_id=product_id, url=url, media_type=mtype, sort_order=next_order + i)
        db.add(media)
        created.append(media)
    db.commit()
    return created


@router.delete("/{product_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(product_id: int, media_id: int, db: DB, _: StaffUser):
    media = db.get(ProductMedia, media_id)
    if not media or media.product_id != product_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الملف غير موجود")
    url = media.url
    db.delete(media)
    db.commit()
    delete_media_file(url)


# ======================= PUBLIC DETAIL (keep last) ========================== #
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: DB):
    product = _get_product(db, product_id)
    if not product.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المنتج غير موجود")
    return product
