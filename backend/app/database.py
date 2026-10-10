from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import BASE_DIR, settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20})

try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
    if not is_sqlite:
        with engine.connect() as conn:
            pass
except Exception as e:
    print(f"[WARN] Could not connect to {settings.DATABASE_URL} ({e}). Falling back to local SQLite.")
    sqlite_url = f"sqlite:///{BASE_DIR.as_posix()}/lo2ta.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
