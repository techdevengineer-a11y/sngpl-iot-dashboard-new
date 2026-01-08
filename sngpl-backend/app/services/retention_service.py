"""Data Retention and Archival Service"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.models import DeviceReading, Alarm, AuditLog
from app.db.database import SessionLocal
from app.core.logging_config import get_logger

logger = get_logger("retention")


class RetentionService:
    """Service for managing data retention and archival"""

    def __init__(self):
        self.archive_dir = os.getenv("ARCHIVE_DIR", "./archives")
        self.ensure_archive_directory()

    def ensure_archive_directory(self):
        """Create archive directory if it doesn't exist"""
        if not os.path.exists(self.archive_dir):
            os.makedirs(self.archive_dir)
            logger.info(f"Created archive directory: {self.archive_dir}")

    def archive_device_readings(
        self,
        db: Session,
        retention_days: int = 90,
        delete_after_archive: bool = True
    ) -> dict:
        """
        Archive old device readings to JSON files and optionally delete from database

        Args:
            db: Database session
            retention_days: Keep readings newer than this many days
            delete_after_archive: Whether to delete readings after archiving

        Returns:
            Dictionary with archival statistics
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)

            # Get old readings
            old_readings = db.query(DeviceReading).filter(
                DeviceReading.timestamp < cutoff_date
            ).all()

            if not old_readings:
                logger.info("No device readings to archive")
                return {
                    "archived_count": 0,
                    "deleted_count": 0,
                    "cutoff_date": cutoff_date.isoformat(),
                    "status": "success"
                }

            # Group readings by month for organized archival
            readings_by_month = {}
            for reading in old_readings:
                month_key = reading.timestamp.strftime("%Y-%m")
                if month_key not in readings_by_month:
                    readings_by_month[month_key] = []

                readings_by_month[month_key].append({
                    "id": reading.id,
                    "device_id": reading.device_id,
                    "client_id": reading.client_id,
                    "temperature": reading.temperature,
                    "static_pressure": reading.static_pressure,
                    "differential_pressure": reading.differential_pressure,
                    "volume": reading.volume,
                    "total_volume_flow": reading.total_volume_flow,
                    "timestamp": reading.timestamp.isoformat()
                })

            # Save each month's data to a separate archive file
            archived_count = 0
            for month, readings in readings_by_month.items():
                archive_file = os.path.join(
                    self.archive_dir,
                    f"device_readings_{month}.json"
                )

                # If file exists, append to it
                if os.path.exists(archive_file):
                    with open(archive_file, 'r') as f:
                        existing_data = json.load(f)
                    existing_data.extend(readings)
                    readings = existing_data

                # Write to file
                with open(archive_file, 'w') as f:
                    json.dump(readings, f, indent=2)

                archived_count += len(readings_by_month[month])
                logger.info(f"Archived {len(readings_by_month[month])} readings to {archive_file}")

            # Delete archived readings if requested
            deleted_count = 0
            if delete_after_archive:
                deleted_count = db.query(DeviceReading).filter(
                    DeviceReading.timestamp < cutoff_date
                ).delete()
                db.commit()
                logger.info(f"Deleted {deleted_count} archived readings from database")

            return {
                "archived_count": archived_count,
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
                "archive_files": list(readings_by_month.keys()),
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Error archiving device readings: {e}", exc_info=True)
            db.rollback()
            return {
                "archived_count": 0,
                "deleted_count": 0,
                "error": str(e),
                "status": "failure"
            }

    def archive_alarms(
        self,
        db: Session,
        retention_days: int = 180,
        delete_after_archive: bool = False  # Keep alarms by default for compliance
    ) -> dict:
        """
        Archive old alarms to JSON files

        Args:
            db: Database session
            retention_days: Keep alarms newer than this many days
            delete_after_archive: Whether to delete alarms after archiving (default False for compliance)

        Returns:
            Dictionary with archival statistics
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)

            # Get old alarms (only acknowledged ones to preserve active alarms)
            old_alarms = db.query(Alarm).filter(
                and_(
                    Alarm.triggered_at < cutoff_date,
                    Alarm.is_acknowledged == True
                )
            ).all()

            if not old_alarms:
                logger.info("No alarms to archive")
                return {
                    "archived_count": 0,
                    "deleted_count": 0,
                    "cutoff_date": cutoff_date.isoformat(),
                    "status": "success"
                }

            # Group alarms by month
            alarms_by_month = {}
            for alarm in old_alarms:
                month_key = alarm.triggered_at.strftime("%Y-%m")
                if month_key not in alarms_by_month:
                    alarms_by_month[month_key] = []

                alarms_by_month[month_key].append({
                    "id": alarm.id,
                    "device_id": alarm.device_id,
                    "client_id": alarm.client_id,
                    "parameter": alarm.parameter,
                    "value": alarm.value,
                    "threshold_type": alarm.threshold_type,
                    "severity": alarm.severity,
                    "is_acknowledged": alarm.is_acknowledged,
                    "acknowledged_at": alarm.acknowledged_at.isoformat() if alarm.acknowledged_at else None,
                    "triggered_at": alarm.triggered_at.isoformat()
                })

            # Save to archive files
            archived_count = 0
            for month, alarms in alarms_by_month.items():
                archive_file = os.path.join(
                    self.archive_dir,
                    f"alarms_{month}.json"
                )

                if os.path.exists(archive_file):
                    with open(archive_file, 'r') as f:
                        existing_data = json.load(f)
                    existing_data.extend(alarms)
                    alarms = existing_data

                with open(archive_file, 'w') as f:
                    json.dump(alarms, f, indent=2)

                archived_count += len(alarms_by_month[month])
                logger.info(f"Archived {len(alarms_by_month[month])} alarms to {archive_file}")

            # Delete archived alarms if requested
            deleted_count = 0
            if delete_after_archive:
                deleted_count = db.query(Alarm).filter(
                    and_(
                        Alarm.triggered_at < cutoff_date,
                        Alarm.is_acknowledged == True
                    )
                ).delete()
                db.commit()
                logger.info(f"Deleted {deleted_count} archived alarms from database")

            return {
                "archived_count": archived_count,
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
                "archive_files": list(alarms_by_month.keys()),
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Error archiving alarms: {e}", exc_info=True)
            db.rollback()
            return {
                "archived_count": 0,
                "deleted_count": 0,
                "error": str(e),
                "status": "failure"
            }

    def archive_audit_logs(
        self,
        db: Session,
        retention_days: int = 365,
        delete_after_archive: bool = False  # Keep audit logs for compliance
    ) -> dict:
        """
        Archive old audit logs to JSON files

        Args:
            db: Database session
            retention_days: Keep logs newer than this many days
            delete_after_archive: Whether to delete logs after archiving

        Returns:
            Dictionary with archival statistics
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)

            # Get old audit logs
            old_logs = db.query(AuditLog).filter(
                AuditLog.created_at < cutoff_date
            ).all()

            if not old_logs:
                logger.info("No audit logs to archive")
                return {
                    "archived_count": 0,
                    "deleted_count": 0,
                    "cutoff_date": cutoff_date.isoformat(),
                    "status": "success"
                }

            # Group logs by month
            logs_by_month = {}
            for log in old_logs:
                month_key = log.created_at.strftime("%Y-%m")
                if month_key not in logs_by_month:
                    logs_by_month[month_key] = []

                logs_by_month[month_key].append({
                    "id": log.id,
                    "user_id": log.user_id,
                    "username": log.username,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "details": log.details,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "status": log.status,
                    "created_at": log.created_at.isoformat()
                })

            # Save to archive files
            archived_count = 0
            for month, logs in logs_by_month.items():
                archive_file = os.path.join(
                    self.archive_dir,
                    f"audit_logs_{month}.json"
                )

                if os.path.exists(archive_file):
                    with open(archive_file, 'r') as f:
                        existing_data = json.load(f)
                    existing_data.extend(logs)
                    logs = existing_data

                with open(archive_file, 'w') as f:
                    json.dump(logs, f, indent=2)

                archived_count += len(logs_by_month[month])
                logger.info(f"Archived {len(logs_by_month[month])} audit logs to {archive_file}")

            # Delete archived logs if requested
            deleted_count = 0
            if delete_after_archive:
                deleted_count = db.query(AuditLog).filter(
                    AuditLog.created_at < cutoff_date
                ).delete()
                db.commit()
                logger.info(f"Deleted {deleted_count} archived audit logs from database")

            return {
                "archived_count": archived_count,
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
                "archive_files": list(logs_by_month.keys()),
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Error archiving audit logs: {e}", exc_info=True)
            db.rollback()
            return {
                "archived_count": 0,
                "deleted_count": 0,
                "error": str(e),
                "status": "failure"
            }

    def run_all_retention_policies(self):
        """
        Run all retention policies

        Called by scheduled task (e.g., daily cron job)
        """
        logger.info("Running data retention policies...")

        db = SessionLocal()
        try:
            # Archive device readings (90 days, delete after archive)
            readings_result = self.archive_device_readings(
                db,
                retention_days=int(os.getenv("READINGS_RETENTION_DAYS", "90")),
                delete_after_archive=os.getenv("DELETE_ARCHIVED_READINGS", "true").lower() == "true"
            )
            logger.info(f"Device readings archival: {readings_result}")

            # Archive alarms (180 days, keep in database for compliance)
            alarms_result = self.archive_alarms(
                db,
                retention_days=int(os.getenv("ALARMS_RETENTION_DAYS", "180")),
                delete_after_archive=os.getenv("DELETE_ARCHIVED_ALARMS", "false").lower() == "true"
            )
            logger.info(f"Alarms archival: {alarms_result}")

            # Archive audit logs (365 days, keep in database for compliance)
            audit_result = self.archive_audit_logs(
                db,
                retention_days=int(os.getenv("AUDIT_RETENTION_DAYS", "365")),
                delete_after_archive=os.getenv("DELETE_ARCHIVED_AUDIT", "false").lower() == "true"
            )
            logger.info(f"Audit logs archival: {audit_result}")

            return {
                "device_readings": readings_result,
                "alarms": alarms_result,
                "audit_logs": audit_result,
                "execution_time": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error running retention policies: {e}", exc_info=True)
            return {
                "error": str(e),
                "status": "failure"
            }
        finally:
            db.close()


# Create global instance
retention_service = RetentionService()
