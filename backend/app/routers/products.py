from decimal import Decimal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..deps import DB, StaffUser
from ..models import Category, Department, Gender, Product, ProductColor, ProductMedia, ProductSize
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
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.categories),
            selectinload(Product.department),
            selectinload(Product.departments),
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
    category: str | int | None = None,
    department: str | int | None = None,
    department_id: int | None = None,
    gender: Gender | None = None,
    q: str | None = None,
    discounted: bool = False,
    size: int | None = None,
    color: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
):
    if category is not None and str(category).strip():
        cat_str = str(category).strip()
        if cat_str.isdigit():
            c_id = int(cat_str)
            stmt = stmt.where(
                or_(
                    Product.category_id == c_id,
                    Product.categories.any(Category.id == c_id),
                )
            )
        else:
            cat_lower = cat_str.lower()
            if cat_lower in ("men", "رجالي", "الرجال"):
                stmt = stmt.where(
                    or_(
                        Product.gender.in_([Gender.MEN, Gender.UNISEX]),
                        Product.department_id == 1,
                        Product.departments.any(or_(Department.name.ilike("%رجال%"), Department.id == 1)),
                    )
                )
            elif cat_lower in ("women", "نسائي", "النساء"):
                stmt = stmt.where(
                    or_(
                        Product.gender.in_([Gender.WOMEN, Gender.UNISEX]),
                        Product.department_id == 2,
                        Product.departments.any(or_(Department.name.ilike("%نسا%"), Department.id == 2)),
                    )
                )
            else:
                legacy_map = {
                    "shoes": "الأحذية",
                    "bags": "الشنط",
                    "watches": "الساعات",
                    "glasses": "النظارات والإكسسوارات",
                    "sunglasses": "النظارات والإكسسوارات",
                }
                target_name = legacy_map.get(cat_lower, cat_str)
                stmt = stmt.where(
                    or_(
                        Product.categories.any(
                            or_(
                                func.lower(Category.name) == target_name.lower(),
                                Category.name.ilike(f"%{cat_str}%"),
                            )
                        ),
                        Product.category.has(
                            or_(
                                func.lower(Category.name) == target_name.lower(),
                                Category.name.ilike(f"%{cat_str}%"),
                            )
                        ),
                    )
                )

    dept_val = department_id if department_id is not None else department
    if dept_val is not None and str(dept_val).strip():
        dept_str = str(dept_val).strip()
        if dept_str.isdigit():
            d_id = int(dept_str)
            if d_id == 1:
                stmt = stmt.where(
                    or_(
                        Product.department_id == 1,
                        Product.gender.in_([Gender.MEN, Gender.UNISEX]),
                        Product.departments.any(Department.id == 1),
                    )
                )
            elif d_id == 2:
                stmt = stmt.where(
                    or_(
                        Product.department_id == 2,
                        Product.gender.in_([Gender.WOMEN, Gender.UNISEX]),
                        Product.departments.any(Department.id == 2),
                    )
                )
            else:
                stmt = stmt.where(
                    or_(
                        Product.department_id == d_id,
                        Product.departments.any(Department.id == d_id),
                    )
                )
        else:
            if dept_str.lower() in ("men", "رجالي", "الرجال"):
                stmt = stmt.where(
                    or_(
                        Product.department_id == 1,
                        Product.gender.in_([Gender.MEN, Gender.UNISEX]),
                        Product.departments.any(or_(Department.name.ilike("%رجال%"), Department.id == 1)),
                    )
                )
            elif dept_str.lower() in ("women", "نسائي", "النساء"):
                stmt = stmt.where(
                    or_(
                        Product.department_id == 2,
                        Product.gender.in_([Gender.WOMEN, Gender.UNISEX]),
                        Product.departments.any(or_(Department.name.ilike("%نسا%"), Department.id == 2)),
                    )
                )
            else:
                stmt = stmt.where(
                    or_(
                        Product.departments.any(Department.name.ilike(f"%{dept_str}%")),
                        Product.department.has(Department.name.ilike(f"%{dept_str}%")),
                    )
                )

    if gender:
        if gender == Gender.MEN:
            stmt = stmt.where(
                or_(
                    Product.gender.in_([Gender.MEN, Gender.UNISEX]),
                    Product.department_id == 1,
                    Product.departments.any(Department.id == 1),
                )
            )
        elif gender == Gender.WOMEN:
            stmt = stmt.where(
                or_(
                    Product.gender.in_([Gender.WOMEN, Gender.UNISEX]),
                    Product.department_id == 2,
                    Product.departments.any(Department.id == 2),
                )
            )
        elif gender == Gender.UNISEX:
            stmt = stmt.where(Product.gender == Gender.UNISEX)
        else:
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
def list_products(
    db: DB,
    category: str | int | None = None,
    category_path: str | int | None = None,
    department: str | int | None = None,
    department_id: int | None = None,
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
    cat = category if category is not None else category_path
    stmt = _apply_filters(
        select(Product).where(Product.is_active.is_(True)),
        category=cat,
        department=department,
        department_id=department_id,
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
            selectinload(Product.category),
            selectinload(Product.categories),
            selectinload(Product.department),
            selectinload(Product.departments),
            selectinload(Product.media),
            selectinload(Product.sizes),
            selectinload(Product.colors),
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ProductPage(total=total or 0, items=items)


@router.get("/filter-options")
def get_filter_options(
    db: DB,
    category: str | int | None = None,
    gender: Gender | None = None,
):
    """Returns available sizes, colors, and price min/max for dynamic UI filtering."""
    base = select(Product.id).where(Product.is_active.is_(True))
    if category is not None and str(category).strip():
        cat_str = str(category).strip()
        if cat_str.isdigit():
            c_id = int(cat_str)
            base = base.where(or_(Product.category_id == c_id, Product.categories.any(Category.id == c_id)))
        else:
            legacy_map = {
                "shoes": "الأحذية",
                "bags": "الشنط",
                "watches": "الساعات",
                "glasses": "النظارات والإكسسوارات",
                "sunglasses": "النظارات والإكسسوارات",
            }
            target_name = legacy_map.get(cat_str.lower(), cat_str)
            base = base.where(
                or_(
                    Product.categories.any(
                        or_(
                            func.lower(Category.name) == target_name.lower(),
                            Category.name.ilike(f"%{cat_str}%"),
                        )
                    ),
                    Product.category.has(
                        or_(
                            func.lower(Category.name) == target_name.lower(),
                            Category.name.ilike(f"%{cat_str}%"),
                        )
                    ),
                )
            )
    if gender:
        if gender == Gender.MEN:
            base = base.where(or_(Product.gender.in_([Gender.MEN, Gender.UNISEX]), Product.department_id == 1, Product.departments.any(Department.id == 1)))
        elif gender == Gender.WOMEN:
            base = base.where(or_(Product.gender.in_([Gender.WOMEN, Gender.UNISEX]), Product.department_id == 2, Product.departments.any(Department.id == 2)))
        elif gender == Gender.UNISEX:
            base = base.where(Product.gender == Gender.UNISEX)
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
            selectinload(Product.category),
            selectinload(Product.categories),
            selectinload(Product.department),
            selectinload(Product.departments),
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
    category: str | int | None = None,
    gender: Gender | None = None,
    q: str | None = Query(default=None, max_length=100),
    discounted: bool = False,
    low_stock: int | None = Query(default=None, ge=0, description="Only products with stock <= value"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    stmt = _apply_filters(select(Product), category=category, gender=gender, q=q, discounted=discounted)
    if low_stock is not None:
        stmt = stmt.where(Product.stock <= low_stock)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.options(
            selectinload(Product.category),
            selectinload(Product.categories),
            selectinload(Product.department),
            selectinload(Product.departments),
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
    category_ids = raw_data.pop("category_ids", []) or []
    department_ids = raw_data.pop("department_ids", []) or []

    # Handle multiple categories
    if raw_data.get("category_id") and raw_data["category_id"] not in category_ids:
        category_ids.append(raw_data["category_id"])

    if not category_ids and raw_data.get("category_id"):
        category_ids = [raw_data["category_id"]]

    if not category_ids:
        first_cat = db.scalars(select(Category).order_by(Category.id.asc())).first()
        if first_cat:
            category_ids = [first_cat.id]

    selected_categories = db.scalars(select(Category).where(Category.id.in_(category_ids))).all()
    if not selected_categories:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "التصنيف المحدد غير موجود")

    raw_data["category_id"] = selected_categories[0].id

    # Handle multiple departments / gender
    if raw_data.get("department_id") and raw_data["department_id"] not in department_ids:
        department_ids.append(raw_data["department_id"])

    selected_departments = []
    if department_ids:
        selected_departments = db.scalars(select(Department).where(Department.id.in_(department_ids))).all()
        raw_data["department_id"] = selected_departments[0].id
        has_men = any("رجال" in d.name for d in selected_departments) or 1 in department_ids
        has_women = any("نسا" in d.name for d in selected_departments) or 2 in department_ids
        if has_men and has_women:
            raw_data["gender"] = Gender.UNISEX
        elif has_women:
            raw_data["gender"] = Gender.WOMEN
        elif has_men:
            raw_data["gender"] = Gender.MEN
    elif raw_data.get("gender") == Gender.UNISEX:
        depts = db.scalars(select(Department).where(or_(Department.id.in_([1, 2]), Department.name.ilike("%رجال%"), Department.name.ilike("%نسا%")))).all()
        selected_departments = depts
        if depts:
            raw_data["department_id"] = depts[0].id

    is_shoes = any("حذاء" in c.name or "أحذية" in c.name or "shoes" in c.name.lower() for c in selected_categories)
    if is_shoes and sizes_data:
        raw_data["stock"] = sum(s["stock"] for s in sizes_data)

    product = Product(**raw_data, created_by_id=user.id)
    product.categories = list(selected_categories)
    product.departments = list(selected_departments)
    db.add(product)
    db.flush()

    if is_shoes and sizes_data:
        for s in sizes_data:
            product.sizes.append(ProductSize(size=s["size"], stock=s["stock"]))

    if colors_data:
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
    category_ids = raw.pop("category_ids", None)
    department_ids = raw.pop("department_ids", None)

    if category_ids is not None:
        if len(category_ids) > 0:
            cats = db.scalars(select(Category).where(Category.id.in_(category_ids))).all()
            if not cats:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "التصنيفات المحددة غير موجودة")
            product.categories = list(cats)
            product.category_id = cats[0].id
        else:
            product.categories = []
            product.category_id = None
    elif "category_id" in raw and raw["category_id"] is not None:
        cat = db.get(Category, raw["category_id"])
        if not cat:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "التصنيف المحدد غير موجود")
        product.category_id = cat.id
        if cat not in product.categories:
            product.categories = [cat]

    if department_ids is not None:
        if len(department_ids) > 0:
            depts = db.scalars(select(Department).where(Department.id.in_(department_ids))).all()
            product.departments = list(depts)
            product.department_id = depts[0].id
            has_men = any("رجال" in d.name for d in depts) or 1 in department_ids
            has_women = any("نسا" in d.name for d in depts) or 2 in department_ids
            if has_men and has_women:
                product.gender = Gender.UNISEX
            elif has_women:
                product.gender = Gender.WOMEN
            elif has_men:
                product.gender = Gender.MEN
        else:
            product.departments = []
            product.department_id = None
    elif "department_id" in raw and raw["department_id"] is not None:
        dept = db.get(Department, raw["department_id"])
        if dept:
            product.department_id = dept.id
            if dept not in product.departments:
                product.departments = [dept]

    for field, value in raw.items():
        setattr(product, field, value)

    if product.gender == Gender.UNISEX and len(product.departments) < 2:
        depts = db.scalars(select(Department).where(or_(Department.id.in_([1, 2]), Department.name.ilike("%رجال%"), Department.name.ilike("%نسا%")))).all()
        if depts:
            product.departments = list(depts)
            product.department_id = depts[0].id

    is_shoes = any("حذاء" in c.name or "أحذية" in c.name or "shoes" in c.name.lower() for c in product.categories) or bool(product.category and ("حذاء" in product.category.name or "أحذية" in product.category.name or "shoes" in product.category.name.lower()))

    if sizes_data is not None:
        product.sizes.clear()
        if is_shoes:
            for s in sizes_data:
                product.sizes.append(ProductSize(size=s["size"], stock=s["stock"]))
            product.stock = sum(s["stock"] for s in sizes_data)

    if colors_data is not None:
        product.colors.clear()
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
