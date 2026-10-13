from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (register models on metadata)
from .config import settings
from .database import Base, engine
from .routers import auth, categories, departments, manager, orders, products


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        from .database import Base, SessionLocal, engine
        from .seed import ensure_default_departments, ensure_first_admin, ensure_first_manager, seed_products

        # a) Create all database tables using Base.metadata.create_all
        Base.metadata.create_all(bind=engine)

        from sqlalchemy import text
        with engine.connect() as conn:
            if "sqlite" in engine.url.drivername:
                for col in (
                    "selected_size INTEGER",
                    "selected_color VARCHAR(50)",
                    "category_id INTEGER REFERENCES categories(id)",
                ):
                    try:
                        conn.execute(text(f"ALTER TABLE order_items ADD COLUMN {col}"))
                        conn.commit()
                    except Exception:
                        pass
                try:
                    conn.execute(text("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE products ADD COLUMN department_id INTEGER REFERENCES departments(id)"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(text("DROP INDEX IF EXISTS ix_products_category_gender"))
                    conn.execute(text("ALTER TABLE products DROP COLUMN category"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_category_gender ON products (category_id, gender)"))
                    conn.commit()
                except Exception:
                    pass

        # b) Inject default Manager & Admin and c) Populate demo products & categories & departments
        with SessionLocal() as db:
            manager = ensure_first_manager(db)
            ensure_first_admin(db)
            ensure_default_departments(db)
            seed_products(db, manager)

            # Auto-link products to departments based on gender if department_id is null
            try:
                from .models import Department, Gender
                dept_men = db.scalar(select(Department).where(Department.name.ilike("%رجال%")))
                dept_women = db.scalar(select(Department).where(Department.name.ilike("%نساء%")))
                if dept_men:
                    db.execute(text(f"UPDATE products SET department_id = {dept_men.id} WHERE (department_id IS NULL OR department_id = 0) AND gender = 'men'"))
                if dept_women:
                    db.execute(text(f"UPDATE products SET department_id = {dept_women.id} WHERE (department_id IS NULL OR department_id = 0) AND gender = 'women'"))
                db.commit()
            except Exception as e:
                print(f"[WARN] Auto-linking products to departments skipped: {e}")

        # d) Ensure duplicate accounts are cleaned and unique indexes enforced safely
        try:
            from cleanup_db import cleanup_and_deduplicate
            cleanup_and_deduplicate()
        except Exception as e:
            print(f"[WARN] Deduplication check skipped: {e}")

        print("[OK] Database tables created, deduplicated, and demo data seeded successfully on startup")
    except Exception as e:
        print(f"[WARN] Database startup initialization or seed skipped: {e}")
    yield


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, categories.router, departments.router, products.router, orders.router, manager.router):
    app.include_router(r, prefix="/api")

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import os
    import sys

    backend_dir = Path(__file__).resolve().parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
