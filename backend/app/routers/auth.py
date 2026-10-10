import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from ..deps import DB, CurrentUser
from ..models import User, UserRole
from ..schemas import (
    CustomerPasswordlessLogin,
    CustomerRegister,
    STAFF_PASSWORD_REGEX,
    Token,
    UserOut,
    normalize_egyptian_phone,
)
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(data: CustomerRegister, db: DB):
    """Public customer sign-up (Passwordless).

    Enforces:
    - Full Name: At least two names (handled by schema validator)
    - Phone: Normalized Egyptian format (+201[0125]xxxxxxxx)
    - Password: None required
    - Strictly prevents duplicate customer accounts based on Email, Phone, and Full Name.
    """
    email = data.email.strip().lower()
    phone = normalize_egyptian_phone(data.phone.strip())
    full_name = " ".join(data.full_name.strip().split())

    # Pre-registration check: query DB using or_ from SQLAlchemy to check if ANY user
    # already exists with the provided email, normalized phone, OR full name
    existing = db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == email,
                User.phone == phone,
                func.lower(User.full_name) == func.lower(full_name),
            )
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الاسم أو البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل في حساب آخر.",
        )

    user = User(
        email=email,
        hashed_password="passwordless",  # Passwordless customer
        full_name=full_name,
        phone=phone,
        role=UserRole.CUSTOMER,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الاسم أو البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل في حساب آخر.",
        )
    db.refresh(user)

    token = create_access_token(user.id, user.role.value)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at,
        },
    }


@router.post("/passwordless-login")
def passwordless_login(data: CustomerPasswordlessLogin, db: DB):
    """Passwordless login for customers by Egyptian phone or email."""
    raw = data.identifier.strip()
    clean_lower = raw.lower()
    norm_phone = normalize_egyptian_phone(raw)

    conditions = [func.lower(User.email) == clean_lower, User.phone == raw]
    if norm_phone:
        conditions.append(User.phone == norm_phone)
    if raw.startswith("01"):
        conditions.append(User.phone == f"+2{raw}")
    elif raw.startswith("1"):
        conditions.append(User.phone == f"+20{raw}")

    user = db.scalar(select(User).where(or_(*conditions)))
    if not user or user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="لم يتم العثور على حساب عميل مسجل بهذا البريد أو الهاتف. يرجى إنشاء حساب جديد.",
        )

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "الحساب موقوف")

    token = create_access_token(user.id, user.role.value)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at,
        },
    }


@router.post("/login", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DB):
    """Staff login (Manager & Admin).

    Enforces strict 4-character alphanumeric password policy (Regex: ^[a-zA-Z0-9]{4}$).
    """
    target_username = form.username.strip().lower()
    lookup_emails = [target_username]
    if "@" not in target_username:
        lookup_emails.append(f"{target_username}@lo2ta.com")

    try:
        user = db.scalar(select(User).where(func.lower(User.email).in_(lookup_emails)))
    except Exception:
        # If database tables are not yet created, auto-initialize
        try:
            from ..database import Base, engine
            from ..seed import ensure_first_admin, ensure_first_manager, seed_products

            Base.metadata.create_all(bind=engine)
            manager = ensure_first_manager(db)
            ensure_first_admin(db)
            seed_products(db, manager)
            user = db.scalar(select(User).where(func.lower(User.email).in_(lookup_emails)))
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

    # For staff (admin/manager), enforce 4-character alphanumeric password policy
    if user.role in (UserRole.MANAGER, UserRole.ADMIN):
        if not re.match(STAFF_PASSWORD_REGEX, form.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="كلمة مرور المشرف/المدير يجب أن تتكون من 4 خانات وحروف أو أرقام إنجليزية فقط (Regex: ^[a-zA-Z0-9]{4}$)",
            )

    # Verify password against hash
    valid_pass = False
    if user.hashed_password:
        valid_pass = verify_password(form.password, user.hashed_password)

    # Default fallback for initial convenience
    if not valid_pass:
        if form.password == "1234" and user.email in ("admin@lo2ta.com", "manager@lo2ta.com"):
            valid_pass = True

    if not valid_pass:
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
