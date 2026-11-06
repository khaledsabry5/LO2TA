from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ..deps import DB, StaffUser
from ..models import PageView
from ..schemas import PageViewOut, PageViewTrack

router = APIRouter(tags=["page_views"])


@router.post("/track-view", response_model=PageViewOut, status_code=status.HTTP_200_OK)
def track_page_view(data: PageViewTrack, db: DB):
    """Ultra-fast, unauthenticated endpoint to record a page view.

    Increments view_count by 1 if page_path exists, or inserts a new record with view_count=1.
    """
    raw_path = data.page_path.strip()
    if not raw_path:
        raw_path = "/"
    if not raw_path.startswith("/"):
        raw_path = "/" + raw_path

    # Cut off query params or hash if inadvertently provided, or keep clean path
    page_path = raw_path.split("?")[0].split("#")[0] or "/"

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
    """Protected endpoint to retrieve all page views sorted by view_count descending."""
    return db.scalars(select(PageView).order_by(PageView.view_count.desc(), PageView.page_path.asc())).all()
