import re
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload

from ..deps import DB, StaffUser
from ..models import PageView, Product
from ..schemas import PageViewOut, PageViewTrack

router = APIRouter(tags=["page_views"])

PRODUCT_PATH_REGEX = re.compile(r"^/product/(\d+)/?$")


def is_allowed_path(path: str) -> bool:
    if path == "/" or PRODUCT_PATH_REGEX.match(path):
        return True
    return False


@router.post("/track-view", response_model=PageViewOut, status_code=status.HTTP_200_OK)
def track_page_view(data: PageViewTrack, db: DB):
    """Ultra-fast, unauthenticated endpoint to record a page view.

    Only tracks '/' (Home Page) and '/product/:id'. Ignores any other path.
    Increments view_count by 1 if page_path exists, or inserts a new record with view_count=1.
    """
    raw_path = data.page_path.strip()
    if not raw_path:
        raw_path = "/"
    if not raw_path.startswith("/"):
        raw_path = "/" + raw_path

    # Cut off query params or hash if inadvertently provided, or keep clean path
    clean_path = raw_path.split("?")[0].split("#")[0] or "/"

    # Normalize trailing slash for product (e.g. /product/12/ -> /product/12)
    match = PRODUCT_PATH_REGEX.match(clean_path)
    if match:
        page_path = f"/product/{match.group(1)}"
    elif clean_path == "/":
        page_path = "/"
    else:
        # Silently ignore non-tracked pages
        return {"id": 0, "page_path": clean_path, "view_count": 0}

    is_postgres = "postgresql" in db.bind.dialect.name
    if is_postgres:
        stmt = (
            pg_insert(PageView)
            .values(page_path=page_path, view_count=1)
            .on_conflict_do_update(
                index_elements=[PageView.page_path],
                set_={"view_count": PageView.view_count + 1},
            )
            .returning(PageView)
        )
        record = db.scalar(stmt)
        db.commit()
        return record
    else:
        # SQLite / Generic Fallback
        record = db.scalar(select(PageView).where(PageView.page_path == page_path))
        if record:
            record.view_count += 1
        else:
            record = PageView(page_path=page_path, view_count=1)
            db.add(record)
        db.commit()
        db.refresh(record)
        return record


@router.get("/admin/page-views", response_model=list[PageViewOut])
def get_admin_page_views(db: DB, _: StaffUser):
    """Protected endpoint to retrieve all page views sorted by view_count descending.

    Filters out or cleans any non-home/non-product paths, and enriches products with
    Product Name and primary Image URL, and Home Page with 'الصفحة الرئيسية'.
    """
    # 1. Fetch all records
    records = db.scalars(select(PageView).order_by(PageView.view_count.desc(), PageView.page_path.asc())).all()

    # 2. Separate valid records from irrelevant ones
    valid_records: list[PageView] = []
    invalid_ids: list[int] = []
    product_ids: set[int] = set()

    for r in records:
        path = r.page_path.strip()
        if path == "/":
            valid_records.append(r)
        else:
            m = PRODUCT_PATH_REGEX.match(path)
            if m:
                valid_records.append(r)
                product_ids.add(int(m.group(1)))
            else:
                invalid_ids.append(r.id)

    # 3. Clean up irrelevant/old paths from database
    if invalid_ids:
        try:
            db.execute(delete(PageView).where(PageView.id.in_(invalid_ids)))
            db.commit()
        except Exception:
            db.rollback()

    # 4. Fetch products to enrich product titles and primary image URLs
    products_map: dict[int, Product] = {}
    if product_ids:
        loaded_prods = db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(selectinload(Product.media))
        ).all()
        for p in loaded_prods:
            products_map[p.id] = p

    # 5. Build enriched response
    enriched_results = []
    for r in valid_records:
        path = r.page_path.strip()
        if path == "/":
            title = "الصفحة الرئيسية"
            image_url = None
            prod_id = None
        else:
            m = PRODUCT_PATH_REGEX.match(path)
            prod_id = int(m.group(1)) if m else None
            prod = products_map.get(prod_id) if prod_id else None
            if prod:
                title = prod.name
                first_media = prod.media[0] if (prod.media and len(prod.media) > 0) else None
                image_url = first_media.url if first_media else None
            else:
                title = f"منتج #{prod_id}" if prod_id else path
                image_url = None

        enriched_results.append({
            "id": r.id,
            "page_path": path,
            "view_count": r.view_count,
            "title": title,
            "image_url": image_url,
            "product_id": prod_id,
        })

    return enriched_results
