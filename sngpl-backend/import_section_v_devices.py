"""
Import Section V SMS devices into the database
"""
from app.db.database import SessionLocal
from app.models.models import Device
from datetime import datetime

# Section V device data
section_v_devices = [
    {"sr_no": 1, "name": "Peshawar", "section": "V", "region": "Peshawar", "lat": 71.720400, "lon": 34.007767},
    {"sr_no": 2, "name": "Regi Model Town", "section": "V", "region": "Peshawar", "lat": 71.480070, "lon": 33.967880},
    {"sr_no": 3, "name": "Hayatabad Ind. Estate", "section": "V", "region": "Peshawar", "lat": 0, "lon": 0},
    {"sr_no": 4, "name": "Pabbi", "section": "V", "region": "Peshawar", "lat": 71.803028, "lon": 33.882667},
    {"sr_no": 5, "name": "Khazana", "section": "V", "region": "Peshawar", "lat": 71.609549, "lon": 34.094718},
    {"sr_no": 6, "name": "Charsadda", "section": "V", "region": "Peshawar", "lat": 71.768834, "lon": 34.137764},
    {"sr_no": 7, "name": "Turungzai", "section": "V", "region": "Peshawar", "lat": 71.761467, "lon": 34.218883},
    {"sr_no": 8, "name": "Umarzai", "section": "V", "region": "Peshawar", "lat": 71.779970, "lon": 34.201669},
    {"sr_no": 9, "name": "Naguman", "section": "V", "region": "Peshawar", "lat": 71.607383, "lon": 34.121550},
    {"sr_no": 10, "name": "Rajjar", "section": "V", "region": "Peshawar", "lat": 71.745991, "lon": 34.174883},
    {"sr_no": 11, "name": "Tangi", "section": "V", "region": "Peshawar", "lat": 71.934300, "lon": 34.282033},
    {"sr_no": 12, "name": "Wali Bagh", "section": "V", "region": "Peshawar", "lat": 71.780017, "lon": 34.201500},
    {"sr_no": 13, "name": "Daulatpura", "section": "V", "region": "Peshawar", "lat": 71.691383, "lon": 34.133750},
    {"sr_no": 14, "name": "Dagi Jadeed", "section": "V", "region": "Peshawar", "lat": 71.821677, "lon": 33.990053},
    {"sr_no": 15, "name": "Mardan", "section": "V", "region": "Mardan", "lat": 72.024669, "lon": 34.165772},
    {"sr_no": 16, "name": "Ismailkot", "section": "V", "region": "Mardan", "lat": 71.940978, "lon": 34.003706},
    {"sr_no": 17, "name": "Nowshera Cantt", "section": "V", "region": "Mardan", "lat": 72.018967, "lon": 34.011683},
    {"sr_no": 18, "name": "Janangira", "section": "V", "region": "Mardan", "lat": 0, "lon": 0},
    {"sr_no": 19, "name": "Zaida", "section": "V", "region": "Mardan", "lat": 72.447567, "lon": 34.033333},
    {"sr_no": 20, "name": "Topi", "section": "V", "region": "Mardan", "lat": 72.612427, "lon": 34.050294},
    {"sr_no": 21, "name": "Takht Bhai", "section": "V", "region": "Mardan", "lat": 71.934743, "lon": 34.281984},
    {"sr_no": 22, "name": "Sakhakot", "section": "V", "region": "Mardan", "lat": 71.905533, "lon": 34.416333},
    {"sr_no": 23, "name": "Butkhaila", "section": "V", "region": "Mardan", "lat": 71.691383, "lon": 34.622767},
    {"sr_no": 24, "name": "Swat", "section": "V", "region": "Mardan", "lat": 72.313933, "lon": 34.762883},
    {"sr_no": 25, "name": "Sangota Line", "section": "V", "region": "Mardan", "lat": 72.313933, "lon": 34.762883},
    {"sr_no": 26, "name": "Akora PTC", "section": "V", "region": "Mardan", "lat": 72.142967, "lon": 33.988667},
    {"sr_no": 27, "name": "Akora Town", "section": "V", "region": "Mardan", "lat": 72.142967, "lon": 33.988667},
    {"sr_no": 28, "name": "Azakhail Bala", "section": "V", "region": "Mardan", "lat": 71.851867, "lon": 34.002000},
    {"sr_no": 29, "name": "Azakhail Payan", "section": "V", "region": "Mardan", "lat": 71.881350, "lon": 33.998050},
    {"sr_no": 30, "name": "Kabul River", "section": "V", "region": "Mardan", "lat": 71.993233, "lon": 34.012917},
    {"sr_no": 31, "name": "Khairabad", "section": "V", "region": "Mardan", "lat": 72.228333, "lon": 33.902183},
    {"sr_no": 32, "name": "Palai", "section": "V", "region": "Mardan", "lat": 72.072767, "lon": 34.510250},
    {"sr_no": 33, "name": "Pir Pai", "section": "V", "region": "Mardan", "lat": 71.900200, "lon": 34.001217},
    {"sr_no": 34, "name": "Risalpur Cantt.", "section": "V", "region": "Mardan", "lat": 71.991267, "lon": 34.051650},
    {"sr_no": 35, "name": "Risalpur Industrial", "section": "V", "region": "Mardan", "lat": 72.012133, "lon": 34.088833},
    {"sr_no": 36, "name": "Khishki", "section": "V", "region": "Mardan", "lat": 71.921633, "lon": 34.061700},
    {"sr_no": 37, "name": "Ziarat Kaka Sahib", "section": "V", "region": "Mardan", "lat": 72.028700, "lon": 33.971233},
    {"sr_no": 38, "name": "Peer Sabaq", "section": "V", "region": "Mardan", "lat": 72.048708, "lon": 34.036020},
    {"sr_no": 39, "name": "Baizo Kharki", "section": "V", "region": "Mardan", "lat": 72.014400, "lon": 33.281482},
    {"sr_no": 40, "name": "Bandagai", "section": "V", "region": "Mardan", "lat": 71.824167, "lon": 34.760472},
    {"sr_no": 41, "name": "Barikot", "section": "V", "region": "Mardan", "lat": 72.248667, "lon": 34.697900},
    {"sr_no": 42, "name": "Uch Dir", "section": "V", "region": "Mardan", "lat": 72.024583, "lon": 34.709861},
    {"sr_no": 43, "name": "Chakdara", "section": "V", "region": "Mardan", "lat": 72.024750, "lon": 34.684139},
    {"sr_no": 44, "name": "Bannu", "section": "V", "region": "Karak", "lat": 32.987470, "lon": 70.634140},
    {"sr_no": 45, "name": "Chowkara", "section": "V", "region": "Karak", "lat": 33.026610, "lon": 71.059240},
    {"sr_no": 46, "name": "CPF Makori", "section": "V", "region": "Karak", "lat": 0, "lon": 0},
    {"sr_no": 47, "name": "D.I. Khan", "section": "V", "region": "Karak", "lat": 31.870990, "lon": 70.842020},
    {"sr_no": 48, "name": "Esak Khumari", "section": "V", "region": "Karak", "lat": 33.307970, "lon": 71.047400},
    {"sr_no": 49, "name": "Gumbat", "section": "V", "region": "Karak", "lat": 33.486900, "lon": 71.662830},
    {"sr_no": 50, "name": "Gurguri", "section": "V", "region": "Karak", "lat": 33.288720, "lon": 70.784560},
    {"sr_no": 51, "name": "Hangu", "section": "V", "region": "Karak", "lat": 33.549360, "lon": 71.114640},
    {"sr_no": 52, "name": "Jahangiri", "section": "V", "region": "Karak", "lat": 32.956660, "lon": 71.004270},
    {"sr_no": 53, "name": "Kandakarak", "section": "V", "region": "Karak", "lat": 33.092590, "lon": 71.103120},
    {"sr_no": 54, "name": "Karak", "section": "V", "region": "Karak", "lat": 33.127800, "lon": 71.139310},
    {"sr_no": 55, "name": "Kohat", "section": "V", "region": "Karak", "lat": 33.512580, "lon": 71.493790},
    {"sr_no": 56, "name": "Kohat Cement", "section": "V", "region": "Karak", "lat": 33.512460, "lon": 71.570130},
    {"sr_no": 57, "name": "Kohat Ops. Phase", "section": "V", "region": "Karak", "lat": 33.601450, "lon": 71.512100},
    {"sr_no": 58, "name": "Lachi", "section": "V", "region": "Karak", "lat": 33.383330, "lon": 71.351940},
    {"sr_no": 59, "name": "Landi Jalandar", "section": "V", "region": "Karak", "lat": 33.308520, "lon": 70.925300},
    {"sr_no": 60, "name": "Landoki", "section": "V", "region": "Karak", "lat": 32.871280, "lon": 70.945580},
    {"sr_no": 61, "name": "Lucky Cement", "section": "V", "region": "Karak", "lat": 32.620190, "lon": 70.811790},
    {"sr_no": 62, "name": "Lucky City", "section": "V", "region": "Karak", "lat": 32.289280, "lon": 70.720930},
    {"sr_no": 63, "name": "Makori", "section": "V", "region": "Karak", "lat": 33.33844, "lon": 71.27176},
    {"sr_no": 64, "name": "Nari Panoos", "section": "V", "region": "Karak", "lat": 33.182620, "lon": 71.168530},
    {"sr_no": 65, "name": "Saray Norang", "section": "V", "region": "Karak", "lat": 0, "lon": 0},
    {"sr_no": 66, "name": "Shahbaz Khel", "section": "V", "region": "Karak", "lat": 32.40469, "lon": 70.75723},
    {"sr_no": 67, "name": "Shakardarah", "section": "V", "region": "Karak", "lat": 33.235200, "lon": 71.512150},
    {"sr_no": 68, "name": "Tank", "section": "V", "region": "Karak", "lat": 32.263610, "lon": 70.723060},
    {"sr_no": 69, "name": "Tarkhakoi", "section": "V", "region": "Karak", "lat": 33.156920, "lon": 71.180540},
    {"sr_no": 70, "name": "Teri", "section": "V", "region": "Karak", "lat": 33.312880, "lon": 71.096320},
    {"sr_no": 71, "name": "Zanakka", "section": "V", "region": "Karak", "lat": 33.281050, "lon": 71.281960},
]

def import_devices():
    db = SessionLocal()
    try:
        print(f"Starting import of {len(section_v_devices)} Section V devices...")
        print("-" * 80)

        added_count = 0
        updated_count = 0

        for device_info in section_v_devices:
            # Create client_id in format: SMS-V-001, SMS-V-002, etc.
            client_id = f"SMS-V-{str(device_info['sr_no']).zfill(3)}"

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
        print(f"  - Total: {len(section_v_devices)} devices")

        # Verify the import
        section_v_count = db.query(Device).filter(Device.client_id.like('SMS-V-%')).count()
        print(f"\nTotal Section V devices in database: {section_v_count}")

    except Exception as e:
        db.rollback()
        print(f"\nError during import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_devices()
