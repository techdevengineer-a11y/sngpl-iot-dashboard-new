"""Migrate database to fix AlarmThreshold table"""

import sqlite3
import os
import shutil
from datetime import datetime

DB_PATH = "sngpl_iot.db"

def migrate_database():
    """Migrate alarm_thresholds table to add device_id and is_active columns"""

    print("Starting database migration...")

    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    # Create backup
    backup_path = f"sngpl_iot_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    print(f"Creating backup: {backup_path}")
    shutil.copy2(DB_PATH, backup_path)

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if device_id column exists
        cursor.execute("PRAGMA table_info(alarm_thresholds)")
        columns = [col[1] for col in cursor.fetchall()]

        print(f"Current columns: {columns}")

        if 'device_id' not in columns:
            print("Adding device_id column...")

            # Rename old table
            cursor.execute("ALTER TABLE alarm_thresholds RENAME TO alarm_thresholds_old")

            # Create new table with correct schema
            cursor.execute("""
                CREATE TABLE alarm_thresholds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER,
                    parameter VARCHAR NOT NULL,
                    low_threshold FLOAT,
                    high_threshold FLOAT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (device_id) REFERENCES devices(id)
                )
            """)

            # Copy data from old table (skip user_id, set device_id to NULL for now)
            cursor.execute("""
                INSERT INTO alarm_thresholds (id, parameter, low_threshold, high_threshold, is_active, created_at, updated_at)
                SELECT id, parameter, low_threshold, high_threshold, 1, created_at, updated_at
                FROM alarm_thresholds_old
            """)

            # Drop old table
            cursor.execute("DROP TABLE alarm_thresholds_old")

            print("  device_id column added successfully")
        else:
            print("  device_id column already exists")

        # Check again after recreating table
        cursor.execute("PRAGMA table_info(alarm_thresholds)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'is_active' not in columns:
            print("Adding is_active column...")
            cursor.execute("ALTER TABLE alarm_thresholds ADD COLUMN is_active BOOLEAN DEFAULT 1")
            print("  is_active column added successfully")
        else:
            print("  is_active column already exists (added during table recreation)")

        # Create indexes
        print("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alarm_thresholds_device_id ON alarm_thresholds(device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alarm_thresholds_parameter ON alarm_thresholds(parameter)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alarm_thresholds_is_active ON alarm_thresholds(is_active)")

        conn.commit()
        print("\nMigration completed successfully!")
        print(f"Backup saved to: {backup_path}")

        # Verify
        cursor.execute("PRAGMA table_info(alarm_thresholds)")
        new_columns = [col[1] for col in cursor.fetchall()]
        print(f"New columns: {new_columns}")

    except Exception as e:
        print(f"\nError during migration: {e}")
        print("Rolling back...")
        conn.rollback()
        # Restore backup
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, DB_PATH)
            print("Backup restored")
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
