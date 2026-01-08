"""
Import Section II SMS devices into the database
"""
from app.db.database import SessionLocal
from app.models.models import Device
from datetime import datetime

# Section II device data
section_ii_devices = [
    {"sr_no": 1, "name": "I, FSD", "section": "II", "region": "FSD", "lat": 31.46266, "lon": 73.07317},
    {"sr_no": 2, "name": "II, FSD", "section": "II", "region": "FSD", "lat": 31.46266, "lon": 73.07317},
    {"sr_no": 3, "name": "III, FSD", "section": "II", "region": "FSD", "lat": 31.46610, "lon": 73.12994},
    {"sr_no": 4, "name": "IV, FSD", "section": "II", "region": "FSD", "lat": 31.43809, "lon": 73.02823},
    {"sr_no": 5, "name": "V, FSD", "section": "II", "region": "FSD", "lat": 31.50295, "lon": 73.06049},
    {"sr_no": 6, "name": "VI, FSD", "section": "II", "region": "FSD", "lat": 31.39066, "lon": 72.97635},
    {"sr_no": 7, "name": "CHAUDHARY SUGAR", "section": "II", "region": "FSD", "lat": 31.21822, "lon": 72.74218},
    {"sr_no": 8, "name": "318 JB", "section": "II", "region": "FSD", "lat": 31.03339, "lon": 72.56022},
    {"sr_no": 9, "name": "332 (JB) L", "section": "II", "region": "FSD", "lat": 31.37186, "lon": 72.78617},
    {"sr_no": 10, "name": "CHAK JHUMRA", "section": "II", "region": "FSD", "lat": 31.55777, "lon": 73.18355},
    {"sr_no": 11, "name": "SHAMAS", "section": "II", "region": "FSD", "lat": 31.68586, "lon": 72.99925},
    {"sr_no": 12, "name": "CHENAB NAGAR", "section": "II", "region": "FSD", "lat": 31.75925, "lon": 72.92044},
    {"sr_no": 13, "name": "CHINIOT", "section": "II", "region": "FSD", "lat": 31.69931, "lon": 72.99545},
    {"sr_no": 14, "name": "GOJRA", "section": "II", "region": "FSD", "lat": 31.15053, "lon": 72.67362},
    {"sr_no": 15, "name": "GUTWALA", "section": "II", "region": "FSD", "lat": 31.47141, "lon": 73.20399},
    {"sr_no": 16, "name": "JHANG", "section": "II", "region": "FSD", "lat": 31.22305, "lon": 72.33561},
    {"sr_no": 17, "name": "JARANWALA", "section": "II", "region": "FSD", "lat": 31.32721, "lon": 73.40341},
    {"sr_no": 18, "name": "KAMALIA - I", "section": "II", "region": "FSD", "lat": 30.80945, "lon": 72.27624},
    {"sr_no": 19, "name": "KAMALIA - II", "section": "II", "region": "FSD", "lat": 30.80945, "lon": 72.27624},
    {"sr_no": 20, "name": "KHURRIANWALA", "section": "II", "region": "FSD", "lat": 31.49124, "lon": 73.27933},
    {"sr_no": 21, "name": "LATHIANWALA", "section": "II", "region": "FSD", "lat": 31.47716, "lon": 73.22224},
    {"sr_no": 22, "name": "MADINA", "section": "II", "region": "FSD", "lat": 31.66904, "lon": 73.01401},
    {"sr_no": 23, "name": "ALLAMA IQBAL", "section": "II", "region": "FSD", "lat": 31.66031, "lon": 73.21117},
    {"sr_no": 24, "name": "MILLAT", "section": "II", "region": "FSD", "lat": 31.47023, "lon": 73.10274},
    {"sr_no": 25, "name": "NAWAB LAHORE", "section": "II", "region": "FSD", "lat": 31.25586, "lon": 72.79939},
    {"sr_no": 26, "name": "DIJKOT", "section": "II", "region": "FSD", "lat": 31.20424, "lon": 72.99316},
    {"sr_no": 27, "name": "NEW DIJKOT", "section": "II", "region": "FSD", "lat": 31.25942, "lon": 72.93076},
    {"sr_no": 28, "name": "TANJUJANWALA", "section": "II", "region": "FSD", "lat": 31.03722, "lon": 73.12658},
    {"sr_no": 29, "name": "NEW SUMUNDRI", "section": "II", "region": "FSD", "lat": 31.03400, "lon": 72.93113},
    {"sr_no": 30, "name": "OLD SUMUNDRI", "section": "II", "region": "FSD", "lat": 31.17925, "lon": 72.70292},
    {"sr_no": 31, "name": "RAIPAN MAIZE", "section": "II", "region": "FSD", "lat": 31.37024, "lon": 73.39523},
    {"sr_no": 32, "name": "SANDHILIANWALI", "section": "II", "region": "FSD", "lat": 30.63486, "lon": 72.34166},
    {"sr_no": 33, "name": "BHAWANA", "section": "II", "region": "FSD", "lat": 31.54597, "lon": 72.65011},
    {"sr_no": 34, "name": "SHORKOT", "section": "II", "region": "FSD", "lat": 30.77856, "lon": 72.25844},
    {"sr_no": 35, "name": "I.T SINGH", "section": "II", "region": "FSD", "lat": 30.98380, "lon": 72.47699},
    {"sr_no": 36, "name": "SITARA", "section": "II", "region": "FSD", "lat": 31.52243, "lon": 73.40048},
    {"sr_no": 37, "name": "IBRAHIM", "section": "II", "region": "FSD", "lat": 31.52508, "lon": 73.40952},
    {"sr_no": 38, "name": "M3 INDUSTRIAL EST", "section": "II", "region": "FSD", "lat": 31.58227, "lon": 73.16207},
    {"sr_no": 39, "name": "PINDI BHATTIAN (FSD)", "section": "II", "region": "FSD", "lat": 31.72974, "lon": 72.98866},
    {"sr_no": 40, "name": "31 SB", "section": "II", "region": "SGD", "lat": 31.95957, "lon": 72.92531},
    {"sr_no": 41, "name": "DINGA", "section": "II", "region": "SGD", "lat": 31.92139, "lon": 72.91475},
    {"sr_no": 42, "name": "BHAGTANWALA", "section": "II", "region": "SGD", "lat": 32.03614, "lon": 72.94344},
    {"sr_no": 43, "name": "BHALWAL", "section": "II", "region": "SGD", "lat": 32.24939, "lon": 72.90024},
    {"sr_no": 44, "name": "BHERA", "section": "II", "region": "SGD", "lat": 32.53033, "lon": 73.12573},
    {"sr_no": 45, "name": "HADALI", "section": "II", "region": "SGD", "lat": 32.30490, "lon": 72.19016},
    {"sr_no": 46, "name": "JOHARABAD", "section": "II", "region": "SGD", "lat": 32.31066, "lon": 72.28961},
    {"sr_no": 47, "name": "KHYABAN GHEE", "section": "II", "region": "SGD", "lat": 32.02871, "lon": 72.72010},
    {"sr_no": 48, "name": "KOTMOMAN", "section": "II", "region": "SGD", "lat": 32.20250, "lon": 72.98447},
    {"sr_no": 49, "name": "JHAWARIAN (LAK MOR)", "section": "II", "region": "SGD", "lat": 32.26274, "lon": 72.67461},
    {"sr_no": 50, "name": "MURADWALI", "section": "II", "region": "SGD", "lat": 32.26880, "lon": 72.81214},
    {"sr_no": 51, "name": "LALLIAN", "section": "II", "region": "SGD", "lat": 31.78884, "lon": 72.88321},
    {"sr_no": 52, "name": "MITHALIWANA", "section": "II", "region": "SGD", "lat": 32.29893, "lon": 72.09298},
    {"sr_no": 53, "name": "QUAIDABAD", "section": "II", "region": "SGD", "lat": 32.34866, "lon": 71.87279},
    {"sr_no": 54, "name": "SHAHPUR", "section": "II", "region": "SGD", "lat": 32.25531, "lon": 72.48169},
    {"sr_no": 55, "name": "SILLANWALI", "section": "II", "region": "SGD", "lat": 31.83508, "lon": 72.54155},
    {"sr_no": 56, "name": "MATEELA", "section": "II", "region": "SGD", "lat": 32.12146, "lon": 72.97311},
    {"sr_no": 57, "name": "ALLUWALI", "section": "II", "region": "SGD", "lat": 32.35864, "lon": 71.41763},
    {"sr_no": 58, "name": "PIPLAN", "section": "II", "region": "SGD", "lat": 32.29466, "lon": 71.37844},
    {"sr_no": 59, "name": "SARGODHA", "section": "II", "region": "SGD", "lat": 32.02871, "lon": 72.72010},
    {"sr_no": 60, "name": "PHULLARWAN", "section": "II", "region": "SGD", "lat": 31.98907, "lon": 72.34276},
    {"sr_no": 61, "name": "SAHIWAL", "section": "II", "region": "SGD", "lat": 32.15693, "lon": 72.38461},
    {"sr_no": 62, "name": "HUSAIN SHAH", "section": "II", "region": "SKP", "lat": 31.55583, "lon": 73.48731},
    {"sr_no": 63, "name": "SHAHKOT", "section": "II", "region": "SKP", "lat": 31.56735, "lon": 73.54859},
    {"sr_no": 64, "name": "KOTLA", "section": "II", "region": "SKP", "lat": 31.58549, "lon": 73.67740},
    {"sr_no": 65, "name": "NANKANA", "section": "II", "region": "SKP", "lat": 31.60347, "lon": 73.81718},
    {"sr_no": 66, "name": "WARBURTON", "section": "II", "region": "SKP", "lat": 31.61289, "lon": 73.88879},
    {"sr_no": 67, "name": "RAVI CHEM", "section": "II", "region": "SKP", "lat": 31.61321, "lon": 73.89468},
    {"sr_no": 68, "name": "BIRJU", "section": "II", "region": "SKP", "lat": 31.58803, "lon": 73.69922},
    {"sr_no": 69, "name": "MANAWALA", "section": "II", "region": "SKP", "lat": 31.57630, "lon": 73.59871},
    {"sr_no": 70, "name": "PANWAN", "section": "II", "region": "SKP", "lat": 31.68320, "lon": 73.74078},
    {"sr_no": 71, "name": "JAJJA BUTANA", "section": "II", "region": "Gujrat", "lat": 32.52983, "lon": 73.21840},
    {"sr_no": 72, "name": "CHAK RAIB", "section": "II", "region": "Gujrat", "lat": 32.53033, "lon": 73.12573},
    {"sr_no": 73, "name": "MAI.IKWAL", "section": "II", "region": "Gujrat", "lat": 32.40797, "lon": 73.03000},
    {"sr_no": 74, "name": "KHATIALA KHEIKHAN", "section": "II", "region": "Gujrat", "lat": 32.48403, "lon": 73.41655},
    {"sr_no": 75, "name": "PIND MAKU", "section": "II", "region": "Gujrat", "lat": 32.40797, "lon": 73.03000},
    {"sr_no": 76, "name": "PINDI BHATTIAN GWA", "section": "II", "region": "Gujranwala", "lat": 32.40797, "lon": 73.03000},
    {"sr_no": 77, "name": "KOT ISLAM", "section": "II", "region": "Multan", "lat": 30.59001, "lon": 72.09859},
]

def import_devices():
    db = SessionLocal()
    try:
        print(f"Starting import of {len(section_ii_devices)} Section II devices...")
        print("-" * 80)

        added_count = 0
        updated_count = 0

        for device_info in section_ii_devices:
            # Create client_id in format: SMS-II-001, SMS-II-002, etc.
            client_id = f"SMS-II-{str(device_info['sr_no']).zfill(3)}"

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
                    created_at=datetime.utcnow()
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
        print(f"  - Total: {len(section_ii_devices)} devices")

        # Verify the import
        section_ii_count = db.query(Device).filter(Device.client_id.like('SMS-II-%')).count()
        print(f"\nTotal Section II devices in database: {section_ii_count}")

    except Exception as e:
        db.rollback()
        print(f"\nError during import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_devices()
