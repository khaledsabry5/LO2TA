"""User management endpoints (e.g. deleting users and staff)."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from ..deps import DB, StaffUser
from ..models import User, UserRole

router = APIRouter(prefix="/users", tags=["users"])


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: DB, current_user: StaffUser):
    """Delete a user (supervisor, customer, or staff) and clean up / decouple associated data.

    Only users with 'Manager' or 'Admin' role are authorized.
    Returns 403 Forbidden if a user lacks sufficient privileges.
    """
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود",
        )

    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="لا يمكنك حذف حسابك الخاص",
        )

    # An admin cannot delete a manager
    if current_user.role == UserRole.ADMIN and target.role == UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف حساب مدير",
        )

    # 1. Decouple staff created by this user
    db.execute(
        text("UPDATE users SET created_by_id = NULL WHERE created_by_id = :uid"),
        {"uid": user_id},
    )

    # 2. Decouple products created by this user
    db.execute(
        text("UPDATE products SET created_by_id = NULL WHERE created_by_id = :uid"),
        {"uid": user_id},
    )

    # 3. Decouple orders placed by this customer (retaining sales snapshots)
    db.execute(
        text("UPDATE orders SET customer_id = NULL WHERE customer_id = :uid"),
        {"uid": user_id},
    )

    # 4. Remove any pending OTP codes for this user
    if target.email:
        db.execute(
            text("DELETE FROM email_otps WHERE LOWER(email) = LOWER(:email)"),
            {"email": target.email},
        )

    # 5. Delete the user
    user_name = target.full_name
    db.delete(target)
    db.commit()

    return {
        "success": True,
        "message": f"تم حذف المستخدم {user_name} وبياناته المرتبطة بنجاح",
        "deleted_user_id": user_id,
    }
