"""
Migration: Add connectivity columns to devices table.
Run once on the server:  python migrations/add_connectivity_columns.py

devices (new connectivity columns):
  - signal_strength  INTEGER       (RSSI dBm from latest MQTT message)
  - network_type     VARCHAR(8)    ('4G' | '3G' | 'LTE' from latest MQTT message)

Idempotent — re-running skips existing columns.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

DEVICE_COLUMNS = {
    "signal_strength": "INTEGER",
    "network_type": "VARCHAR(8)",
}


def column_exists(conn, table, col):
    row = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :col"
    ), {"table": table, "col": col}).fetchone()
    return row is not None


with engine.connect() as conn:
    for col, ddl in DEVICE_COLUMNS.items():
        if column_exists(conn, "devices", col):
            print(f"[devices] Column '{col}' already exists. Skipping.")
        else:
            conn.execute(text(f"ALTER TABLE devices ADD COLUMN {col} {ddl}"))
            print(f"[devices] Added '{col}' {ddl}.")
    conn.commit()

print("Migration complete.")
