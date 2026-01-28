"""Remove duplicate device readings from database (keep oldest)"""

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

print("Removing duplicate device readings...")
print("=" * 80)

# Delete duplicates, keeping the one with smallest id (oldest)
query = """
DELETE FROM device_readings
WHERE id NOT IN (
    SELECT MIN(id)
    FROM device_readings
    GROUP BY device_id, timestamp
);
"""

# Get count before
count_before_query = "SELECT COUNT(*) FROM device_readings;"

try:
    with engine.connect() as conn:
        # Get initial count
        count_before = conn.execute(text(count_before_query)).scalar()
        print(f"Total readings before: {count_before}")

        # Delete duplicates
        result = conn.execute(text(query))
        conn.commit()

        # Get count after
        count_after = conn.execute(text(count_before_query)).scalar()

        print(f"Total readings after:  {count_after}")
        print(f"\n[OK] Removed {count_before - count_after} duplicate readings")
        print("=" * 80)

except Exception as e:
    print(f"ERROR: {e}")

finally:
    engine.dispose()
