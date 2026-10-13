"""Migration script to transition Categories from Enum to dynamic table in Lo2ta store."""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "lo2ta.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Create categories table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        image_url VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Add category_id to products if not exists
    cur.execute("PRAGMA table_info(products)")
    cols = [c[1] for c in cur.fetchall()]
    if "category_id" not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)")

    # 3. Insert default 4 categories
    defaults = [
        ("الأحذية", "/images/products/sneaker.jpg"),
        ("الشنط", "/images/products/handbag.jpg"),
        ("الساعات", "/images/products/steel-watch.jpg"),
        ("النظارات والإكسسوارات", "/images/products/sunglasses.jpg"),
    ]

    for name, img in defaults:
        cur.execute("INSERT OR IGNORE INTO categories (name, image_url) VALUES (?, ?)", (name, img))

    conn.commit()

    # 4. Map existing products
    cur.execute("UPDATE products SET category_id = 1 WHERE category = 'shoes' OR (category_id IS NULL AND (name LIKE '%حذاء%' OR name LIKE '%خفية%' OR name LIKE '%كعب%'))")
    cur.execute("UPDATE products SET category_id = 2 WHERE category = 'bags' OR (category_id IS NULL AND (name LIKE '%حقيبة%' OR name LIKE '%محفظة%'))")
    cur.execute("UPDATE products SET category_id = 3 WHERE category = 'watches' OR (category_id IS NULL AND name LIKE '%ساعة%')")
    cur.execute("UPDATE products SET category_id = 1 WHERE category_id IS NULL")
    conn.commit()

    cur.execute("SELECT id, name, image_url FROM categories")
    cats = cur.fetchall()
    print(f"Categories in DB: {len(cats)}")

    cur.execute("SELECT category_id, COUNT(*) FROM products GROUP BY category_id")
    print("Products by category_id:", cur.fetchall())
    conn.close()

if __name__ == "__main__":
    migrate()
