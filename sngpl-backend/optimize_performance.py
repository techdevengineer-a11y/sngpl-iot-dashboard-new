"""
Performance Optimization Script for SNGPL IoT Dashboard
Run this script to apply database optimizations and check system health.
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def create_additional_indexes():
    """Create additional performance indexes"""

    indexes = [
        # Index for 6 AM readings queries (used in reports)
        """
        CREATE INDEX IF NOT EXISTS ix_readings_device_timestamp_hour
        ON device_readings(device_id, timestamp DESC)
        WHERE EXTRACT(HOUR FROM timestamp) BETWEEN 5 AND 7;
        """,

        # Index for timestamp-based queries
        """
        CREATE INDEX IF NOT EXISTS ix_readings_timestamp_desc
        ON device_readings(timestamp DESC);
        """,

        # Index for active devices
        """
        CREATE INDEX IF NOT EXISTS ix_devices_active_type
        ON devices(is_active, device_type)
        WHERE is_active = true;
        """,

        # Index for alarm queries by severity
        """
        CREATE INDEX IF NOT EXISTS ix_alarms_severity_unack
        ON alarms(severity, triggered_at DESC)
        WHERE is_acknowledged = false;
        """,

        # Index for notification queries
        """
        CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
        ON notifications(user_id, created_at DESC)
        WHERE is_read = false;
        """,
    ]

    print("\n=== Creating Additional Indexes ===")

    with engine.connect() as conn:
        for idx, sql in enumerate(indexes, 1):
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  [{idx}/{len(indexes)}] Index created successfully")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  [{idx}/{len(indexes)}] Index already exists (skipped)")
                else:
                    print(f"  [{idx}/{len(indexes)}] Error: {e}")


def analyze_tables():
    """Run ANALYZE on tables to update query planner statistics"""

    tables = ["devices", "device_readings", "alarms", "notifications", "users"]

    print("\n=== Analyzing Tables (Updating Statistics) ===")

    with engine.connect() as conn:
        for table in tables:
            try:
                conn.execute(text(f"ANALYZE {table};"))
                conn.commit()
                print(f"  - {table}: analyzed")
            except Exception as e:
                print(f"  - {table}: error - {e}")


def check_table_sizes():
    """Check table sizes and row counts"""

    print("\n=== Table Sizes ===")

    query = """
    SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC;
    """

    with engine.connect() as conn:
        result = conn.execute(text(query))
        print(f"  {'Table':<25} {'Rows':<15} {'Size':<15}")
        print(f"  {'-'*55}")
        for row in result:
            print(f"  {row[0]:<25} {row[1]:<15,} {row[2]:<15}")


def check_slow_queries():
    """Check for slow queries (requires pg_stat_statements extension)"""

    print("\n=== Slow Queries (Top 5) ===")

    query = """
    SELECT
        ROUND((total_exec_time / 1000)::numeric, 2) as total_time_sec,
        calls,
        ROUND((mean_exec_time)::numeric, 2) as avg_time_ms,
        LEFT(query, 80) as query_preview
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 5;
    """

    with engine.connect() as conn:
        try:
            result = conn.execute(text(query))
            print(f"  {'Total(s)':<12} {'Calls':<10} {'Avg(ms)':<12} {'Query':<50}")
            print(f"  {'-'*84}")
            for row in result:
                print(f"  {row[0]:<12} {row[1]:<10} {row[2]:<12} {row[3][:50]}")
        except Exception as e:
            if "does not exist" in str(e):
                print("  pg_stat_statements extension not enabled")
                print("  To enable: CREATE EXTENSION pg_stat_statements;")
            else:
                print(f"  Error: {e}")


def check_index_usage():
    """Check which indexes are being used"""

    print("\n=== Index Usage Statistics ===")

    query = """
    SELECT
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC
    LIMIT 10;
    """

    with engine.connect() as conn:
        result = conn.execute(text(query))
        print(f"  {'Index':<45} {'Scans':<12} {'Read':<12} {'Fetched':<12}")
        print(f"  {'-'*81}")
        for row in result:
            print(f"  {row[0]:<45} {row[1]:<12,} {row[2]:<12,} {row[3]:<12,}")


def check_connection_stats():
    """Check database connection statistics"""

    print("\n=== Connection Statistics ===")

    query = """
    SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = current_database();
    """

    with engine.connect() as conn:
        result = conn.execute(text(query))
        row = result.fetchone()
        print(f"  Total: {row[0]}, Active: {row[1]}, Idle: {row[2]}, Idle in Transaction: {row[3]}")


def estimate_growth():
    """Estimate data growth based on current readings"""

    print("\n=== Data Growth Estimate ===")

    query = """
    SELECT
        COUNT(*) as total_readings,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        COUNT(*) / GREATEST(EXTRACT(DAY FROM (MAX(timestamp) - MIN(timestamp))), 1) as readings_per_day
    FROM device_readings;
    """

    with engine.connect() as conn:
        result = conn.execute(text(query))
        row = result.fetchone()

        if row and row[0] > 0:
            total = row[0]
            earliest = row[1]
            latest = row[2]
            per_day = float(row[3])

            print(f"  Total readings: {total:,}")
            print(f"  Date range: {earliest} to {latest}")
            print(f"  Readings per day: {per_day:,.0f}")
            print(f"  Estimated per month: {per_day * 30:,.0f}")
            print(f"  Estimated per year: {per_day * 365:,.0f}")

            # Size estimate
            avg_row_size = 200  # bytes (approximate)
            yearly_size_mb = (per_day * 365 * avg_row_size) / (1024 * 1024)
            print(f"  Estimated yearly storage: {yearly_size_mb:,.0f} MB")
        else:
            print("  No readings data available")


def vacuum_tables():
    """Run VACUUM on tables to reclaim space"""

    tables = ["device_readings", "alarms"]

    print("\n=== Vacuuming Tables ===")
    print("  (This may take a while for large tables)")

    with engine.connect() as conn:
        # Need autocommit for VACUUM
        conn.execution_options(isolation_level="AUTOCOMMIT")
        for table in tables:
            try:
                print(f"  - Vacuuming {table}...", end=" ", flush=True)
                conn.execute(text(f"VACUUM ANALYZE {table};"))
                print("done")
            except Exception as e:
                print(f"error - {e}")


def main():
    print("=" * 60)
    print("  SNGPL IoT Dashboard - Performance Optimization")
    print("=" * 60)
    print(f"  Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Run optimizations
    create_additional_indexes()
    analyze_tables()

    # Check health
    check_table_sizes()
    check_connection_stats()
    check_index_usage()
    estimate_growth()

    # Optional: check slow queries (requires extension)
    check_slow_queries()

    print("\n" + "=" * 60)
    print("  Optimization Complete!")
    print("=" * 60)

    # Recommendations
    print("\n=== Recommendations ===")
    print("  1. Run this script monthly to maintain performance")
    print("  2. Set up data retention (90 days recommended)")
    print("  3. Monitor table sizes - archive when > 5M rows")
    print("  4. Consider partitioning if data grows rapidly")
    print("")


if __name__ == "__main__":
    main()
