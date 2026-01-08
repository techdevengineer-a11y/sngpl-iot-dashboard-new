"""
Import Section III SMS devices into the database
"""
from app.db.database import SessionLocal
from app.models.models import Device
from datetime import datetime

# Section III device data
section_iii_devices = [
    {"sr_no": 1, "name": "Buddhu", "section": "III", "region": "Islamabad", "lat": 72.72268, "lon": 33.80150},
    {"sr_no": 2, "name": "HMC", "section": "III", "region": "Islamabad", "lat": 72.77268, "lon": 33.80150},
    {"sr_no": 3, "name": "Bhoi Ghar", "section": "III", "region": "Islamabad", "lat": 72.81695, "lon": 33.82210},
    {"sr_no": 4, "name": "Jund", "section": "III", "region": "Islamabad", "lat": 71.98111, "lon": 33.40867},
    {"sr_no": 5, "name": "Pindi Gheb", "section": "III", "region": "Islamabad", "lat": 72.35133, "lon": 33.22569},
    {"sr_no": 6, "name": "Dhulian", "section": "III", "region": "Islamabad", "lat": 72.34503, "lon": 33.20744},
    {"sr_no": 7, "name": "Ahmedal", "section": "III", "region": "Islamabad", "lat": 72.48747, "lon": 33.28253},
    {"sr_no": 8, "name": "Kaunal", "section": "III", "region": "Islamabad", "lat": 72.48747, "lon": 33.28253},
    {"sr_no": 9, "name": "Dhumal", "section": "III", "region": "Islamabad", "lat": 73.58372, "lon": 33.35023},
    {"sr_no": 10, "name": "Aktern Energy", "section": "III", "region": "Islamabad", "lat": 72.65141, "lon": 33.55253},
    {"sr_no": 11, "name": "Fateh Jhang", "section": "III", "region": "Islamabad", "lat": 72.65689, "lon": 33.56650},
    {"sr_no": 12, "name": "K.F. Glass", "section": "III", "region": "Islamabad", "lat": 72.67092, "lon": 33.59653},
    {"sr_no": 13, "name": "Jhang Bahtar", "section": "III", "region": "Islamabad", "lat": 72.69172, "lon": 33.67106},
    {"sr_no": 14, "name": "Fauji Cement", "section": "III", "region": "Islamabad", "lat": 72.69556, "lon": 33.70100},
    {"sr_no": 15, "name": "Brahma", "section": "III", "region": "Islamabad", "lat": 72.70169, "lon": 33.73675},
    {"sr_no": 16, "name": "Wah", "section": "III", "region": "Islamabad", "lat": 72.72891, "lon": 33.78935},
    {"sr_no": 17, "name": "Margalla", "section": "III", "region": "Islamabad", "lat": 72.81298, "lon": 33.71229},
    {"sr_no": 18, "name": "Zulshan Engineering", "section": "III", "region": "Islamabad", "lat": 72.59995, "lon": 33.81528},
    {"sr_no": 19, "name": "Lawrencepur", "section": "III", "region": "Islamabad", "lat": 72.50561, "lon": 33.82806},
    {"sr_no": 20, "name": "Khudda", "section": "III", "region": "Islamabad", "lat": 72.54847, "lon": 33.80945},
    {"sr_no": 21, "name": "Ghazi", "section": "III", "region": "Islamabad", "lat": 72.49482, "lon": 33.83097},
    {"sr_no": 22, "name": "Sanjawal", "section": "III", "region": "Islamabad", "lat": 72.42757, "lon": 33.79403},
    {"sr_no": 23, "name": "Hazro", "section": "III", "region": "Islamabad", "lat": 72.45778, "lon": 33.86877},
    {"sr_no": 24, "name": "Kamra", "section": "III", "region": "Islamabad", "lat": 72.42980, "lon": 33.86633},
    {"sr_no": 25, "name": "Gondal", "section": "III", "region": "Islamabad", "lat": 72.34742, "lon": 33.89465},
    {"sr_no": 26, "name": "Manser Camp", "section": "III", "region": "Islamabad", "lat": 72.30352, "lon": 33.89355},
    {"sr_no": 27, "name": "Nauazzi", "section": "III", "region": "Islamabad", "lat": 72.86475, "lon": 33.61627},
    {"sr_no": 28, "name": "Qutbal", "section": "III", "region": "Islamabad", "lat": 72.76250, "lon": 33.60594},
    {"sr_no": 29, "name": "Rawat (NEW)", "section": "III", "region": "Islamabad", "lat": 73.17992, "lon": 33.51940},
    {"sr_no": 30, "name": "Chukian", "section": "III", "region": "Islamabad", "lat": 73.25884, "lon": 33.56818},
    {"sr_no": 31, "name": "Nilore", "section": "III", "region": "Islamabad", "lat": 73.28489, "lon": 33.65867},
    {"sr_no": 32, "name": "Bara Kaho", "section": "III", "region": "Islamabad", "lat": 73.29372, "lon": 33.69311},
    {"sr_no": 33, "name": "Agoot", "section": "III", "region": "Islamabad", "lat": 73.36661, "lon": 33.81331},
    {"sr_no": 34, "name": "Bahria Golf City", "section": "III", "region": "Islamabad", "lat": 73.33028, "lon": 33.78358},
    {"sr_no": 35, "name": "Murree", "section": "III", "region": "Islamabad", "lat": 73.43253, "lon": 33.89425},
    {"sr_no": 36, "name": "Rawal", "section": "III", "region": "Islamabad", "lat": 72.73509, "lon": 33.46214},
    {"sr_no": 37, "name": "Darra (ISB Airport)", "section": "III", "region": "Islamabad", "lat": 72.84193, "lon": 33.51101},
    {"sr_no": 38, "name": "Gali Jagir", "section": "III", "region": "Islamabad", "lat": 72.62760, "lon": 33.42850},
    {"sr_no": 39, "name": "RCCI", "section": "III", "region": "Islamabad", "lat": 73.23392, "lon": 33.52384},
    {"sr_no": 40, "name": "New Tamman", "section": "III", "region": "Rawalpindi", "lat": 71.96627, "lon": 33.05819},
    {"sr_no": 41, "name": "Sahiwal", "section": "III", "region": "Rawalpindi", "lat": 73.13821, "lon": 32.65506},
    {"sr_no": 42, "name": "Harranpur", "section": "III", "region": "Rawalpindi", "lat": 73.13096, "lon": 32.60082},
    {"sr_no": 43, "name": "New P.D. Khan", "section": "III", "region": "Rawalpindi", "lat": 73.01006, "lon": 32.62502},
    {"sr_no": 44, "name": "ICI Khewra", "section": "III", "region": "Rawalpindi", "lat": 73.01006, "lon": 32.62502},
    {"sr_no": 45, "name": "Dandot Village", "section": "III", "region": "Rawalpindi", "lat": 72.96098, "lon": 32.67385},
    {"sr_no": 46, "name": "Choa Saiden Shah", "section": "III", "region": "Rawalpindi", "lat": 73.00391, "lon": 32.74126},
    {"sr_no": 47, "name": "Deedwal-II", "section": "III", "region": "Rawalpindi", "lat": 72.96543, "lon": 32.81850},
    {"sr_no": 48, "name": "Deedwal -I", "section": "III", "region": "Rawalpindi", "lat": 72.93505, "lon": 32.84495},
    {"sr_no": 49, "name": "Satwal", "section": "III", "region": "Rawalpindi", "lat": 72.87975, "lon": 32.88418},
    {"sr_no": 50, "name": "Bhune", "section": "III", "region": "Rawalpindi", "lat": 72.83309, "lon": 32.91489},
    {"sr_no": 51, "name": "Chakwal", "section": "III", "region": "Rawalpindi", "lat": 72.81112, "lon": 32.93096},
    {"sr_no": 52, "name": "Veero", "section": "III", "region": "Rawalpindi", "lat": 72.74050, "lon": 33.01376},
    {"sr_no": 53, "name": "Gujji More", "section": "III", "region": "Rawalpindi", "lat": 72.78854, "lon": 33.13031},
    {"sr_no": 54, "name": "Pindori", "section": "III", "region": "Rawalpindi", "lat": 72.93410, "lon": 33.22292},
    {"sr_no": 55, "name": "Ghora Mangot", "section": "III", "region": "Rawalpindi", "lat": 73.13783, "lon": 33.25082},
    {"sr_no": 56, "name": "New Daultala", "section": "III", "region": "Rawalpindi", "lat": 73.14837, "lon": 33.15566},
    {"sr_no": 57, "name": "Gujar Khan", "section": "III", "region": "Rawalpindi", "lat": 72.83472, "lon": 33.27152},
    {"sr_no": 58, "name": "Baanth", "section": "III", "region": "Rawalpindi", "lat": 73.22527, "lon": 33.40193},
    {"sr_no": 59, "name": "Rawat (OLD)", "section": "III", "region": "Rawalpindi", "lat": 73.17992, "lon": 33.51940},
    {"sr_no": 60, "name": "Ranial", "section": "III", "region": "Rawalpindi", "lat": 73.32390, "lon": 33.27155},
    {"sr_no": 61, "name": "MH & CMH", "section": "III", "region": "Rawalpindi", "lat": 72.97348, "lon": 33.54177},
    {"sr_no": 62, "name": "DG. Khan Cement Kallar Kahar", "section": "III", "region": "Rawalpindi", "lat": 72.18113, "lon": 32.73427},
    {"sr_no": 63, "name": "Bestway Cement Kallar Kahar", "section": "III", "region": "Rawalpindi", "lat": 72.91704, "lon": 32.73166},
    {"sr_no": 64, "name": "Pakistan Cement Industrial", "section": "III", "region": "Rawalpindi", "lat": 72.77480, "lon": 32.71920},
    {"sr_no": 65, "name": "Pakistan Cement Commercial", "section": "III", "region": "Rawalpindi", "lat": 72.77480, "lon": 32.71920},
    {"sr_no": 66, "name": "Hattar Village", "section": "III", "region": "Abbotabad", "lat": 72.83472, "lon": 33.84797},
    {"sr_no": 67, "name": "Hattar Estate", "section": "III", "region": "Abbotabad", "lat": 72.86657, "lon": 33.89580},
    {"sr_no": 68, "name": "K.N. Ullah", "section": "III", "region": "Abbotabad", "lat": 72.86543, "lon": 33.93213},
    {"sr_no": 69, "name": "Haripur Offsite", "section": "III", "region": "Abbotabad", "lat": 0, "lon": 0},
    {"sr_no": 70, "name": "Sarga Saleh", "section": "III", "region": "Abbotabad", "lat": 72.99630, "lon": 33.97470},
    {"sr_no": 71, "name": "Bugra", "section": "III", "region": "Abbotabad", "lat": 73.05009, "lon": 33.98961},
    {"sr_no": 72, "name": "Havelian", "section": "III", "region": "Abbotabad", "lat": 73.14749, "lon": 34.05462},
    {"sr_no": 73, "name": "Khokha Maira", "section": "III", "region": "Abbotabad", "lat": 73.14945, "lon": 34.06040},
    {"sr_no": 74, "name": "Dhamtour", "section": "III", "region": "Abbotabad", "lat": 73.26462, "lon": 34.14665},
    {"sr_no": 75, "name": "Abbottabad", "section": "III", "region": "Abbotabad", "lat": 73.23208, "lon": 34.18339},
    {"sr_no": 76, "name": "Mangalara", "section": "III", "region": "Abbotabad", "lat": 73.23208, "lon": 34.18339},
    {"sr_no": 77, "name": "Mansehra Ops Phase", "section": "III", "region": "Abbotabad", "lat": 73.23208, "lon": 34.18339},
    {"sr_no": 78, "name": "Muradkhail Cement", "section": "III", "region": "Sargodha", "lat": 72.82949, "lon": 33.82714},
    {"sr_no": 79, "name": "F3 Daudhel", "section": "III", "region": "Sargodha", "lat": 71.58453, "lon": 32.91034},
    {"sr_no": 80, "name": "Miniwali", "section": "III", "region": "Sargodha", "lat": 71.54966, "lon": 32.53776},
    {"sr_no": 81, "name": "Chiana", "section": "III", "region": "Sargodha", "lat": 71.46423, "lon": 32.10041},
    {"sr_no": 82, "name": "Kundian", "section": "III", "region": "Sargodha", "lat": 71.51176, "lon": 32.44540},
    {"sr_no": 83, "name": "Kalabagh", "section": "III", "region": "Sargodha", "lat": 71.54730, "lon": 32.96326},
]

