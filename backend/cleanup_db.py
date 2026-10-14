"""Deduplication and database cleanup script for YSN Store.

Safely merges duplicate customer accounts based on:
1. Normalized phone numbers (e.g. +201096417408 vs 010986417408 / 01096417408)
2. Case-insensitive Full Name
3. Case-insensitive Email

Preserves order history by re-pointing order references to the keeper account
before removing duplicate user accounts. Finally, applies unique indexes.
"""
import os
import re
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules can be imported
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import User, Order, Product, UserRole


def normalize_egyptian_phone(value: str | None) -> str | None:
    if not value or not isinstance(value, str):
        return None
    # Strip arabic numerals
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    cleaned = value.strip()
    for i, d in enumerate(arabic_digits):
        cleaned = cleaned.replace(d, str(i))
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", cleaned)
    if not cleaned:
        return None

    if cleaned.startswith("+201"):
        return cleaned
    if cleaned.startswith("00201"):
        return "+" + cleaned[2:]
    if cleaned.startswith("201"):
        return "+" + cleaned
    if cleaned.startswith("01"):
        return "+2" + cleaned
    if cleaned.startswith("1") and len(cleaned) == 10 and cleaned[1] in "0125":
        return "+20" + cleaned
    return cleaned


def cleanup_and_deduplicate(db_session=None):
    close_at_end = False
    if db_session is None:
        db = SessionLocal()
        close_at_end = True
    else:
        db = db_session

    try:
        users = db.query(User).order_by(User.id.asc()).all()
        print(f"[*] Found {len(users)} users in database. Checking for duplicates...")

        # 1. Normalize existing phones in memory & update trimmed names
        for u in users:
            if u.phone:
                u.phone = normalize_egyptian_phone(u.phone)
            if u.email:
                u.email = u.email.strip().lower()
            if u.full_name:
                u.full_name = " ".join(u.full_name.strip().split())

        db.flush()

        # 2. Find duplicates by email, normalized phone, or full_name
        # We group users that match ANY of these three fields
        merged_ids = set()
        user_list = [u for u in users if u.id not in merged_ids]

        for i, u1 in enumerate(user_list):
            if u1.id in merged_ids:
                continue

            duplicates = []
            for u2 in user_list[i + 1:]:
                if u2.id in merged_ids:
                    continue

                email_match = u1.email and u2.email and (u1.email.lower() == u2.email.lower())
                name_match = u1.full_name and u2.full_name and (u1.full_name.lower() == u2.full_name.lower())
                phone_match = u1.phone and u2.phone and (u1.phone == u2.phone)

                if email_match or name_match or phone_match:
                    duplicates.append(u2)

            if duplicates:
                # Prefer keeping staff if one is staff, or prefer the record with normalized phone / latest activity
                all_cluster = [u1] + duplicates
                # Pick keeper: staff first, else highest id (or one with phone)
                keeper = max(
                    all_cluster,
                    key=lambda x: (
                        1 if x.role in (UserRole.MANAGER, UserRole.ADMIN) else 0,
                        1 if (x.phone and x.phone.startswith("+201")) else 0,
                        x.id
                    )
                )

                to_delete = [u for u in all_cluster if u.id != keeper.id]
                print(f"[!] Duplicate cluster found for '{keeper.full_name}': Keeping ID {keeper.id}, Merging IDs: {[d.id for d in to_delete]}")

                for dup in to_delete:
                    # Reassign orders
                    dup_orders = db.query(Order).filter(Order.customer_id == dup.id).all()
                    for order in dup_orders:
                        print(f"    -> Migrated Order #{order.id} from User {dup.id} to User {keeper.id}")
                        order.customer_id = keeper.id

                    # Reassign products created_by_id
                    dup_products = db.query(Product).filter(Product.created_by_id == dup.id).all()
                    for prod in dup_products:
                        prod.created_by_id = keeper.id

                    # Reassign user created_by_id
                    child_users = db.query(User).filter(User.created_by_id == dup.id).all()
                    for child in child_users:
                        child.created_by_id = keeper.id

                    # Delete the duplicate record
                    db.delete(dup)
                    merged_ids.add(dup.id)

        db.commit()
        print("[OK] Duplicate user accounts successfully merged and cleaned.")

        # 3. Create unique indexes to enforce uniqueness at the database level
        with engine.connect() as conn:
            is_sqlite = "sqlite" in engine.url.drivername
            print("[*] Enforcing unique constraints in database...")
            if is_sqlite:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone ON users(phone)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_full_name ON users(full_name)"))
                conn.commit()
            else:
                # PostgreSQL
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(lower(email))"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone ON users(phone)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_full_name ON users(lower(full_name))"))
                conn.commit()

        print("[OK] Database unique indexes verified and enforced successfully.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed during cleanup: {e}", file=sys.stderr)
        raise
    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    cleanup_and_deduplicate()
