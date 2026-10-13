"""Reset Users Script for YSN Accessories Store.

Deletes ALL existing users and seeds exactly ONE initial user:
email: lo2tastore2026@gmail.com
role: MANAGER (highest privileges and full access to dashboard, analytics, orders, products, etc.)
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.database import Base, SessionLocal, engine
from app.models import EmailOTP, Order, Product, User, UserRole


def reset_and_seed_single_admin():
    print("[*] Starting users table reset...")

    # Ensure all tables (including email_otps) are created
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        try:
            # 1. Clear foreign key references pointing to users
            print("[*] Clearing foreign key references in orders and products...")
            db.execute(text("UPDATE orders SET customer_id = NULL"))
            db.execute(text("UPDATE products SET created_by_id = NULL"))
            db.execute(text("UPDATE users SET created_by_id = NULL"))
            db.commit()

            # 2. Delete all existing users and OTPs
            deleted_otps = db.query(EmailOTP).delete()
            deleted_users = db.query(User).delete()
            db.commit()
            print(f"[OK] Deleted {deleted_users} existing users and {deleted_otps} OTPs from the database.")

            # 3. Create exactly ONE user with lo2tastore2026@gmail.com
            new_manager = User(
                email="lo2tastore2026@gmail.com",
                full_name="مدير المتجر",
                role=UserRole.MANAGER,
                phone=None,
                is_active=True,
                hashed_password="passwordless",
            )
            db.add(new_manager)
            db.commit()
            db.refresh(new_manager)

            # 4. Reassign products to this new manager
            db.execute(text(f"UPDATE products SET created_by_id = {new_manager.id}"))
            db.commit()

            print("[SUCCESS] Exactly ONE user created:")
            print(f"  - ID: {new_manager.id}")
            print(f"  - Email: {new_manager.email}")
            print(f"  - Role: {new_manager.role.value} (Highest permissions: MANAGER)")
            print(f"  - Active: {new_manager.is_active}")

        except Exception as e:
            db.rollback()
            print(f"[ERROR] Failed to reset users: {e}", file=sys.stderr)
            raise


if __name__ == "__main__":
    reset_and_seed_single_admin()
