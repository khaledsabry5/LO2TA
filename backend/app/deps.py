"""Authentication & Role-Based Access Control dependencies.

Usage in routes:
    def endpoint(user: ManagerUser): ...   # manager only
    def endpoint(user: StaffUser): ...     # manager OR admin
    def endpoint(user: CustomerUser): ...  # customer only
    def endpoint(user: CurrentUser): ...   # any authenticated active user

The role is always re-read from the database on every request (never trusted
from the JWT), so demoting / deactivating an account takes effect immediately.
"""
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, UserRole
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/verify-otp")

DB = Annotated[Session, Depends(get_db)]

_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="بيانات الدخول غير صالحة أو منتهية",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(db: DB, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _credentials_error

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _credentials_error
    return user


def require_roles(*roles: UserRole):
    allowed = set(roles)

    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية للوصول")
        return user

    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
ManagerUser = Annotated[User, Depends(require_roles(UserRole.MANAGER))]
StaffUser = Annotated[User, Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))]
CustomerUser = Annotated[User, Depends(require_roles(UserRole.CUSTOMER))]
