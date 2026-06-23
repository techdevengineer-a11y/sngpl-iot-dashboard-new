"""
Migration: Add `full_name` to users + rename the main admin account.

Run once on the server:  python migrations/add_full_name_and_rename_admin.py

What it does (all idempotent / safe to re-run):
  1. users.full_name  VARCHAR  -- display name shown in the UI (falls back to username)
  2. Renames the main admin login from 'admin' to 'shahid_shaukat'
     and sets its display name to 'Shahid Shaukat'. Password is NOT changed.

Notes:
  - If a user 'shahid_shaukat' already exists, the rename step is skipped.
  - If there is no 'admin' user, only the column is added.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

OLD_USERNAME = "admin"
NEW_USERNAME = "shahid_shaukat"
DISPLAY_NAME = "Shahid Shaukat"


def column_exists(conn, table, col):
    row = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :col"
    ), {"table": table, "col": col}).fetchone()
    return row is not None


with engine.connect() as conn:
    # 1. Add full_name column
    if column_exists(conn, "users", "full_name"):
        print("[users] Column 'full_name' already exists. Skipping.")
    else:
        conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
        print("[users] Added 'full_name' VARCHAR.")
    conn.commit()

    # 2. Rename the main admin account + set display name
    taken = conn.execute(
        text("SELECT id FROM users WHERE username = :u"), {"u": NEW_USERNAME}
    ).fetchone()
    admin_row = conn.execute(
        text("SELECT id FROM users WHERE username = :u"), {"u": OLD_USERNAME}
    ).fetchone()

    if taken:
        print(f"[users] '{NEW_USERNAME}' already exists. Skipping rename.")
        # Still make sure the display name is set.
        conn.execute(
            text("UPDATE users SET full_name = :fn WHERE username = :u AND (full_name IS NULL OR full_name = '')"),
            {"fn": DISPLAY_NAME, "u": NEW_USERNAME},
        )
        conn.commit()
    elif admin_row:
        conn.execute(
            text("UPDATE users SET username = :new, full_name = :fn WHERE username = :old"),
            {"new": NEW_USERNAME, "fn": DISPLAY_NAME, "old": OLD_USERNAME},
        )
        conn.commit()
        print(f"[users] Renamed '{OLD_USERNAME}' -> '{NEW_USERNAME}' (display: '{DISPLAY_NAME}'). Password unchanged.")
    else:
        print(f"[users] No '{OLD_USERNAME}' user found. Rename skipped.")

print("Migration complete.")
