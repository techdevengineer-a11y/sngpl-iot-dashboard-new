"""Check for duplicate device readings in the database"""

from sqlalchemy import create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Check for duplicate readings based on device_id + timestamp
query = """
SELECT
    device_id,
    client_id,
    timestamp,
    COUNT(*) as count
FROM device_readings
GROUP BY device_id, client_id, timestamp
HAVING COUNT(*) > 1
ORDER BY count DESC, timestamp DESC
LIMIT 20;
"""

print("Checking for duplicate device readings...")
print("=" * 80)

with engine.connect() as conn:
    result = conn.execute(text(query))
    duplicates = result.fetchall()

    if duplicates:
        print(f"Found {len(duplicates)} sets of duplicate readings:\n")
        for row in duplicates:
            print(f"Device ID: {row[0]} | Client ID: {row[1]} | "
                  f"Timestamp: {row[2]} | Count: {row[3]}")

        print("\n" + "=" * 80)
        print("\nDetailed view of one duplicate set:")

        # Get details of first duplicate
        first_dup = duplicates[0]
        detail_query = """
        SELECT id, device_id, client_id, timestamp, temperature,
               static_pressure, differential_pressure, volume,
               total_volume_flow, battery, created_at
        FROM device_readings
        WHERE device_id = :device_id
          AND timestamp = :timestamp
        ORDER BY id;
        """

        detail_result = conn.execute(
            text(detail_query),
            {"device_id": first_dup[0], "timestamp": first_dup[2]}
        )

        print(f"\nDuplicate records for Device {first_dup[1]} at {first_dup[2]}:")
        print("-" * 80)
        for record in detail_result.fetchall():
            print(f"ID: {record[0]}")
            print(f"  Device ID: {record[1]}, Client ID: {record[2]}")
            print(f"  Timestamp: {record[3]}")
            print(f"  Temperature: {record[4]}, Pressure: {record[5]}")
            print(f"  Diff Pressure: {record[6]}, Volume: {record[7]}")
            print(f"  Volume Flow: {record[8]}, Battery: {record[9]}")
            print(f"  Created At: {record[10]}")
            print()
    else:
        print("No duplicate readings found!")

    # Check total count
    count_query = "SELECT COUNT(*) FROM device_readings;"
    total = conn.execute(text(count_query)).scalar()
    print(f"\nTotal device readings in database: {total}")

engine.dispose()
