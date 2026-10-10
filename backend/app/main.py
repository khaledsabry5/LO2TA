from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (register models on metadata)
from .config import settings
from .database import Base, engine
from .routers import auth, manager, orders, products


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        from .database import Base, SessionLocal, engine
        from .seed import ensure_first_admin, ensure_first_manager, seed_products

        # a) Create all database tables using Base.metadata.create_all
        Base.metadata.create_all(bind=engine)

        # b) Inject default Manager & Admin and c) Populate demo products
        with SessionLocal() as db:
            manager = ensure_first_manager(db)
            ensure_first_admin(db)
            seed_products(db, manager)
        print("[OK] Database tables created and demo data seeded successfully on startup")
    except Exception as e:
        print(f"[WARN] Database startup initialization or seed skipped: {e}")
    yield


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, products.router, orders.router, manager.router):
    app.include_router(r, prefix="/api")

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
