"""Add unique constraint to prevent duplicate device readings"""

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

print("Adding unique constraint to device_readings table...")
print("=" * 80)

# First, remove existing duplicates (keep the first one)
cleanup_query = """
DELETE FROM device_readings
WHERE id NOT IN (
    SELECT MIN(id)
    FROM device_readings
    GROUP BY device_id, timestamp
);
"""

# Add unique constraint
constraint_query = """
ALTER TABLE device_readings
ADD CONSTRAINT unique_device_timestamp
UNIQUE (device_id, timestamp);
"""

try:
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            # Clean up duplicates first
            print("Step 1: Removing duplicate readings...")
            result = conn.execute(text(cleanup_query))
            print(f"[OK] Removed {result.rowcount} duplicate readings\n")

            # Add constraint
            print("Step 2: Adding unique constraint...")
            conn.execute(text(constraint_query))
            print("[OK] Added unique constraint: unique_device_timestamp\n")

            # Commit transaction
            trans.commit()

            print("=" * 80)
            print("SUCCESS: Database updated successfully!")
            print("The system will now prevent duplicate readings automatically.")

        except Exception as e:
            trans.rollback()
            print(f"ERROR: {e}")
            if "already exists" in str(e).lower():
                print("\nThe constraint already exists. No action needed.")
            else:
                raise

finally:
    engine.dispose()
