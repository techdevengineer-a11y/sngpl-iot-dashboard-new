"""
Migration script to fix T13/T14 swap in existing database records

This script swaps the volume and total_volume_flow values in the database
because the old code had them reversed.

CORRECT MAPPING:
- T13 from MQTT → total_volume_flow field (MCF/day)
- T14 from MQTT → volume field (MCF)

OLD (WRONG) MAPPING that we're fixing:
- T13 from MQTT → volume field (WRONG!)
- T14 from MQTT → total_volume_flow field (WRONG!)
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sngpl_iot")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def fix_t13_t14_swap():
    """Swap volume and total_volume_flow values in all device_readings"""
    db = SessionLocal()

    try:
        print("Starting T13/T14 swap fix...")
        print("=" * 60)

        # Count total records
        count_query = text("SELECT COUNT(*) FROM device_readings")
        total_records = db.execute(count_query).scalar()
        print(f"Total records to process: {total_records}")

        # Get a sample of data BEFORE the swap
        print("\n📊 Sample data BEFORE swap:")
        sample_before = text("""
            SELECT client_id, timestamp, volume, total_volume_flow
            FROM device_readings
            ORDER BY timestamp DESC
            LIMIT 3
        """)
        results = db.execute(sample_before).fetchall()
        for row in results:
            print(f"  {row[0]} | {row[1]} | Volume: {row[2]:.2f} | Flow: {row[3]:.2f}")

        # Perform the swap using a temporary column approach
        print("\n🔄 Swapping volume ↔ total_volume_flow...")

        swap_query = text("""
            UPDATE device_readings
            SET
                volume = total_volume_flow,
                total_volume_flow = volume
            WHERE id IN (
                SELECT id FROM device_readings
            )
        """)

        # Better approach: Use subquery to avoid self-reference issue
        swap_query = text("""
            UPDATE device_readings AS dr
            SET
                volume = subq.old_flow,
                total_volume_flow = subq.old_volume
            FROM (
                SELECT id, volume AS old_volume, total_volume_flow AS old_flow
                FROM device_readings
            ) AS subq
            WHERE dr.id = subq.id
        """)

        result = db.execute(swap_query)
        db.commit()

        print(f"✅ Swapped {result.rowcount} records successfully!")

        # Get a sample of data AFTER the swap
        print("\n📊 Sample data AFTER swap:")
        sample_after = text("""
            SELECT client_id, timestamp, volume, total_volume_flow
            FROM device_readings
            ORDER BY timestamp DESC
            LIMIT 3
        """)
        results = db.execute(sample_after).fetchall()
        for row in results:
            print(f"  {row[0]} | {row[1]} | Volume: {row[2]:.2f} | Flow: {row[3]:.2f}")

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("\nNOTE: Going forward, new MQTT data will be saved correctly:")
        print("  - T13 (flow) → total_volume_flow field")
        print("  - T14 (volume) → volume field")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("\n⚠️  DATABASE MIGRATION SCRIPT ⚠️")
    print("This will swap volume and total_volume_flow values in ALL records")
    print("\nBefore running this:")
    print("1. Make sure you have a database backup")
    print("2. Stop the MQTT listener")
    print("3. Stop the API server")

    response = input("\nProceed with migration? (yes/no): ")

    if response.lower() == 'yes':
        fix_t13_t14_swap()
    else:
        print("❌ Migration cancelled.")
