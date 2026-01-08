"""
Script to check database size and table statistics
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

def check_database_size():
    """Check database and table sizes"""
    db = SessionLocal()

    try:
        print("\n" + "="*80)
        print("DATABASE SIZE REPORT")
        print("="*80)

        # Get database size
        db_size_query = text("""
            SELECT
                pg_size_pretty(pg_database_size(current_database())) as db_size,
                pg_database_size(current_database()) as db_size_bytes
        """)
        db_size = db.execute(db_size_query).first()
        print(f"\n📊 Total Database Size: {db_size[0]}")

        # Get table sizes
        print("\n" + "-"*80)
        print("TABLE SIZES")
        print("-"*80)

        table_size_query = text("""
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY size_bytes DESC
        """)

        tables = db.execute(table_size_query).fetchall()

        print(f"\n{'Table Name':<30} {'Size':<15}")
        print("-"*50)
        for table in tables:
            print(f"{table[0]:<30} {table[1]:<15}")

        # Get row counts
        print("\n" + "-"*80)
        print("ROW COUNTS")
        print("-"*80)

        tables_to_check = ['devices', 'device_readings', 'users', 'alarms']
        print(f"\n{'Table Name':<30} {'Row Count':<15}")
        print("-"*50)

        for table_name in tables_to_check:
            try:
                count_query = text(f"SELECT COUNT(*) FROM {table_name}")
                count = db.execute(count_query).scalar()
                print(f"{table_name:<30} {count:<15,}")
            except Exception as e:
                print(f"{table_name:<30} Error: {str(e)}")

        # Device readings statistics
        print("\n" + "-"*80)
        print("DEVICE READINGS STATISTICS")
        print("-"*80)

        stats_query = text("""
            SELECT
                COUNT(*) as total_readings,
                COUNT(DISTINCT device_id) as devices_with_readings,
                MIN(timestamp) as oldest_reading,
                MAX(timestamp) as newest_reading,
                pg_size_pretty(pg_total_relation_size('device_readings')) as table_size
            FROM device_readings
        """)

        stats = db.execute(stats_query).first()

        print(f"\nTotal Readings: {stats[0]:,}")
        print(f"Devices with Readings: {stats[1]}")
        print(f"Oldest Reading: {stats[2]}")
        print(f"Newest Reading: {stats[3]}")
        print(f"Table Size: {stats[4]}")

        # Readings per device average
        if stats[0] > 0 and stats[1] > 0:
            avg_per_device = stats[0] / stats[1]
            print(f"Average Readings per Device: {avg_per_device:.1f}")

        # Top 10 devices by reading count
        print("\n" + "-"*80)
        print("TOP 10 DEVICES BY READING COUNT")
        print("-"*80)

        top_devices_query = text("""
            SELECT
                d.client_id,
                d.device_name,
                COUNT(dr.id) as reading_count
            FROM devices d
            LEFT JOIN device_readings dr ON d.id = dr.device_id
            GROUP BY d.id, d.client_id, d.device_name
            ORDER BY reading_count DESC
            LIMIT 10
        """)

        top_devices = db.execute(top_devices_query).fetchall()

        print(f"\n{'Client ID':<20} {'Device Name':<30} {'Reading Count':<15}")
        print("-"*70)
        for device in top_devices:
            print(f"{device[0]:<20} {device[1][:28]:<30} {device[2]:<15,}")

        print("\n" + "="*80)
        print("\n💡 TIP: Run clean_database_history.bat to free up space")
        print("="*80)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    check_database_size()
