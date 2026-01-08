"""
Debug script to check why sections are not showing devices
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

def debug_sections():
    """Debug section device visibility"""
    db = SessionLocal()

    try:
        print("\n" + "="*80)
        print("SECTION DEBUG - WHY NO DEVICES SHOWING")
        print("="*80)

        # Check total devices
        total_query = text("SELECT COUNT(*) FROM devices")
        total = db.execute(total_query).scalar()
        print(f"\n📊 Total devices in database: {total}")

        if total == 0:
            print("\n❌ NO DEVICES IN DATABASE!")
            print("   Run the import script to add devices")
            return

        # Check devices per section
        print("\n" + "-"*80)
        print("DEVICES PER SECTION")
        print("-"*80)

        sections = ['I', 'II', 'III', 'IV', 'V']
        for section in sections:
            # Check with LIKE pattern
            pattern_query = text("""
                SELECT COUNT(*),
                       STRING_AGG(client_id, ', ' ORDER BY client_id) as sample_ids
                FROM (
                    SELECT client_id
                    FROM devices
                    WHERE client_id LIKE :pattern
                    LIMIT 5
                ) as sample
            """)

            result = db.execute(pattern_query, {"pattern": f'SMS-{section}-%'}).first()
            count = result[0] if result else 0
            sample_ids = result[1] if result and result[1] else "None"

            print(f"\nSection {section}:")
            print(f"  Pattern: SMS-{section}-%")
            print(f"  Count: {count}")
            print(f"  Sample IDs: {sample_ids}")

        # Check "Other" devices
        print("\n" + "-"*80)
        print("OTHER DEVICES (Not SMS-*)")
        print("-"*80)

        other_query = text("""
            SELECT client_id, device_name, is_active
            FROM devices
            WHERE NOT (client_id LIKE 'SMS-I-%'
                   OR client_id LIKE 'SMS-II-%'
                   OR client_id LIKE 'SMS-III-%'
                   OR client_id LIKE 'SMS-IV-%'
                   OR client_id LIKE 'SMS-V-%')
            ORDER BY client_id
            LIMIT 10
        """)

        others = db.execute(other_query).fetchall()
        if others:
            for dev in others:
                active_mark = "🟢" if dev[2] else "🔴"
                print(f"  {active_mark} {dev[0]} - {dev[1]}")
        else:
            print("  No other devices found")

        # Test API pattern matching
        print("\n" + "="*80)
        print("API PATTERN MATCHING TEST")
        print("="*80)

        for section in ['I', 'II', 'III', 'IV', 'V']:
            # This is what the API does
            api_query = text("""
                SELECT COUNT(*)
                FROM devices
                WHERE client_id LIKE :pattern1 OR client_id LIKE :pattern2
            """)

            section_map = {'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5'}
            arabic = section_map.get(section, section)

            count = db.execute(api_query, {
                "pattern1": f'SMS-{section}-%',
                "pattern2": f'SMS-{arabic}-%'
            }).scalar()

            print(f"Section {section} (API query): {count} devices")

        # Check sample device details
        print("\n" + "="*80)
        print("SAMPLE DEVICE DETAILS (First 10)")
        print("="*80)

        sample_query = text("""
            SELECT client_id, device_name, device_type, is_active,
                   location, region
            FROM devices
            ORDER BY client_id
            LIMIT 10
        """)

        samples = db.execute(sample_query).fetchall()
        print(f"\n{'Client ID':<15} {'Device Name':<25} {'Type':<8} {'Region':<15} {'Active'}")
        print("-"*80)

        for dev in samples:
            active_mark = "🟢" if dev[3] else "🔴"
            print(f"{dev[0]:<15} {(dev[1] or 'N/A')[:23]:<25} {(dev[2] or 'N/A'):<8} {(dev[5] or 'N/A'):<15} {active_mark}")

        # Check if devices have readings
        print("\n" + "="*80)
        print("DEVICES WITH READINGS")
        print("="*80)

        readings_query = text("""
            SELECT
                COUNT(DISTINCT device_id) as devices_with_readings,
                COUNT(*) as total_readings
            FROM device_readings
        """)

        readings = db.execute(readings_query).first()
        print(f"\nDevices with readings: {readings[0]}")
        print(f"Total readings: {readings[1]}")

        # Check API endpoint simulation
        print("\n" + "="*80)
        print("SIMULATING API ENDPOINT FOR SECTION I")
        print("="*80)

        api_sim_query = text("""
            SELECT d.client_id, d.device_name, d.is_active, d.location,
                   dr.temperature, dr.volume, dr.total_volume_flow
            FROM devices d
            LEFT JOIN LATERAL (
                SELECT * FROM device_readings
                WHERE device_id = d.id
                ORDER BY timestamp DESC
                LIMIT 1
            ) dr ON true
            WHERE d.client_id LIKE 'SMS-I-%' OR d.client_id LIKE 'SMS-1-%'
            ORDER BY d.client_id
            LIMIT 5
        """)

        api_devices = db.execute(api_sim_query).fetchall()

        if api_devices:
            print(f"\nFound {len(api_devices)} devices for Section I")
            print(f"\n{'Client ID':<15} {'Name':<25} {'Active':<8} {'Has Reading'}")
            print("-"*70)
            for dev in api_devices:
                active_mark = "Yes" if dev[2] else "No"
                has_reading = "Yes" if dev[4] is not None else "No"
                print(f"{dev[0]:<15} {(dev[1] or 'N/A')[:23]:<25} {active_mark:<8} {has_reading}")
        else:
            print("\n❌ NO DEVICES FOUND FOR SECTION I!")
            print("   This is why the frontend shows no devices")

        print("\n" + "="*80)
        print("RECOMMENDATIONS")
        print("="*80)

        if total == 0:
            print("\n1. Import devices:")
            print("   python backend/import_sms_stations.py")
        elif readings[1] == 0:
            print("\n1. Activate devices:")
            print("   python backend/activate_all_devices.py")
            print("\n2. Generate some test readings or send MQTT data")
        else:
            print("\n✓ Devices and readings exist")
            print("✓ Check if API server is running on port 8000")
            print("✓ Check frontend proxy configuration")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    debug_sections()
