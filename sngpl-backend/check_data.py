"""Check database data"""
from app.db.database import SessionLocal
from app.models.models import Device, DeviceReading, Alarm

db = SessionLocal()

devices = db.query(Device).count()
readings = db.query(DeviceReading).count()
alarms = db.query(Alarm).count()

print(f'Devices: {devices}')
print(f'Readings: {readings}')
print(f'Alarms: {alarms}')

print('\nDevices in database:')
for d in db.query(Device).limit(10).all():
    print(f'  - ID: {d.id}, Client: {d.client_id}, Name: {d.device_name}, Active: {d.is_active}')

print('\nRecent readings:')
for r in db.query(DeviceReading).order_by(DeviceReading.timestamp.desc()).limit(5).all():
    print(f'  - Device ID: {r.device_id}, Temp: {r.temperature}, Time: {r.timestamp}')

db.close()
