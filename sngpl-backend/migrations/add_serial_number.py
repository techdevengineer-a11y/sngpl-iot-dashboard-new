"""
Migration: Add serial_number column to devices table
Run this once on the server: python migrations/add_serial_number.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.config import settings
from sqlalchemy import create_engine

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'devices' AND column_name = 'serial_number'"
    ))
    if result.fetchone():
        print("Column 'serial_number' already exists. Nothing to do.")
    else:
        conn.execute(text(
            "ALTER TABLE devices ADD COLUMN serial_number VARCHAR UNIQUE"
        ))
        conn.execute(text(
            "CREATE INDEX ix_devices_serial_number ON devices (serial_number)"
        ))
        conn.commit()
        print("Added 'serial_number' column to devices table.")
