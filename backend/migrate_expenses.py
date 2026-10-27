import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "lo2ta.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount NUMERIC(10, 2) NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("Expenses table created or verified successfully in SQLite.")
    conn.close()
else:
    print("lo2ta.db does not exist locally yet.")
