from datetime import datetime, timedelta, timezone
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from ..deps import DB, CurrentUser
from ..mailer import send_otp_email
from ..models import EmailOTP, User, UserRole
from ..schemas import (
    CustomerRegister,
    RequestOTPIn,
    Token,
    UserOut,
    VerifyOTPIn,
    normalize_egyptian_phone,
)
from ..security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp")
async def request_otp(data: RequestOTPIn, db: DB):
    """Generates a 6-digit OTP for the given email, saves it with a 10-minute expiry,

    and sends it to the user's email via Brevo HTTP API.
    """
    clean_email = data.email.strip().lower()

    # Verify that the user exists in the database
    user = db.scalar(select(User).where(func.lower(User.email) == clean_email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني. يرجى التحقق من البريد أو إنشاء حساب جديد.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="هذا الحساب موقوف، يرجى التواصل مع الإدارة.",
        )

    # Generate a cryptographically secure 6-digit OTP code
    otp_code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Clean up old OTP records for this email
    db.execute(delete(EmailOTP).where(func.lower(EmailOTP.email) == clean_email))

    # Save the new OTP
    otp_record = EmailOTP(
        email=clean_email,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(otp_record)
    db.commit()

    # Send the OTP via Brevo HTTP API
    try:
        await send_otp_email(user.email, otp_code)
    except Exception as e:
        # If sending fails, rollback or alert user
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل إرسال رمز التحقق إلى بريدك الإلكتروني: {str(e)}",
        )

    return {
        "success": True,
        "message": f"تم إرسال رمز التحقق المكون من 6 أرقام إلى {user.email}",
        "email": user.email,
    }


@router.post("/verify-otp")
def verify_otp(data: VerifyOTPIn, db: DB):
    """Validates the OTP code against the database.

    If valid, returns the JWT access token and user role.
    """
    clean_email = data.email.strip().lower()
    otp_code = data.otp.strip()

    now = datetime.now(timezone.utc)

    # Find matching valid OTP
    otp_record = db.scalar(
        select(EmailOTP).where(
            func.lower(EmailOTP.email) == clean_email,
            EmailOTP.otp_code == otp_code,
            EmailOTP.expires_at >= now,
        )
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="رمز التحقق غير صحيح أو انتهت صلاحيته (صلاحية الرمز 10 دقائق).",
        )

    # Retrieve user
    user = db.scalar(select(User).where(func.lower(User.email) == clean_email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="لم يتم العثور على حساب مرتبط بهذا البريد.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="هذا الحساب موقوف، يرجى التواصل مع الإدارة.",
        )

    # Remove used OTP records for this email
    db.execute(delete(EmailOTP).where(func.lower(EmailOTP.email) == clean_email))
    db.commit()

    token = create_access_token(user.id, user.role.value)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
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


@router.post("/register")
def register(data: CustomerRegister, db: DB):
    """Public customer sign-up (Passwordless).

    Creates the customer account so they can receive OTPs.
    """
    email = data.email.strip().lower()
    phone = normalize_egyptian_phone(data.phone.strip())
    full_name = " ".join(data.full_name.strip().split())

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
        "role": user.role.value,
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


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
