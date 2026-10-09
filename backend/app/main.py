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
    # For production schema evolution, introduce Alembic migrations.
    Base.metadata.create_all(bind=engine)
    try:
        from .database import SessionLocal
        from .seed import ensure_first_manager, seed_products
        with SessionLocal() as db:
            m = ensure_first_manager(db)
            seed_products(db, m)
    except Exception as e:
        print(f"[WARN] Auto-seed skipped: {e}")
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
