"""
Script to check and update device names in the database
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

def check_devices():
    """Check all devices in the database"""
    db = SessionLocal()

    try:
        print("\n" + "="*80)
        print("CURRENT DEVICES IN DATABASE")
        print("="*80)

        query = text("""
            SELECT id, client_id, device_name, device_type, section, is_active, created_at
            FROM devices
            ORDER BY id
        """)

        devices = db.execute(query).fetchall()

        if not devices:
            print("\n❌ NO DEVICES FOUND IN DATABASE!")
            print("\nYou need to add devices to see them in sections.")
            print("Devices should follow naming pattern: SMS-{SECTION}-{NUMBER}")
            print("Examples: SMS-I-001, SMS-I-002, SMS-II-001, etc.")
            return

        print(f"\nTotal devices found: {len(devices)}\n")
        print(f"{'ID':<5} {'Client ID':<20} {'Device Name':<25} {'Type':<8} {'Section':<10} {'Active'}")
        print("-" * 95)

        for device in devices:
            active_status = "✓ Yes" if device[5] else "✗ No"
            print(f"{device[0]:<5} {device[1]:<20} {device[2] or 'N/A':<25} {device[3] or 'N/A':<8} {device[4] or 'N/A':<10} {active_status}")

        print("\n" + "="*80)
        print("SECTION BREAKDOWN")
        print("="*80)

        sections_query = text("""
            SELECT
                CASE
                    WHEN client_id LIKE 'SMS-I-%' THEN 'Section I'
                    WHEN client_id LIKE 'SMS-II-%' THEN 'Section II'
                    WHEN client_id LIKE 'SMS-III-%' THEN 'Section III'
                    WHEN client_id LIKE 'SMS-IV-%' THEN 'Section IV'
                    WHEN client_id LIKE 'SMS-V-%' THEN 'Section V'
                    ELSE 'Other Devices'
                END as section_group,
                COUNT(*) as device_count
            FROM devices
            GROUP BY section_group
            ORDER BY section_group
        """)

        section_counts = db.execute(sections_query).fetchall()

        print(f"\n{'Section':<20} {'Device Count'}")
        print("-" * 35)
        for section in section_counts:
            print(f"{section[0]:<20} {section[1]}")

        print("\n" + "="*80)

    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        db.close()


def rename_device(old_client_id, new_client_id):
    """Rename a device"""
    db = SessionLocal()

    try:
        # Check if device exists
        check_query = text("SELECT id, client_id, device_name FROM devices WHERE client_id = :old_id")
        device = db.execute(check_query, {"old_id": old_client_id}).first()

        if not device:
            print(f"\n❌ Device '{old_client_id}' not found!")
            return

        print(f"\n📝 Renaming device:")
        print(f"   Old client_id: {device[1]}")
        print(f"   New client_id: {new_client_id}")

        # Update device
        update_query = text("""
            UPDATE devices
            SET client_id = :new_id,
                device_name = :new_name
            WHERE client_id = :old_id
        """)

        db.execute(update_query, {
            "old_id": old_client_id,
            "new_id": new_client_id,
            "new_name": new_client_id
        })

        # Update all readings
        update_readings = text("""
            UPDATE device_readings
            SET client_id = :new_id
            WHERE client_id = :old_id
        """)

        result = db.execute(update_readings, {
            "old_id": old_client_id,
            "new_id": new_client_id
        })

        db.commit()

        print(f"✅ Device renamed successfully!")
        print(f"✅ Updated {result.rowcount} readings")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n🔍 DEVICE CHECKER & MANAGER")
    print("="*80)

    # First, show all devices
    check_devices()

    # Offer to rename if there are devices that don't match pattern
    print("\n\nOPTIONS:")
    print("1. Just check devices (done above)")
    print("2. Rename a device to match section pattern")
    print("3. Exit")

    choice = input("\nEnter choice (1-3): ").strip()

    if choice == "2":
        old_name = input("\nEnter current device client_id (e.g., 'modem 2'): ").strip()
        new_name = input("Enter new client_id (e.g., 'SMS-I-001'): ").strip()

        if old_name and new_name:
            confirm = input(f"\nRename '{old_name}' to '{new_name}'? (yes/no): ").lower()
            if confirm == 'yes':
                rename_device(old_name, new_name)
                print("\n\n📊 Updated device list:")
                check_devices()
        else:
            print("❌ Invalid input")

    print("\n✅ Done!")
