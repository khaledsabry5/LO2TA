from decimal import Decimal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..deps import DB, StaffUser
from ..models import Category, Gender, Product, ProductColor, ProductMedia, ProductSize
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
categories_router = APIRouter(prefix="/categories", tags=["categories"])

LATEST_LIMIT = 20


def _get_product(db, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
    )
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المنتج غير موجود")
    return product


def _apply_filters(
    stmt,
    category: Category | None = None,
    gender: Gender | None = None,
    q: str | None = None,
    discounted: bool = False,
    size: int | None = None,
    color: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
):
    if category:
        stmt = stmt.where(Product.category == category)
    if gender:
        stmt = stmt.where(Product.gender == gender)
    if discounted:
        stmt = stmt.where(Product.discount_percent > 0)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.description.ilike(like)))

    # Price range filter on final price (taking discount into account)
    effective_price = Product.price * (1.0 - func.coalesce(Product.discount_percent, 0) / 100.0)
    if min_price is not None:
        stmt = stmt.where(effective_price >= float(min_price))
    if max_price is not None:
        stmt = stmt.where(effective_price <= float(max_price))

    needs_distinct = False
    # Variant inventory filter: size must match and have stock > 0
    if size is not None:
        stmt = stmt.join(Product.sizes).where(ProductSize.size == size, ProductSize.stock > 0)
        needs_distinct = True

    # Variant inventory filter: color must match and product must have stock > 0
    if color:
        clean_color = color.strip()
        stmt = stmt.join(Product.colors).where(
            or_(
                func.lower(ProductColor.name) == clean_color.lower(),
                ProductColor.code.ilike(clean_color),
            )
        )
        stmt = stmt.where(Product.stock > 0)
        needs_distinct = True

    if needs_distinct:
        stmt = stmt.distinct()

    return stmt


# ================================ PUBLIC ==================================== #
@router.get("", response_model=ProductPage)
@router.get("/category/{category_path}", response_model=ProductPage)
@router.get("/categories/{category_path}/products", response_model=ProductPage)
def list_products(
    db: DB,
    category: Category | None = None,
    category_path: Category | None = None,
    gender: Gender | None = None,
    q: str | None = Query(default=None, max_length=100),
    discounted: bool = False,
    size: int | None = Query(default=None, ge=30, le=50, description="Shoe size (30-50)"),
    color: str | None = Query(default=None, max_length=50, description="Product color"),
    min_price: Decimal | None = Query(default=None, ge=0, description="Minimum price"),
    max_price: Decimal | None = Query(default=None, ge=0, description="Maximum price"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    cat = category or category_path
    stmt = _apply_filters(
        select(Product).where(Product.is_active.is_(True)),
        category=cat,
        gender=gender,
        q=q,
        discounted=discounted,
        size=size,
        color=color,
        min_price=min_price,
        max_price=max_price,
    )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.options(
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ProductPage(total=total or 0, items=items)


@categories_router.get("/{category_id}/products", response_model=ProductPage)
def get_category_products(
    category_id: Category,
    db: DB,
    gender: Gender | None = None,
    q: str | None = Query(default=None, max_length=100),
    discounted: bool = False,
    size: int | None = Query(default=None, ge=30, le=50, description="Shoe size (30-50)"),
    color: str | None = Query(default=None, max_length=50, description="Product color"),
    min_price: Decimal | None = Query(default=None, ge=0, description="Minimum price"),
    max_price: Decimal | None = Query(default=None, ge=0, description="Maximum price"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Direct category products endpoint (e.g. GET /api/categories/shoes/products)."""
    return list_products(
        db=db,
        category=category_id,
        gender=gender,
        q=q,
        discounted=discounted,
        size=size,
        color=color,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
        offset=offset,
    )


@router.get("/filter-options")
def get_filter_options(
    db: DB,
    category: Category | None = None,
    gender: Gender | None = None,
):
    """Returns available sizes, colors, and price min/max for dynamic UI filtering."""
    base = select(Product.id).where(Product.is_active.is_(True))
    if category:
        base = base.where(Product.category == category)
    if gender:
        base = base.where(Product.gender == gender)
    sub = base.subquery()

    # Sizes with stock > 0
    sizes = db.scalars(
        select(ProductSize.size)
        .where(ProductSize.product_id.in_(select(sub.c.id)), ProductSize.stock > 0)
        .distinct()
        .order_by(ProductSize.size.asc())
    ).all()

    # Colors
    colors_raw = db.execute(
        select(ProductColor.name, ProductColor.code)
        .where(ProductColor.product_id.in_(select(sub.c.id)))
        .distinct()
        .order_by(ProductColor.name.asc())
    ).all()
    colors = [{"name": r[0], "code": r[1]} for r in colors_raw]

    # Price range
    eff_price = Product.price * (1.0 - func.coalesce(Product.discount_percent, 0) / 100.0)
    prices = db.execute(
        select(
            func.min(eff_price).label("min_price"),
            func.max(eff_price).label("max_price"),
        ).where(Product.id.in_(select(sub.c.id)))
    ).one_or_none()

    min_p = float(prices.min_price) if prices and prices.min_price is not None else 0
    max_p = float(prices.max_price) if prices and prices.max_price is not None else 5000

    return {
        "sizes": list(sizes),
        "colors": colors,
        "min_price": round(min_p, 2),
        "max_price": round(max_p, 2),
    }


@router.get("/latest", response_model=list[ProductOut])
def latest_products(db: DB):
    """Exactly the latest 20 active products, mixed across all categories."""
    return db.scalars(
        select(Product)
        .where(Product.is_active.is_(True))
        .options(
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
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
        stmt.options(
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
        .order_by(Product.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ProductAdminPage(total=total or 0, items=items)


@router.get("/manage/{product_id}", response_model=ProductAdminOut)
def manage_get(product_id: int, db: DB, _: StaffUser):
    return _get_product(db, product_id)


@router.post("", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DB, user: StaffUser):
    raw_data = data.model_dump()
    sizes_data = raw_data.pop("sizes", None)
    colors_data = raw_data.pop("colors", None)

    # For shoes with specific sizes, stock is the sum of sizes
    if data.category == Category.SHOES and sizes_data:
        raw_data["stock"] = sum(s["stock"] for s in sizes_data)

    product = Product(**raw_data, created_by_id=user.id)
    db.add(product)
    db.flush()

    if data.category == Category.SHOES and sizes_data:
        for s in sizes_data:
            product.sizes.append(ProductSize(size=s["size"], stock=s["stock"]))

    if data.category in (Category.SHOES, Category.BAGS) and colors_data:
        for c in colors_data:
            product.colors.append(ProductColor(name=c["name"].strip(), code=c.get("code")))

    db.commit()
    return _get_product(db, product.id)


@router.patch("/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, data: ProductUpdate, db: DB, _: StaffUser):
    product = _get_product(db, product_id)
    raw = data.model_dump(exclude_unset=True)
    sizes_data = raw.pop("sizes", None)
    colors_data = raw.pop("colors", None)

    for field, value in raw.items():
        setattr(product, field, value)

    if sizes_data is not None:
        product.sizes.clear()
        if product.category == Category.SHOES:
            for s in sizes_data:
                product.sizes.append(ProductSize(size=s["size"], stock=s["stock"]))
            product.stock = sum(s["stock"] for s in sizes_data)

    if colors_data is not None:
        product.colors.clear()
        if product.category in (Category.SHOES, Category.BAGS):
            for c in colors_data:
                product.colors.append(ProductColor(name=c["name"].strip(), code=c.get("code")))

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
