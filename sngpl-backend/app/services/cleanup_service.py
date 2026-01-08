"""Data retention and cleanup service"""

import schedule
import time
import threading
from datetime import datetime, timedelta
from sqlalchemy import delete

from app.core.logging_config import get_logger
from app.db.database import SessionLocal
from app.models.models import DeviceReading, Alarm

logger = get_logger(__name__)


class CleanupService:
    """Service to clean up old data based on retention policies"""

    def __init__(self):
        self.running = False
        self.thread = None
        # Retention policies (in days)
        self.READING_RETENTION_DAYS = 90  # Keep readings for 90 days
        self.ALARM_RETENTION_DAYS = 180  # Keep alarms for 180 days (6 months)

    def cleanup_old_readings(self):
        """Delete device readings older than retention period"""
        db = SessionLocal()
        try:
            cutoff_date = datetime.now() - timedelta(days=self.READING_RETENTION_DAYS)

            # Count records to be deleted
            count = db.query(DeviceReading).filter(
                DeviceReading.timestamp < cutoff_date
            ).count()

            if count > 0:
                logger.info(f"Deleting {count} device readings older than {self.READING_RETENTION_DAYS} days")

                # Delete old readings
                db.query(DeviceReading).filter(
                    DeviceReading.timestamp < cutoff_date
                ).delete(synchronize_session=False)

                db.commit()
                logger.info(f"Successfully deleted {count} old device readings")
            else:
                logger.info("No old device readings to clean up")

        except Exception as e:
            logger.error(f"Error cleaning up device readings: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()

    def cleanup_old_alarms(self):
        """Delete resolved alarms older than retention period"""
        db = SessionLocal()
        try:
            cutoff_date = datetime.now() - timedelta(days=self.ALARM_RETENTION_DAYS)

            # Only delete resolved/acknowledged alarms
            count = db.query(Alarm).filter(
                Alarm.triggered_at < cutoff_date,
                Alarm.is_acknowledged == True
            ).count()

            if count > 0:
                logger.info(f"Deleting {count} acknowledged alarms older than {self.ALARM_RETENTION_DAYS} days")

                db.query(Alarm).filter(
                    Alarm.triggered_at < cutoff_date,
                    Alarm.is_acknowledged == True
                ).delete(synchronize_session=False)

                db.commit()
                logger.info(f"Successfully deleted {count} old alarms")
            else:
                logger.info("No old alarms to clean up")

        except Exception as e:
            logger.error(f"Error cleaning up alarms: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()

    def run_cleanup(self):
        """Run all cleanup tasks"""
        logger.info("Starting scheduled cleanup tasks")
        self.cleanup_old_readings()
        self.cleanup_old_alarms()
        logger.info("Cleanup tasks completed")

    def _run_schedule(self):
        """Run the scheduler in a separate thread"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    def start(self):
        """Start the cleanup service"""
        if self.running:
            logger.warning("Cleanup service is already running")
            return

        logger.info("Starting cleanup service")
        self.running = True

        # Schedule daily cleanup at 2 AM
        schedule.every().day.at("02:00").do(self.run_cleanup)

        # Also schedule weekly cleanup on Sunday at 3 AM (backup)
        schedule.every().sunday.at("03:00").do(self.run_cleanup)

        # Start scheduler thread
        self.thread = threading.Thread(target=self._run_schedule, daemon=True)
        self.thread.start()

        logger.info("Cleanup service started - scheduled daily at 2 AM")

    def stop(self):
        """Stop the cleanup service"""
        logger.info("Stopping cleanup service")
        self.running = False
        schedule.clear()

        if self.thread:
            self.thread.join(timeout=5)

        logger.info("Cleanup service stopped")


# Create global instance
cleanup_service = CleanupService()
