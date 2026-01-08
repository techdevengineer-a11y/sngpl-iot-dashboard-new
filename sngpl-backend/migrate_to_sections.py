"""
Migration script: Add Sections and update Devices
This script:
1. Creates the sections table
2. Adds section_id column to devices table
3. Creates 5 default sections
4. Migrates existing SMS devices to sections based on their client_id pattern
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models.models import Section, Device
from sqlalchemy import text


def migrate():
    """Run migration"""
    print("\n" + "="*60)
    print("  Section Migration - Add Sections and Update Devices")
    print("="*60 + "\n")

    # Create all tables (will create sections table if not exists)
    print("[1/5] Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Tables created/verified")
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")
        return False

    db = SessionLocal()

    try:
        # Create 5 default sections
        print("\n[2/5] Creating default sections...")

        sections_data = [
            {"name": "Section I", "description": "Section I - SMS Stations", "location": "Zone 1"},
            {"name": "Section II", "description": "Section II - SMS Stations", "location": "Zone 2"},
            {"name": "Section III", "description": "Section III - SMS Stations", "location": "Zone 3"},
            {"name": "Section IV", "description": "Section IV - SMS Stations", "location": "Zone 4"},
            {"name": "Section V", "description": "Section V - SMS Stations", "location": "Zone 5"},
        ]

        section_map = {}  # Map section names to IDs

        for section_data in sections_data:
            # Check if section already exists
            existing = db.query(Section).filter(Section.name == section_data["name"]).first()

            if existing:
                print(f"[INFO] Section '{section_data['name']}' already exists (ID: {existing.id})")
                section_map[section_data["name"]] = existing.id
            else:
                new_section = Section(
                    name=section_data["name"],
                    description=section_data["description"],
                    location=section_data["location"],
                    is_active=True
                )
                db.add(new_section)
                db.flush()  # Get the ID
                section_map[section_data["name"]] = new_section.id
                print(f"[OK] Created section '{section_data['name']}' (ID: {new_section.id})")

        db.commit()
        print("[OK] All sections created/verified")

        # Migrate existing devices to sections
        print("\n[3/5] Migrating existing devices to sections...")

        # Get all devices
        all_devices = db.query(Device).all()
        migrated_count = 0
        skipped_count = 0

        for device in all_devices:
            # Skip if device already has a section
            if device.section_id is not None:
                skipped_count += 1
                continue

            # Determine section based on client_id pattern
            # Expected pattern: SMS-I-001, SMS-II-002, etc.
            section_assigned = False

            if device.client_id and device.client_id.startswith("SMS-"):
                parts = device.client_id.split("-")
                if len(parts) >= 2:
                    section_code = parts[1]  # e.g., "I", "II", "III", "IV", "V"

                    # Map section code to section name
                    section_name_map = {
                        "I": "Section I",
                        "II": "Section II",
                        "III": "Section III",
                        "IV": "Section IV",
                        "V": "Section V"
                    }

                    if section_code in section_name_map:
                        section_name = section_name_map[section_code]
                        section_id = section_map.get(section_name)

                        if section_id:
                            device.section_id = section_id
                            device.device_type = "SMS"  # Ensure device type is SMS
                            migrated_count += 1
                            section_assigned = True
                            print(f"[OK] Assigned {device.client_id} to {section_name}")

            if not section_assigned:
                # Default to Section I if pattern doesn't match
                device.section_id = section_map.get("Section I")
                device.device_type = "SMS"
                migrated_count += 1
                print(f"[INFO] Assigned {device.client_id} to Section I (default)")

        db.commit()
        print(f"[OK] Migrated {migrated_count} devices, skipped {skipped_count} (already assigned)")

        # Display summary
        print("\n[4/5] Migration summary:")
        for section_name, section_id in section_map.items():
            device_count = db.query(Device).filter(Device.section_id == section_id).count()
            print(f"  {section_name}: {device_count} devices")

        # Update device_type for all SMS devices
        print("\n[5/5] Updating device types...")
        result = db.execute(
            text("UPDATE devices SET device_type = 'SMS' WHERE client_id LIKE 'SMS-%'")
        )
        db.commit()
        print(f"[OK] Updated device types ({result.rowcount} devices)")

        print("\n" + "="*60)
        print("  Migration completed successfully!")
        print("="*60)
        print("\n  Next steps:")
        print("  1. Restart the backend: python main.py")
        print("  2. Verify sections: GET /api/sections")
        print("  3. Verify section devices: GET /api/sections/{section_id}/devices")
        print("\n" + "="*60 + "\n")

        return True

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

    finally:
        db.close()


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
