"""
Import Section I SMS devices (93 devices)
Multan, Bahawalpur, and Sahiwal regions
"""

import sys
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.models.models import Device, Base
from datetime import datetime

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Section I SMS Data
section_1_devices = [
    # Multan Region (51 devices)
    {"name": "Abdul Hakeem", "region": "Multan", "lat": 30.56425, "lon": 72.07456},
    {"name": "Chak 79", "region": "Multan", "lat": 30.33775, "lon": 72.07069},
    {"name": "Chowk Perani", "region": "Multan", "lat": 29.46664, "lon": 70.94714},
    {"name": "Chowk Sarwar Shaheed", "region": "Multan", "lat": 30.58100, "lon": 71.17275},
    {"name": "Colony Textile Mills", "region": "Multan", "lat": 30.06703, "lon": 71.31272},
    {"name": "DG Cement", "region": "Multan", "lat": 30.33203, "lon": 70.54192},
    {"name": "DG Khan", "region": "Multan", "lat": 30.08594, "lon": 70.65733},
    {"name": "H-Multan", "region": "Multan", "lat": 30.20619, "lon": 71.53978},
    {"name": "H-Multan", "region": "Multan", "lat": 30.20619, "lon": 71.53978},
    {"name": "I-Multan", "region": "Multan", "lat": 30.17256, "lon": 71.50867},
    {"name": "Industrial Estate", "region": "Multan", "lat": 30.06703, "lon": 71.31272},
    {"name": "IV-Multan", "region": "Multan", "lat": 30.20192, "lon": 71.53794},
    {"name": "Jamalabad", "region": "Multan", "lat": 30.23503, "lon": 71.57256},
    {"name": "Jahanian", "region": "Multan", "lat": 30.02872, "lon": 71.77786},
    {"name": "Jalal pur", "region": "Multan", "lat": 29.49908, "lon": 71.23678},
    {"name": "Jou pur", "region": "Multan", "lat": 30.48342, "lon": 71.97975},
    {"name": "Kaor Wala", "region": "Multan", "lat": 30.39383, "lon": 71.86967},
    {"name": "Kachi Khu", "region": "Multan", "lat": 30.36407, "lon": 72.16447},
    {"name": "Kapco Colony", "region": "Multan", "lat": 0, "lon": 0},
    {"name": "Khari Garh", "region": "Multan", "lat": 29.91808, "lon": 71.12656},
    {"name": "Khanewal", "region": "Multan", "lat": 30.27328, "lon": 71.91311},
    {"name": "Kot Addu", "region": "Multan", "lat": 30.45139, "lon": 70.97844},
    {"name": "Kot Qubarni", "region": "Multan", "lat": 30.81683, "lon": 70.48881},
    {"name": "Layyah", "region": "Multan", "lat": 30.50731, "lon": 70.95386},
    {"name": "Luddan", "region": "Multan", "lat": 29.89222, "lon": 72.53114},
    {"name": "Mahni Sial", "region": "Multan", "lat": 30.31750, "lon": 71.80008},
    {"name": "Makhdoom Dr Rashad", "region": "Multan", "lat": 30.09469, "lon": 71.64794},
    {"name": "Matotty", "region": "Multan", "lat": 29.76667, "lon": 71.29181},
    {"name": "Mehmood Textile Mills", "region": "Multan", "lat": 30.08961, "lon": 71.26142},
    {"name": "Mian Chanu", "region": "Multan", "lat": 30.42017, "lon": 72.37358},
    {"name": "Muzaffar Garh", "region": "Multan", "lat": 30.12103, "lon": 71.22428},
    {"name": "Nanakpur", "region": "Multan", "lat": 30.28447, "lon": 71.87311},
    {"name": "Naseem Enterprises", "region": "Multan", "lat": 30.33331, "lon": 71.76169},
    {"name": "Parco", "region": "Multan", "lat": 30.27333, "lon": 71.08389},
    {"name": "Qadra Pur Rawan", "region": "Multan", "lat": 30.28300, "lon": 71.67783},
    {"name": "Qasba Marral", "region": "Multan", "lat": 29.98528, "lon": 71.99378},
    {"name": "Roshan Wali", "region": "Multan", "lat": 29.77403, "lon": 71.04897},
    {"name": "Sananwan", "region": "Multan", "lat": 30.30236, "lon": 71.06486},
    {"name": "Sidhue Jund", "region": "Multan", "lat": 30.47247, "lon": 70.73658},
    {"name": "Shah Jamal", "region": "Multan", "lat": 30.04686, "lon": 71.15300},
    {"name": "Shah Sadruddin", "region": "Multan", "lat": 30.27400, "lon": 70.73147},
    {"name": "Sham Kot", "region": "Multan", "lat": 30.29769, "lon": 71.84636},
    {"name": "Shehar Sultan", "region": "Multan", "lat": 29.56961, "lon": 70.99797},
    {"name": "Shujabad", "region": "Multan", "lat": 29.86075, "lon": 71.32625},
    {"name": "Tallamba", "region": "Multan", "lat": 30.56494, "lon": 72.13622},
    {"name": "Tatlay Aali", "region": "Multan", "lat": 30.70864, "lon": 70.58458},
    {"name": "Tibba Sultan", "region": "Multan", "lat": 30.03114, "lon": 71.77242},
    {"name": "Vehari", "region": "Multan", "lat": 30.09303, "lon": 72.48519},
    {"name": "VI-Multan", "region": "Multan", "lat": 30.25500, "lon": 71.61469},
    {"name": "V-Multan", "region": "Multan", "lat": 30.12761, "lon": 71.49381},
    {"name": "Wadhuwali", "region": "Multan", "lat": 29.85478, "lon": 71.08958},

    # Bahawalpur Region (35 devices)
    {"name": "Bhakkar", "region": "Peshawar", "lat": 31.65975, "lon": 71.07661},
    {"name": "RYK", "region": "Bahawalpur", "lat": 28.51675, "lon": 70.14686},
    {"name": "Sadiqabad", "region": "Bahawalpur", "lat": 28.41739, "lon": 69.92300},
    {"name": "Khan Pur", "region": "Bahawalpur", "lat": 28.67317, "lon": 70.65717},
    {"name": "Liaqutt Pur", "region": "Bahawalpur", "lat": 29.05164, "lon": 70.79878},
    {"name": "Ghotki", "region": "Bahawalpur", "lat": 28.05344, "lon": 69.37041},
    {"name": "Ubero", "region": "Bahawalpur", "lat": 28.17747, "lon": 69.71473},
    {"name": "Shadani Sharif", "region": "Bahawalpur", "lat": 28.95781, "lon": 70.67511},
    {"name": "Fateh Pur Kamal", "region": "Bahawalpur", "lat": 28.89686, "lon": 70.61364},
    {"name": "Zahir Pir", "region": "Bahawalpur", "lat": 28.81789, "lon": 70.52125},
    {"name": "Kot Samaba", "region": "Bahawalpur", "lat": 28.68519, "lon": 70.55697},
    {"name": "Hideo Foods", "region": "Bahawalpur", "lat": 28.62342, "lon": 70.27578},
    {"name": "Badli Sharif", "region": "Bahawalpur", "lat": 28.55489, "lon": 70.19008},
    {"name": "Jamal Din Wali", "region": "Bahawalpur", "lat": 28.47142, "lon": 70.67004},
    {"name": "Kot Sabzal", "region": "Bahawalpur", "lat": 28.30831, "lon": 69.82217},
    {"name": "PPL", "region": "Bahawalpur", "lat": 28.43331, "lon": 69.68294},
    {"name": "Kashmore", "region": "Bahawalpur", "lat": 28.47103, "lon": 69.65231},
    {"name": "Rojhan Mazari", "region": "Bahawalpur", "lat": 28.71196, "lon": 69.89951},
    {"name": "Labu Lanjari", "region": "Bahawalpur", "lat": 27.82325, "lon": 69.25256},
    {"name": "Choundko", "region": "Bahawalpur", "lat": 27.11783, "lon": 68.95711},
    {"name": "Coating Plant", "region": "Bahawalpur", "lat": 29.20711, "lon": 71.04297},
    {"name": "Ahmid Pur East", "region": "Bahawalpur", "lat": 29.14314, "lon": 71.22753},
    {"name": "Bahawal Pur", "region": "Bahawalpur", "lat": 29.36831, "lon": 71.63597},
    {"name": "Chishtian", "region": "Bahawalpur", "lat": 29.78014, "lon": 72.87272},
    {"name": "Dhoorkot", "region": "Bahawalpur", "lat": 29.34856, "lon": 71.15919},
    {"name": "Eucalyptabad", "region": "Bahawalpur", "lat": 29.61217, "lon": 72.92461},
    {"name": "Hasil Pur", "region": "Bahawalpur", "lat": 29.70050, "lon": 72.56869},
    {"name": "Hatheiji", "region": "Bahawalpur", "lat": 29.34022, "lon": 71.25022},
    {"name": "Khanqah Sharif", "region": "Bahawalpur", "lat": 29.32250, "lon": 71.54564},
    {"name": "Lodhran", "region": "Bahawalpur", "lat": 29.36831, "lon": 71.63597},
    {"name": "Mandi Yazman", "region": "Bahawalpur", "lat": 29.33145, "lon": 71.57511},
    {"name": "Mubarikpur", "region": "Bahawalpur", "lat": 29.33244, "lon": 71.35622},
    {"name": "Samasatta", "region": "Bahawalpur", "lat": 29.33161, "lon": 71.57433},
    {"name": "Tala Punah", "region": "Bahawalpur", "lat": 29.12353, "lon": 70.90653},
    {"name": "Ucli Sharif", "region": "Bahawalpur", "lat": 29.23058, "lon": 71.07111},

    # Sahiwal Region (7 devices)
    {"name": "36/14-L", "region": "Sahiwal", "lat": 30.29272, "lon": 72.42056},
    {"name": "Chicha Watni", "region": "Sahiwal", "lat": 30.47147, "lon": 72.66064},
    {"name": "Harappa", "region": "Sahiwal", "lat": 30.55525, "lon": 72.88458},
    {"name": "Iqbal Nagar", "region": "Sahiwal", "lat": 30.44547, "lon": 72.45669},
    {"name": "Kasoowaal", "region": "Sahiwal", "lat": 30.45392, "lon": 72.51583},
    {"name": "Pakpattan", "region": "Sahiwal", "lat": 30.62708, "lon": 73.10878},
    {"name": "Sahiwal", "region": "Sahiwal", "lat": 30.62692, "lon": 73.10878},
]

