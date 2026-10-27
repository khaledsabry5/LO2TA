import sys
from decimal import Decimal
from sqlalchemy import inspect, text

from app.database import engine

def migrate():
    print("Running cost_price migration...")
    dialect = engine.dialect.name
    with engine.connect() as conn:
        inspector = inspect(conn)
        
        # 1. products table
        product_cols = [c["name"] for c in inspector.get_columns("products")]
        if "cost_price" not in product_cols:
            print("Adding cost_price to products...")
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE products ADD COLUMN cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0"))
            conn.commit()
            print("cost_price added to products successfully.")
        else:
            print("cost_price already exists in products.")

        # Ensure all existing products have cost_price = 0 if null
        conn.execute(text("UPDATE products SET cost_price = 0 WHERE cost_price IS NULL"))
        conn.commit()

        # 2. order_items table
        order_item_cols = [c["name"] for c in inspector.get_columns("order_items")]
        if "cost_price" not in order_item_cols:
            print("Adding cost_price to order_items...")
            if dialect == "sqlite":
                conn.execute(text("ALTER TABLE order_items ADD COLUMN cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0"))
            conn.commit()
            print("cost_price added to order_items successfully.")
        else:
            print("cost_price already exists in order_items.")

        conn.execute(text("UPDATE order_items SET cost_price = 0 WHERE cost_price IS NULL"))
        conn.commit()

    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
