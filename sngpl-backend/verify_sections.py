"""
Script to verify section statistics are correct
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

def verify_sections():
    """Verify section device counts"""
    db = SessionLocal()

    try:
        print("\n" + "="*80)
        print("SECTION STATISTICS VERIFICATION")
        print("="*80)

        # Check total devices
        total_query = text("SELECT COUNT(*) FROM devices")
        total_devices = db.execute(total_query).scalar()
        print(f"\n📊 Total devices in database: {total_devices}")

        # Check devices per section
        sections = ['I', 'II', 'III', 'IV', 'V']
        section_totals = {}

        print("\n" + "-"*80)
        print(f"{'Section':<15} {'Pattern':<20} {'Device Count':<15} {'Active Count'}")
        print("-"*80)

        for section in sections:
            pattern = f'SMS-{section}-%'

            count_query = text("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active
                FROM devices
                WHERE client_id LIKE :pattern
            """)

            result = db.execute(count_query, {"pattern": pattern}).first()
            total = result[0] if result else 0
            active = result[1] if result else 0
            section_totals[section] = {'total': total, 'active': active}

            print(f"Section {section:<8} {pattern:<20} {total:<15} {active}")

        # Check "Other" devices
        other_query = text("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active
            FROM devices
            WHERE NOT (client_id LIKE 'SMS-I-%'
                   OR client_id LIKE 'SMS-II-%'
                   OR client_id LIKE 'SMS-III-%'
                   OR client_id LIKE 'SMS-IV-%'
                   OR client_id LIKE 'SMS-V-%')
        """)

        other_result = db.execute(other_query).first()
        other_total = other_result[0] if other_result else 0
        other_active = other_result[1] if other_result else 0

        print(f"Other Devices {'NOT SMS-*-%':<14} {other_total:<15} {other_active}")

        # Verify expected totals
        print("\n" + "="*80)
        print("EXPECTED vs ACTUAL")
        print("="*80)

        expected = {
            'I': 93,
            'II': 77,
            'III': 83,
            'IV': 74,
            'V': 71
        }

        print(f"\n{'Section':<15} {'Expected':<15} {'Actual':<15} {'Status'}")
        print("-"*60)

        all_match = True
        for section in sections:
            actual = section_totals[section]['total']
            exp = expected[section]
            status = "✓ OK" if actual == exp else f"✗ MISMATCH (diff: {actual - exp:+d})"
            if actual != exp:
                all_match = False
            print(f"Section {section:<8} {exp:<15} {actual:<15} {status}")

        print(f"\nTotal Expected:  {sum(expected.values())}")
        print(f"Total Actual:    {sum(s['total'] for s in section_totals.values())}")
        print(f"Other Devices:   {other_total}")
        print(f"Grand Total:     {total_devices}")

        if all_match:
            print("\n✅ All sections have correct device counts!")
        else:
            print("\n⚠️  Some sections have mismatched counts!")

        # Check if devices have recent readings
        print("\n" + "="*80)
        print("RECENT DATA CHECK")
        print("="*80)

        readings_query = text("""
            SELECT
                COUNT(DISTINCT d.id) as devices_with_data,
                COUNT(dr.id) as total_readings,
                MAX(dr.timestamp) as latest_reading
            FROM devices d
            LEFT JOIN device_readings dr ON d.id = dr.device_id
            WHERE d.client_id LIKE 'SMS-%'
        """)

        readings_result = db.execute(readings_query).first()

        print(f"\nDevices with readings: {readings_result[0]}")
        print(f"Total readings: {readings_result[1]}")
        print(f"Latest reading: {readings_result[2]}")

        # Sample some devices
        print("\n" + "="*80)
        print("SAMPLE DEVICES (First 5 from each section)")
        print("="*80)

        for section in sections:
            sample_query = text("""
                SELECT client_id, device_name, is_active, last_seen
                FROM devices
                WHERE client_id LIKE :pattern
                ORDER BY client_id
                LIMIT 5
            """)

            samples = db.execute(sample_query, {"pattern": f'SMS-{section}-%'}).fetchall()

            if samples:
                print(f"\nSection {section}:")
                for device in samples:
                    active_marker = "🟢" if device[2] else "🔴"
                    print(f"  {active_marker} {device[0]:<15} {device[1][:40]:<40} Last seen: {device[3]}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    verify_sections()