def import_devices():
    db = SessionLocal()
    try:
        print(f"Starting import of {len(section_iii_devices)} Section III devices...")
        print("-" * 80)

        added_count = 0
        updated_count = 0

        for device_info in section_iii_devices:
            # Create client_id in format: SMS-III-001, SMS-III-002, etc.
            client_id = f"SMS-III-{str(device_info['sr_no']).zfill(3)}"

            # Check if device already exists
            existing_device = db.query(Device).filter(Device.client_id == client_id).first()

            if existing_device:
                # Update existing device
                existing_device.device_name = device_info['name']
                existing_device.location = f"{device_info['region']}, Pakistan"
                existing_device.latitude = device_info['lat']
                existing_device.longitude = device_info['lon']
                existing_device.device_type = 'SMS'
                existing_device.is_active = False  # Set to inactive initially
                updated_count += 1
                print(f"Updated: {client_id} - {device_info['name']}")
            else:
                # Create new device
                new_device = Device(
                    client_id=client_id,
                    device_name=device_info['name'],
                    device_type='SMS',
                    location=f"{device_info['region']}, Pakistan",
                    latitude=device_info['lat'],
                    longitude=device_info['lon'],
                    is_active=False,  # Set to inactive initially
                    created_at=datetime.now()
                )
                db.add(new_device)
                added_count += 1
                print(f"Added: {client_id} - {device_info['name']}")

        # Commit all changes
        db.commit()

        print("-" * 80)
        print(f"\nImport completed successfully!")
        print(f"  - Added: {added_count} devices")
        print(f"  - Updated: {updated_count} devices")
        print(f"  - Total: {len(section_iii_devices)} devices")

        # Verify the import
        section_iii_count = db.query(Device).filter(Device.client_id.like('SMS-III-%')).count()
        print(f"\nTotal Section III devices in database: {section_iii_count}")

    except Exception as e:
        db.rollback()
        print(f"\nError during import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_devices()
