"""
Scheduler Service for automatic maintenance tasks
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.logging_config import get_logger
from app.services.retention_service import retention_service
from app.db.database import SessionLocal

logger = get_logger("scheduler")


class SchedulerService:
    """Service for scheduling automatic maintenance tasks"""

    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.is_running = False

    def start(self):
        """Start the scheduler with configured jobs"""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return

        self.scheduler = AsyncIOScheduler()

        # Job 1: Data retention - runs daily at 2 AM
        self.scheduler.add_job(
            self.run_data_retention,
            CronTrigger(hour=2, minute=0),
            id="data_retention",
            name="Data Retention Job",
            replace_existing=True
        )

        # Job 2: Database maintenance - runs weekly on Sunday at 3 AM
        self.scheduler.add_job(
            self.run_db_maintenance,
            CronTrigger(day_of_week="sun", hour=3, minute=0),
            id="db_maintenance",
            name="Database Maintenance Job",
            replace_existing=True
        )

        # Job 3: Health check - runs every 5 minutes
        self.scheduler.add_job(
            self.run_health_check,
            "interval",
            minutes=5,
            id="health_check",
            name="Health Check Job",
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True
        logger.info("Scheduler started with maintenance jobs")

    def stop(self):
        """Stop the scheduler"""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler stopped")

    async def run_data_retention(self):
        """Run data retention policies"""
        logger.info("Starting scheduled data retention...")
        try:
            result = retention_service.run_all_retention_policies()
            logger.info(f"Data retention completed: {result}")
        except Exception as e:
            logger.error(f"Data retention failed: {e}", exc_info=True)

    async def run_db_maintenance(self):
        """Run database maintenance tasks"""
        logger.info("Starting scheduled database maintenance...")
        try:
            db = SessionLocal()
            try:
                # Update statistics
                from sqlalchemy import text
                db.execute(text("ANALYZE device_readings;"))
                db.execute(text("ANALYZE alarms;"))
                db.execute(text("ANALYZE devices;"))
                db.commit()
                logger.info("Database statistics updated")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Database maintenance failed: {e}", exc_info=True)

    async def run_health_check(self):
        """Run system health check"""
        try:
            db = SessionLocal()
            try:
                from sqlalchemy import text

                # Check database connection
                result = db.execute(text("SELECT 1"))
                result.fetchone()

                # Check table row counts
                readings_count = db.execute(
                    text("SELECT COUNT(*) FROM device_readings WHERE timestamp > NOW() - INTERVAL '1 hour'")
                ).scalar()

                devices_count = db.execute(
                    text("SELECT COUNT(*) FROM devices WHERE is_active = true")
                ).scalar()

                # Log health status
                logger.debug(f"Health check OK: {devices_count} active devices, {readings_count} readings in last hour")

            finally:
                db.close()
        except Exception as e:
            logger.error(f"Health check failed: {e}")

    def get_job_status(self) -> dict:
        """Get status of all scheduled jobs"""
        if not self.scheduler:
            return {"status": "not_started", "jobs": []}

        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })

        return {
            "status": "running" if self.is_running else "stopped",
            "jobs": jobs
        }


# Global instance
scheduler_service = SchedulerService()
