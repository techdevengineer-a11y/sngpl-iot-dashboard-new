"""Add all 52 Section I (Multan) SMS devices"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime
from app.database import SessionLocal
from app.models.device import Device

devices_to_add = [
    {"client_id": "abdul_hakeem", "device_name": "Abdul Hakeem", "location": "Abdul Hakeem, Multan"},
    {"client_id": "chak_79", "device_name": "Chak 79", "location": "Chak 79, Multan"},
    {"client_id": "chowk_pernit", "device_name": "Chowk Pernit", "location": "Chowk Pernit, Multan"},
    {"client_id": "chowk_sarwar_shaheed", "device_name": "Chowk Sarwar Shaheed", "location": "Chowk Sarwar Shaheed, Multan"},
    {"client_id": "colony_textile_mills", "device_name": "Colony Textile Mills", "location": "Colony Textile Mills, Multan"},
    {"client_id": "dg_cement", "device_name": "DG Cement", "location": "DG Cement, Multan"},
    {"client_id": "dg_khan", "device_name": "DG Khan", "location": "DG Khan, Multan"},
    {"client_id": "ih_multan", "device_name": "IH-Multan", "location": "IH-Multan, Multan"},
    {"client_id": "ii_multan", "device_name": "II-Multan", "location": "II-Multan, Multan"},
    {"client_id": "i_multan", "device_name": "I-Multan", "location": "I-Multan, Multan"},
    {"client_id": "industrial_estate", "device_name": "Industrial Estate", "location": "Industrial Estate, Multan"},
    {"client_id": "iv_multan", "device_name": "IV-Multan", "location": "IV-Multan, Multan"},
    {"client_id": "jahangirabad", "device_name": "Jahangirabad", "location": "Jahangirabad, Multan"},
    {"client_id": "jahantan", "device_name": "Jahantan", "location": "Jahantan, Multan"},
    {"client_id": "jalal_pur", "device_name": "Jalal pur", "location": "Jalal pur, Multan"},
    {"client_id": "jodh_pur", "device_name": "Jodh Pur", "location": "Jodh Pur, Multan"},
    {"client_id": "kabar_wala", "device_name": "Kabar Wala", "location": "Kabar Wala, Multan"},
    {"client_id": "kacha_khu", "device_name": "Kacha Khu", "location": "Kacha Khu, Multan"},
    {"client_id": "kapco_colony", "device_name": "Kapco Colony", "location": "Kapco Colony, Multan"},
    {"client_id": "khan_garh", "device_name": "Khan Garh", "location": "Khan Garh, Multan"},
    {"client_id": "khanewal", "device_name": "Khanewal", "location": "Khanewal, Multan"},
    {"client_id": "kot_addu", "device_name": "Kot Addu", "location": "Kot Addu, Multan"},
    {"client_id": "kot_qaisrani", "device_name": "Kot Qaisrani", "location": "Kot Qaisrani, Multan"},
    {"client_id": "layyah", "device_name": "Layyah", "location": "Layyah, Multan"},
    {"client_id": "luddan", "device_name": "Luddan", "location": "Luddan, Multan"},
    {"client_id": "malni_sial", "device_name": "Malni Sial", "location": "Malni Sial, Multan"},
    {"client_id": "makhdoom_rashid", "device_name": "Makhdoom Rashid", "location": "Makhdoom Rashid, Multan"},
    {"client_id": "matotty", "device_name": "Matotty", "location": "Matotty, Multan"},
    {"client_id": "mehmood_textile_mills", "device_name": "Mehmood Textile Mills", "location": "Mehmood Textile Mills, Multan"},
    {"client_id": "mian_chanu", "device_name": "Mian Chanu", "location": "Mian Chanu, Multan"},
    {"client_id": "muzaffar_garh", "device_name": "Muzaffar Garh", "location": "Muzaffar Garh, Multan"},
    {"client_id": "nanakpur", "device_name": "Nanakpur", "location": "Nanakpur, Multan"},
    {"client_id": "naseem_enterprises", "device_name": "Naseem Enterprises", "location": "Naseem Enterprises, Multan"},
    {"client_id": "parco", "device_name": "Parco", "location": "Parco, Multan"},
    {"client_id": "qadir_pur_rawan", "device_name": "Qadir Pur Rawan", "location": "Qadir Pur Rawan, Multan"},
    {"client_id": "qasba_marral", "device_name": "Qasba Marral", "location": "Qasba Marral, Multan"},
    {"client_id": "rohilan_wali", "device_name": "Rohilan Wali", "location": "Rohilan Wali, Multan"},
    {"client_id": "sananwan", "device_name": "Sananwan", "location": "Sananwan, Multan"},
    {"client_id": "shadan_lund", "device_name": "Shadan lund", "location": "Shadan lund, Multan"},
    {"client_id": "shah_jamal", "device_name": "Shah Jamal", "location": "Shah Jamal, Multan"},
    {"client_id": "shah_sadruddin", "device_name": "Shah Sadruddin", "location": "Shah Sadruddin, Multan"},
    {"client_id": "sham_kot", "device_name": "Sham Kot", "location": "Sham Kot, Multan"},
    {"client_id": "shehar_sultan", "device_name": "Shehar Sultan", "location": "Shehar Sultan, Multan"},
    {"client_id": "shujabad", "device_name": "Shujabad", "location": "Shujabad, Multan"},
    {"client_id": "tallamba", "device_name": "Tallamba", "location": "Tallamba, Multan"},
    {"client_id": "taunsa_sharif", "device_name": "Taunsa Sharif", "location": "Taunsa Sharif, Multan"},
    {"client_id": "tibba_sultan", "device_name": "Tibba Sultan", "location": "Tibba Sultan, Multan"},
    {"client_id": "vehari", "device_name": "Vehari", "location": "Vehari, Multan"},
    {"client_id": "vi_multan", "device_name": "VI-Multan", "location": "VI-Multan, Multan"},
    {"client_id": "v_multan", "device_name": "V-Multan", "location": "V-Multan, Multan"},
    {"client_id": "wasandewali", "device_name": "Wasandewali", "location": "Wasandewali, Multan"},
    {"client_id": "bhakkar", "device_name": "Bhakkar", "location": "Bhakkar, Multan"},
]

print("Adding 52 Section I (Multan) SMS devices...")
print("=" * 60)

db = SessionLocal()
success = 0
skipped = 0

for d in devices_to_add:
    existing = db.query(Device).filter(Device.client_id == d['client_id']).first()
    if existing:
        print(f"Skip: {d['device_name']}")
        skipped += 1
    else:
        device = Device(
            client_id=d['client_id'],
            device_name=d['device_name'],
            device_type='EVC',
            location=d['location'],
            latitude=30.1575,
            longitude=71.5249,
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(device)
        print(f"Added: {d['device_name']}")
        success += 1

db.commit()
total = db.query(Device).count()
db.close()

print("=" * 60)
print(f"SUCCESS: Added {success}, Skipped {skipped}, Total devices: {total}")
print("Open http://localhost:5173/devices to see them!")
