from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (register models on metadata)
from .config import settings
from .database import Base, engine
from .routers import auth, categories, departments, manager, orders, products, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        from .database import Base, SessionLocal, engine
        from .seed import ensure_default_departments, ensure_first_admin, ensure_first_manager, seed_products

        # a) Create all database tables using Base.metadata.create_all
        Base.metadata.create_all(bind=engine)

        from sqlalchemy import text
        with engine.connect() as conn:
            # PostgreSQL ENUM unisex addition
            try:
                conn.execute(text("ALTER TYPE product_gender ADD VALUE IF NOT EXISTS 'unisex'"))
                conn.commit()
            except Exception:
                pass

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

            # Association tables creation & safe backfill
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS product_category_link (
                        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                        PRIMARY KEY (product_id, category_id)
                    )
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS product_department_link (
                        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                        department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
                        PRIMARY KEY (product_id, department_id)
                    )
                """))
                conn.commit()

                # Backfill product_category_link from existing category_id
                conn.execute(text("""
                    INSERT INTO product_category_link (product_id, category_id)
                    SELECT id, category_id FROM products
                    WHERE category_id IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM product_category_link pcl
                        WHERE pcl.product_id = products.id AND pcl.category_id = products.category_id
                    )
                """))

                # Backfill product_department_link from existing department_id
                conn.execute(text("""
                    INSERT INTO product_department_link (product_id, department_id)
                    SELECT id, department_id FROM products
                    WHERE department_id IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM product_department_link pdl
                        WHERE pdl.product_id = products.id AND pdl.department_id = products.department_id
                    )
                """))
                conn.commit()
            except Exception as e:
                print(f"[WARN] Association tables migration/backfill skipped: {e}")

        # b) Inject default Manager & Admin and c) Populate demo products & categories & departments
        with SessionLocal() as db:
            from sqlalchemy import or_, select, text
            from .models import Category, Department, Gender
            from .seed import MEN_DEPARTMENT_IMAGE, WOMEN_DEPARTMENT_IMAGE

            manager = ensure_first_manager(db)
            ensure_first_admin(db)
            ensure_default_departments(db)
            seed_products(db, manager)

            # Guard & heal: Guarantee Women's and Men's departments/categories have distinct, permanent images
            try:
                all_depts = db.scalars(select(Department)).all()
                for d in all_depts:
                    name_lower = d.name.lower()
                    if any(w in name_lower for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
                        if not d.image_url or "photo-1507679799987" in d.image_url or "men" in d.image_url.lower():
                            d.image_url = WOMEN_DEPARTMENT_IMAGE
                    elif any(w in name_lower for w in ("رجال", "رجالي", "men")):
                        if not d.image_url or "photo-1508214751196" in d.image_url or "women" in d.image_url.lower():
                            d.image_url = MEN_DEPARTMENT_IMAGE
                db.commit()
            except Exception as e:
                print(f"[WARN] Healing department images skipped: {e}")

            # Auto-link products to departments based on gender if department_id is null
            try:
                dept_men = db.scalar(select(Department).where(Department.name.ilike("%رجال%")))
                dept_women = db.scalar(select(Department).where(or_(Department.name.ilike("%نسا%"), Department.name.ilike("%women%"))))
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


app = FastAPI(
    title=settings.APP_NAME,
    description="YSN Accessories Store API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, categories.router, departments.router, products.router, orders.router, manager.router, users.router):
    app.include_router(r, prefix="/api")

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


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
