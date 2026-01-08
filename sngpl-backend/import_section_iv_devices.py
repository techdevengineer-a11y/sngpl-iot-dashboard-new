"""
Import Section IV SMS devices into the database
"""
from app.db.database import SessionLocal
from app.models.models import Device
from datetime import datetime

# Section IV device data
section_iv_devices = [
    {"sr_no": 1, "name": "Balarky", "section": "IV", "region": "Sheikhupura", "lat": 31.70750, "lon": 74.01480},
    {"sr_no": 2, "name": "DESCON", "section": "IV", "region": "Sheikhupura", "lat": 31.65800, "lon": 74.15300},
    {"sr_no": 3, "name": "FMCO", "section": "IV", "region": "Sheikhupura", "lat": 31.65801, "lon": 74.15296},
    {"sr_no": 4, "name": "Farooqabad", "section": "IV", "region": "Sheikhupura", "lat": 31.75040, "lon": 73.80834},
    {"sr_no": 5, "name": "Gen.Inds", "section": "IV", "region": "Sheikhupura", "lat": 31.66732, "lon": 74.07431},
    {"sr_no": 6, "name": "GTPS (B-3)", "section": "IV", "region": "Sheikhupura", "lat": 0, "lon": 0},
    {"sr_no": 7, "name": "Gujrabd", "section": "IV", "region": "Sheikhupura", "lat": 31.87670, "lon": 74.23178},
    {"sr_no": 8, "name": "Hardave", "section": "IV", "region": "Sheikhupura", "lat": 31.80460, "lon": 74.04269},
    {"sr_no": 9, "name": "MUFEEDKY", "section": "IV", "region": "Sheikhupura", "lat": 31.821050, "lon": 74.250694},
    {"sr_no": 10, "name": "Morekhauda", "section": "IV", "region": "Sheikhupura", "lat": 31.62420, "lon": 73.99870},
    {"sr_no": 11, "name": "Punjab steel", "section": "IV", "region": "Sheikhupura", "lat": 31.72444, "lon": 74.26845},
    {"sr_no": 12, "name": "Ravi Reyan", "section": "IV", "region": "Sheikhupura", "lat": 31.75958, "lon": 74.26151},
    {"sr_no": 13, "name": "Rupafil", "section": "IV", "region": "Sheikhupura", "lat": 31.62006, "lon": 74.04592},
    {"sr_no": 14, "name": "Shahdara (B-3)", "section": "IV", "region": "Sheikhupura", "lat": 31.61690, "lon": 74.27580},
    {"sr_no": 15, "name": "Sheikhupura City", "section": "IV", "region": "Sheikhupura", "lat": 31.70750, "lon": 74.01480},
    {"sr_no": 16, "name": "SMS-I LHR", "section": "IV", "region": "LAHORE", "lat": 0, "lon": 0},
    {"sr_no": 17, "name": "SMS-III LHR", "section": "IV", "region": "LAHORE", "lat": 0, "lon": 0},
    {"sr_no": 18, "name": "SUNDAR", "section": "IV", "region": "LAHORE", "lat": 31.30834, "lon": 74.15549},
    {"sr_no": 19, "name": "MANGA", "section": "IV", "region": "LAHORE", "lat": 31.29347, "lon": 74.07594},
    {"sr_no": 20, "name": "NISHAT", "section": "IV", "region": "LAHORE", "lat": 31.22170, "lon": 73.99430},
    {"sr_no": 21, "name": "PHOOL NAGAR", "section": "IV", "region": "LAHORE", "lat": 31.18963, "lon": 73.96868},
    {"sr_no": 22, "name": "CENTURY", "section": "IV", "region": "LAHORE", "lat": 31.15721, "lon": 73.95154},
    {"sr_no": 23, "name": "INDUSTRIAL CLUSTER", "section": "IV", "region": "LAHORE", "lat": 31.19720, "lon": 73.90099},
    {"sr_no": 24, "name": "PATTOKI", "section": "IV", "region": "LAHORE", "lat": 31.00891, "lon": 73.87260},
    {"sr_no": 25, "name": "CHUNIA", "section": "IV", "region": "LAHORE", "lat": 31.00891, "lon": 73.87260},
    {"sr_no": 26, "name": "KASUR", "section": "IV", "region": "LAHORE", "lat": 31.16410, "lon": 74.24290},
    {"sr_no": 27, "name": "FEROZPUR ROAD", "section": "IV", "region": "LAHORE", "lat": 31.16410, "lon": 74.24290},
    {"sr_no": 28, "name": "BARKI", "section": "IV", "region": "LAHORE", "lat": 31.46710, "lon": 74.52160},
    {"sr_no": 29, "name": "DAYAL", "section": "IV", "region": "LAHORE", "lat": 31.60090, "lon": 74.52210},
    {"sr_no": 30, "name": "Habibabad", "section": "IV", "region": "Sahiwal", "lat": 30.94440, "lon": 73.74493},
    {"sr_no": 31, "name": "Akhtarabad", "section": "IV", "region": "Sahiwal", "lat": 30.91783, "lon": 73.68975},
    {"sr_no": 32, "name": "Renala", "section": "IV", "region": "Sahiwal", "lat": 30.85889, "lon": 73.59861},
    {"sr_no": 33, "name": "Satgarah", "section": "IV", "region": "Sahiwal", "lat": 30.93116, "lon": 73.50003},
    {"sr_no": 34, "name": "Okara City", "section": "IV", "region": "Sahiwal", "lat": 30.78216, "lon": 73.50715},
    {"sr_no": 35, "name": "Okara Cantt", "section": "IV", "region": "Sahiwal", "lat": 30.71361, "lon": 73.34098},
    {"sr_no": 36, "name": "Lakson", "section": "IV", "region": "Sahiwal", "lat": 30.70103, "lon": 73.26203},
    {"sr_no": 37, "name": "31-32/2L", "section": "IV", "region": "Sahiwal", "lat": 30.75979, "lon": 73.55325},
    {"sr_no": 38, "name": "Chak 40-D", "section": "IV", "region": "Sahiwal", "lat": 30.74749, "lon": 73.57776},
    {"sr_no": 39, "name": "Depalpur", "section": "IV", "region": "Sahiwal", "lat": 30.68991, "lon": 73.64126},
    {"sr_no": 40, "name": "Chorasta", "section": "IV", "region": "Sahiwal", "lat": 30.62426, "lon": 73.76392},
    {"sr_no": 41, "name": "Basirpur", "section": "IV", "region": "Sahiwal", "lat": 30.58655, "lon": 73.83530},
    {"sr_no": 42, "name": "Gujranwala-I", "section": "IV", "region": "Gujranwala", "lat": 32.04560, "lon": 74.08240},
    {"sr_no": 43, "name": "Gujranwala-II", "section": "IV", "region": "Gujranwala", "lat": 32.11560, "lon": 74.06410},
    {"sr_no": 44, "name": "Gujranwala-III", "section": "IV", "region": "Gujranwala", "lat": 32.08240, "lon": 74.15050},
    {"sr_no": 45, "name": "Kamoki", "section": "IV", "region": "Gujranwala", "lat": 31.58350, "lon": 74.12510},
    {"sr_no": 46, "name": "Eminabad", "section": "IV", "region": "Gujranwala", "lat": 32.04147, "lon": 74.20403},
    {"sr_no": 47, "name": "Noshera Virkan", "section": "IV", "region": "Gujranwala", "lat": 31.73364, "lon": 73.83059},
    {"sr_no": 48, "name": "Q D Singh", "section": "IV", "region": "Gujranwala", "lat": 32.14616, "lon": 74.01380},
    {"sr_no": 49, "name": "Nokher", "section": "IV", "region": "Gujranwala", "lat": 32.13507, "lon": 73.90544},
    {"sr_no": 50, "name": "Hafizabad", "section": "IV", "region": "Gujranwala", "lat": 32.05000, "lon": 73.45320},
    {"sr_no": 51, "name": "Rahwali", "section": "IV", "region": "Gujranwala", "lat": 32.14380, "lon": 74.09030},
    {"sr_no": 52, "name": "Gakkhar", "section": "IV", "region": "Gujranwala", "lat": 32.30026, "lon": 74.13888},
    {"sr_no": 53, "name": "Dhundle", "section": "IV", "region": "Gujranwala", "lat": 32.39548, "lon": 74.12083},
    {"sr_no": 54, "name": "Wazirabad", "section": "IV", "region": "Gujranwala", "lat": 32.25470, "lon": 74.01680},
    {"sr_no": 55, "name": "Daska", "section": "IV", "region": "Sialkot", "lat": 32.20530, "lon": 74.21260},
    {"sr_no": 56, "name": "Sambrial", "section": "IV", "region": "Sialkot", "lat": 32.43822, "lon": 74.35756},
    {"sr_no": 57, "name": "Jam K Cheema", "section": "IV", "region": "Sialkot", "lat": 32.38295, "lon": 74.42167},
    {"sr_no": 58, "name": "Sialkot", "section": "IV", "region": "Sialkot", "lat": 32.27390, "lon": 74.30280},
    {"sr_no": 59, "name": "Badiana", "section": "IV", "region": "Sialkot", "lat": 32.43829, "lon": 74.55826},
    {"sr_no": 60, "name": "Feroz K Nagra", "section": "IV", "region": "Sialkot", "lat": 32.18530, "lon": 74.31520},
    {"sr_no": 61, "name": "Pasroor", "section": "IV", "region": "Sialkot", "lat": 32.27173, "lon": 74.64288},
    {"sr_no": 62, "name": "Shakargarh", "section": "IV", "region": "Sialkot", "lat": 32.27130, "lon": 74.88026},
    {"sr_no": 63, "name": "Zafarwal", "section": "IV", "region": "Sialkot", "lat": 32.27130, "lon": 74.88026},
    {"sr_no": 64, "name": "Narowal", "section": "IV", "region": "Sialkot", "lat": 32.12316, "lon": 74.85569},
    {"sr_no": 65, "name": "Pak Ghee", "section": "IV", "region": "Gujrat", "lat": 32.48952, "lon": 74.09628},
    {"sr_no": 66, "name": "Jalalpur Jattan", "section": "IV", "region": "Gujrat", "lat": 32.37320, "lon": 74.12310},
    {"sr_no": 67, "name": "Maugowal", "section": "IV", "region": "Gujrat", "lat": 32.55495, "lon": 74.08825},
    {"sr_no": 68, "name": "M B Din", "section": "IV", "region": "Gujrat", "lat": 32.52459, "lon": 73.49471},
    {"sr_no": 69, "name": "Lalamusa", "section": "IV", "region": "Gujrat", "lat": 32.41380, "lon": 73.56260},
    {"sr_no": 70, "name": "Kharian", "section": "IV", "region": "Gujrat", "lat": 32.47140, "lon": 73.50740},
    {"sr_no": 71, "name": "Gujrat", "section": "IV", "region": "Gujrat", "lat": 32.55022, "lon": 74.04590},
    {"sr_no": 72, "name": "SA Gir", "section": "IV", "region": "Rawalpindi", "lat": 32.54000, "lon": 73.44400},
    {"sr_no": 73, "name": "Jhelum", "section": "IV", "region": "Rawalpindi", "lat": 32.54160, "lon": 73.43560},
    {"sr_no": 74, "name": "Mirpur", "section": "IV", "region": "Rawalpindi", "lat": 33.10261, "lon": 73.75309},
]

def import_devices():
    db = SessionLocal()
    try:
        print(f"Starting import of {len(section_iv_devices)} Section IV devices...")
        print("-" * 80)

        added_count = 0
        updated_count = 0

        for device_info in section_iv_devices:
            # Create client_id in format: SMS-IV-001, SMS-IV-002, etc.
            client_id = f"SMS-IV-{str(device_info['sr_no']).zfill(3)}"

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
        print(f"  - Total: {len(section_iv_devices)} devices")

        # Verify the import
        section_iv_count = db.query(Device).filter(Device.client_id.like('SMS-IV-%')).count()
        print(f"\nTotal Section IV devices in database: {section_iv_count}")

    except Exception as e:
        db.rollback()
        print(f"\nError during import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_devices()