def import_section_1_devices():
    """Import all Section I devices into database"""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("Importing Section I SMS Devices")
        print("=" * 60)

        imported_count = 0
        skipped_count = 0

        for idx, device_data in enumerate(section_1_devices, start=1):
            # Generate client_id in format SMS-I-XXX
            client_id = f"SMS-I-{idx:03d}"

            # Check if device already exists
            existing = db.query(Device).filter(Device.client_id == client_id).first()

            if existing:
                print(f"⚠ Skipping {client_id} - already exists")
                skipped_count += 1
                continue

            # Create new device
            device = Device(
                client_id=client_id,
                device_name=device_data["name"],
                device_type="SMS",
                location=f"{device_data['name']}, {device_data['region']}",
                latitude=device_data["lat"] if device_data["lat"] != 0 else None,
                longitude=device_data["lon"] if device_data["lon"] != 0 else None,
                is_active=False,  # Will become active when MQTT data arrives
                last_seen=None,
                created_at=datetime.utcnow()
            )

            db.add(device)
            imported_count += 1

            if imported_count % 10 == 0:
                print(f"✓ Imported {imported_count} devices...")

        # Commit all changes
        db.commit()

        print()
        print("=" * 60)
        print("Import Summary")
        print("=" * 60)
        print(f"✓ Total devices in Section I: {len(section_1_devices)}")
        print(f"✓ Imported: {imported_count}")
        print(f"⚠ Skipped (already exist): {skipped_count}")
        print()
        print("Region Breakdown:")
        print(f"  - Multan: 51 devices (SMS-I-001 to SMS-I-051)")
        print(f"  - Bahawalpur: 35 devices (SMS-I-052 to SMS-I-086)")
        print(f"  - Sahiwal: 7 devices (SMS-I-087 to SMS-I-093)")
        print()
        print("✅ Section I import complete!")
        print()
        print("Next steps:")
        print("1. Restart backend: python main.py")
        print("2. Start MQTT listener: python mqtt_listener.py")
        print("3. Check Sections page - Section I card should show 93 devices")
        print()

    except Exception as e:
        db.rollback()
        print(f"❌ Error importing devices: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    import_section_1_devices()
