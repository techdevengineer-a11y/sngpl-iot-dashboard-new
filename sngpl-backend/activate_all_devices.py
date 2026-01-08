"""
Script to activate all SMS devices in the database
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sngpl_iot")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def activate_all_devices():
    """Activate all devices and update their last_seen timestamp"""
    db = SessionLocal()

    try:
        print("\n" + "="*80)
        print("ACTIVATING ALL DEVICES")
        print("="*80)

        # Count inactive devices
        inactive_query = text("SELECT COUNT(*) FROM devices WHERE is_active = FALSE")
        inactive_count = db.execute(inactive_query).scalar()

        print(f"\n📊 Devices currently inactive: {inactive_count}")

        if inactive_count == 0:
            print("✅ All devices are already active!")
            return

        # Activate all devices and update last_seen
        update_query = text("""
            UPDATE devices
            SET is_active = TRUE,
                last_seen = :now
            WHERE is_active = FALSE
        """)

        result = db.execute(update_query, {"now": datetime.now()})
        db.commit()

        print(f"\n✅ Activated {result.rowcount} devices!")

        # Verify
        active_query = text("SELECT COUNT(*) FROM devices WHERE is_active = TRUE")
        active_count = db.execute(active_query).scalar()

        print(f"\n📊 Total active devices now: {active_count}")

        # Show breakdown by section
        print("\n" + "-"*80)
        print("ACTIVE DEVICES BY SECTION")
        print("-"*80)

        sections = ['I', 'II', 'III', 'IV', 'V']
        for section in sections:
            count_query = text("""
                SELECT COUNT(*)
                FROM devices
                WHERE client_id LIKE :pattern AND is_active = TRUE
            """)
            count = db.execute(count_query, {"pattern": f'SMS-{section}-%'}).scalar()
            print(f"Section {section}: {count} devices active")

        print("\n✅ All devices activated successfully!")
        print("\n💡 Tip: Refresh your frontend to see the updated counts")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n⚡ DEVICE ACTIVATION SCRIPT")
    print("This will activate ALL devices in the database")

    response = input("\nProceed? (yes/no): ").strip().lower()

    if response == 'yes':
        activate_all_devices()
    else:
        print("❌ Activation cancelled.")
