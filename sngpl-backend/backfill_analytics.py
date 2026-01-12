"""
Backfill T18-T114 analytics data from existing T10-T17 readings
Run this script once to populate historical analytics data
"""

from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import DeviceReading
from app.db.database import get_db_url
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backfill_analytics():
    """Backfill T18-T114 values from T10-T17 readings"""

    # Create database connection
    engine = create_engine(get_db_url())
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Get all readings where T18-T114 are zero
        readings = db.query(DeviceReading).filter(
            DeviceReading.last_hour_flow_time == 0.0
        ).order_by(DeviceReading.timestamp).all()

        logger.info(f"Found {len(readings)} readings to backfill")

        updated_count = 0
        for reading in readings:
            # Get readings from last hour for this device
            one_hour_ago = reading.timestamp - timedelta(hours=1)
            last_hour_readings = db.query(DeviceReading).filter(
                DeviceReading.device_id == reading.device_id,
                DeviceReading.timestamp >= one_hour_ago,
                DeviceReading.timestamp <= reading.timestamp
            ).all()

            if len(last_hour_readings) > 1:
                # Calculate averages from last hour
                avg_diff_pressure = sum(r.differential_pressure or 0 for r in last_hour_readings) / len(last_hour_readings)
                avg_static_pressure = sum(r.static_pressure or 0 for r in last_hour_readings) / len(last_hour_readings)
                avg_temperature = sum(r.temperature or 0 for r in last_hour_readings) / len(last_hour_readings)
                total_volume = sum(r.volume or 0 for r in last_hour_readings)

                # Calculate flow time (fraction of hour where flow was active)
                flow_time = sum(3600 for r in last_hour_readings if (r.differential_pressure or 0) > 5)

                # Energy calculation: volume * pressure * gravity factor
                total_energy = total_volume * avg_static_pressure * 0.6

                # Specific gravity (typical natural gas: 0.55-0.7)
                specific_gravity = min(0.7, max(0.55, 0.6 + (avg_static_pressure / 1000)))

                # Update reading
                reading.last_hour_flow_time = flow_time
                reading.last_hour_diff_pressure = avg_diff_pressure
                reading.last_hour_static_pressure = avg_static_pressure
                reading.last_hour_temperature = avg_temperature
                reading.last_hour_volume = total_volume
                reading.last_hour_energy = total_energy
                reading.specific_gravity = specific_gravity

                updated_count += 1

                if updated_count % 100 == 0:
                    db.commit()
                    logger.info(f"Updated {updated_count} readings...")

        db.commit()
        logger.info(f"✓ Successfully backfilled {updated_count} readings")

    except Exception as e:
        logger.error(f"Error backfilling data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting analytics data backfill...")
    backfill_analytics()
    logger.info("Backfill complete!")
