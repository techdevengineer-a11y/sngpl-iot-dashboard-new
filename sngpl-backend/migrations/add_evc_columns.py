"""
Migration: Add EVC-specific columns to device_readings + meter_type/units to devices.
Run once on the server:  python migrations/add_evc_columns.py

device_readings (new ft3 columns):
  - volume_ft3                 (E14, EVC-only)
  - total_volume_flow_ft3h     (E13, EVC-only)
  - last_hour_volume_ft3       (E112, EVC-only)
  - primary_volume             (E115, EVC-only, always ft3)

devices (new classification columns):
  - meter_type                 ('FC' or 'EVC') — nullable
  - units                      ('MCF' | 'CF' | 'CM') — nullable

Also seeds the 74 known Section II devices from the prior frontend hardcoded map.
Idempotent — re-running skips existing columns and does not overwrite non-null rows.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.config import settings
from sqlalchemy import create_engine

engine = create_engine(settings.DATABASE_URL)

READING_COLUMNS = [
    "volume_ft3",
    "total_volume_flow_ft3h",
    "last_hour_volume_ft3",
    "primary_volume",
]

DEVICE_COLUMNS = {
    "meter_type": "VARCHAR(16)",
    "units": "VARCHAR(16)",
}

# Seed data — mirror of sngpl-frontend/src/utils/deviceMetersDefaults.ts
SECTION_II_SEED = {
    'SMS-II-001': ('FC',  'MCF'),
    'SMS-II-002': ('FC',  'MCF'),
    'SMS-II-003': ('FC',  'MCF'),
    'SMS-II-004': ('FC',  'MCF'),
    'SMS-II-005': ('FC',  'MCF'),
    'SMS-II-006': ('FC',  'MCF'),
    'SMS-II-007': ('EVC', 'CF'),
    'SMS-II-008': ('EVC', 'CF'),
    'SMS-II-009': ('EVC', 'CF'),
    'SMS-II-010': ('FC',  'MCF'),
    'SMS-II-011': ('EVC', 'CM'),
    'SMS-II-012': ('EVC', 'CF'),
    'SMS-II-013': ('FC',  'MCF'),
    'SMS-II-014': ('FC',  'MCF'),
    'SMS-II-015': ('FC',  'MCF'),
    'SMS-II-016': ('FC',  'MCF'),
    'SMS-II-017': ('FC',  'MCF'),
    'SMS-II-018': ('FC',  'MCF'),
    'SMS-II-019': ('FC',  'MCF'),
    'SMS-II-020': ('FC',  'MCF'),
    'SMS-II-021': ('FC',  'MCF'),
    'SMS-II-022': ('FC',  'MCF'),
    'SMS-II-023': ('FC',  'MCF'),
    'SMS-II-024': ('FC',  'MCF'),
    'SMS-II-025': ('EVC', 'CM'),
    'SMS-II-026': ('EVC', 'CF'),
    'SMS-II-027': ('EVC', 'CF'),
    'SMS-II-028': ('EVC', 'CF'),
    'SMS-II-029': ('FC',  'MCF'),
    'SMS-II-030': ('FC',  'MCF'),
    'SMS-II-031': ('FC',  'MCF'),
    'SMS-II-032': ('EVC', 'CF'),
    'SMS-II-033': ('EVC', 'CF'),
    'SMS-II-034': ('FC',  'MCF'),
    'SMS-II-035': ('FC',  'MCF'),
    'SMS-II-036': ('FC',  'MCF'),
    'SMS-II-037': ('FC',  'MCF'),
    'SMS-II-038': ('FC',  'MCF'),
    'SMS-II-039': ('EVC', 'CF'),
    'SMS-II-040': ('EVC', 'CF'),
    'SMS-II-041': ('EVC', 'CM'),
    'SMS-II-043': ('FC',  'MCF'),
    'SMS-II-044': ('FC',  'MCF'),
    'SMS-II-045': ('EVC', 'CF'),
    'SMS-II-046': ('FC',  'MCF'),
    'SMS-II-047': ('EVC', 'CF'),
    'SMS-II-049': ('FC',  'MCF'),
    'SMS-II-050': ('EVC', 'CF'),
    'SMS-II-051': ('EVC', 'CF'),
    'SMS-II-052': ('EVC', 'CF'),
    'SMS-II-053': ('EVC', 'CM'),
    'SMS-II-054': ('EVC', 'CF'),
    'SMS-II-055': ('EVC', 'CF'),
    'SMS-II-056': ('EVC', 'CF'),
    'SMS-II-057': ('EVC', 'CF'),
    'SMS-II-058': ('EVC', 'CF'),
    'SMS-II-059': ('FC',  'MCF'),
    'SMS-II-060': ('EVC', 'CF'),
    'SMS-II-061': ('EVC', 'CF'),
    'SMS-II-062': ('EVC', 'CF'),
    'SMS-II-063': ('FC',  'MCF'),
    'SMS-II-064': ('FC',  'MCF'),
    'SMS-II-065': ('FC',  'MCF'),
    'SMS-II-066': ('FC',  'MCF'),
    'SMS-II-067': ('FC',  'MCF'),
    'SMS-II-068': ('FC',  'MCF'),
    'SMS-II-069': ('EVC', 'CF'),
    'SMS-II-070': ('EVC', 'CF'),
    'SMS-II-072': ('EVC', 'CF'),
    'SMS-II-073': ('FC',  'MCF'),
    'SMS-II-074': ('FC',  'MCF'),
    'SMS-II-075': ('EVC', 'CF'),
    'SMS-II-076': ('FC',  'MCF'),
    'SMS-II-077': ('EVC', 'CM'),
}


def column_exists(conn, table, col):
    row = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :col"
    ), {"table": table, "col": col}).fetchone()
    return row is not None


with engine.connect() as conn:
    # --- device_readings: ft3 columns ---
    for col in READING_COLUMNS:
        if column_exists(conn, "device_readings", col):
            print(f"[device_readings] Column '{col}' already exists. Skipping.")
        else:
            conn.execute(text(
                f"ALTER TABLE device_readings ADD COLUMN {col} DOUBLE PRECISION"
            ))
            print(f"[device_readings] Added '{col}'.")

    # --- devices: meter_type / units ---
    for col, ddl in DEVICE_COLUMNS.items():
        if column_exists(conn, "devices", col):
            print(f"[devices] Column '{col}' already exists. Skipping.")
        else:
            conn.execute(text(f"ALTER TABLE devices ADD COLUMN {col} {ddl}"))
            print(f"[devices] Added '{col}' {ddl}.")

    # --- Seed Section II devices (only where NULL, so re-runs are safe) ---
    seeded = 0
    for client_id, (mtype, units) in SECTION_II_SEED.items():
        result = conn.execute(text(
            "UPDATE devices "
            "SET meter_type = :mtype, units = :units "
            "WHERE client_id = :cid "
            "  AND (meter_type IS NULL OR units IS NULL)"
        ), {"mtype": mtype, "units": units, "cid": client_id})
        if result.rowcount:
            seeded += result.rowcount

    print(f"[devices] Seeded meter_type/units for {seeded} Section II rows (NULL ones only).")

    conn.commit()

print("Migration complete.")
