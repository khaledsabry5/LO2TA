from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from ..deps import DB, CurrentUser
from ..models import User, UserRole
from ..schemas import CustomerRegister, Token, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: CustomerRegister, db: DB):
    """Public sign-up. Always creates a CUSTOMER – staff accounts are created by managers only."""
    email = data.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "البريد الإلكتروني مسجل بالفعل")
    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone=data.phone,
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DB):
    try:
        user = db.scalar(select(User).where(func.lower(User.email) == form.username.lower()))
    except OperationalError:
        # If database tables are not yet created or connection is broken, auto-initialize or raise 401
        try:
            from ..database import Base, engine
            from ..seed import ensure_first_manager, seed_products
            Base.metadata.create_all(bind=engine)
            manager = ensure_first_manager(db)
            seed_products(db, manager)
            user = db.scalar(select(User).where(func.lower(User.email) == form.username.lower()))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "الحساب موقوف")

    return Token(access_token=create_access_token(user.id, user.role.value))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
