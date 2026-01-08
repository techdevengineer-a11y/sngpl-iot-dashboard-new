"""Database Backup and Recovery Service"""

import os
import shutil
import gzip
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import subprocess

from app.core.logging_config import get_logger

logger = get_logger("backup")


class BackupService:
    """Service for automated database backups and recovery"""

    def __init__(self):
        self.backup_dir = os.getenv("BACKUP_DIR", "./backups")
        self.database_path = os.getenv("DATABASE_URL", "sqlite:///./data/sngpl_iot.db").replace("sqlite:///", "")
        self.max_backups = int(os.getenv("MAX_BACKUPS", "30"))  # Keep last 30 backups
        self.compress_backups = os.getenv("COMPRESS_BACKUPS", "true").lower() == "true"
        self.ensure_backup_directory()

    def ensure_backup_directory(self):
        """Create backup directory if it doesn't exist"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            logger.info(f"Created backup directory: {self.backup_dir}")

    def create_backup(self, backup_name: Optional[str] = None) -> dict:
        """
        Create a database backup

        Args:
            backup_name: Optional custom backup name

        Returns:
            Dictionary with backup information
        """
        try:
            # Generate backup filename
            if not backup_name:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"sngpl_iot_backup_{timestamp}.db"

            backup_path = os.path.join(self.backup_dir, backup_name)

            # Check if source database exists
            if not os.path.exists(self.database_path):
                logger.error(f"Database file not found: {self.database_path}")
                return {
                    "success": False,
                    "error": "Database file not found",
                    "database_path": self.database_path
                }

            # Get database size
            db_size = os.path.getsize(self.database_path)

            # Copy database file
            logger.info(f"Creating backup: {backup_name}")
            shutil.copy2(self.database_path, backup_path)

            # Compress if enabled
            if self.compress_backups:
                compressed_path = f"{backup_path}.gz"
                with open(backup_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)

                # Remove uncompressed file
                os.remove(backup_path)
                backup_path = compressed_path
                logger.info(f"Backup compressed: {compressed_path}")

            # Get backup size
            backup_size = os.path.getsize(backup_path)
            compression_ratio = (1 - backup_size / db_size) * 100 if self.compress_backups else 0

            # Clean up old backups
            self.cleanup_old_backups()

            logger.info(f"Backup created successfully: {backup_path}")

            return {
                "success": True,
                "backup_name": os.path.basename(backup_path),
                "backup_path": backup_path,
                "database_size": db_size,
                "backup_size": backup_size,
                "compression_ratio": f"{compression_ratio:.1f}%",
                "compressed": self.compress_backups,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error creating backup: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def list_backups(self) -> List[dict]:
        """
        List all available backups

        Returns:
            List of backup information dictionaries
        """
        try:
            backups = []
            backup_files = sorted(
                [f for f in os.listdir(self.backup_dir) if f.startswith("sngpl_iot_backup_")],
                reverse=True  # Newest first
            )

            for filename in backup_files:
                filepath = os.path.join(self.backup_dir, filename)
                stat = os.stat(filepath)

                backups.append({
                    "filename": filename,
                    "filepath": filepath,
                    "size": stat.st_size,
                    "size_mb": f"{stat.st_size / (1024 * 1024):.2f}",
                    "compressed": filename.endswith(".gz"),
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

            return backups

        except Exception as e:
            logger.error(f"Error listing backups: {e}", exc_info=True)
            return []

    def restore_backup(self, backup_filename: str, create_backup_before_restore: bool = True) -> dict:
        """
        Restore database from a backup

        Args:
            backup_filename: Name of the backup file to restore
            create_backup_before_restore: Create a backup before restoring (recommended)

        Returns:
            Dictionary with restore information
        """
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)

            # Check if backup exists
            if not os.path.exists(backup_path):
                logger.error(f"Backup file not found: {backup_path}")
                return {
                    "success": False,
                    "error": "Backup file not found",
                    "backup_path": backup_path
                }

            # Create a safety backup before restoring
            safety_backup_info = None
            if create_backup_before_restore and os.path.exists(self.database_path):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safety_backup_info = self.create_backup(f"before_restore_{timestamp}.db")
                logger.info("Created safety backup before restore")

            # Decompress if needed
            restore_path = backup_path
            if backup_filename.endswith(".gz"):
                decompressed_path = backup_path.replace(".gz", "")
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(decompressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_path = decompressed_path
                logger.info("Backup decompressed for restore")

            # Restore database
            logger.info(f"Restoring database from: {backup_filename}")
            shutil.copy2(restore_path, self.database_path)

            # Clean up decompressed file if it was created
            if restore_path != backup_path:
                os.remove(restore_path)

            logger.info("Database restored successfully")

            return {
                "success": True,
                "backup_restored": backup_filename,
                "database_path": self.database_path,
                "safety_backup": safety_backup_info,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error restoring backup: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def cleanup_old_backups(self) -> dict:
        """
        Delete old backups exceeding max_backups limit

        Returns:
            Dictionary with cleanup information
        """
        try:
            backups = self.list_backups()

            if len(backups) <= self.max_backups:
                logger.info(f"No cleanup needed. Backups: {len(backups)}/{self.max_backups}")
                return {
                    "deleted_count": 0,
                    "remaining_count": len(backups),
                    "max_backups": self.max_backups
                }

            # Delete oldest backups
            backups_to_delete = backups[self.max_backups:]
            deleted_count = 0

            for backup in backups_to_delete:
                try:
                    os.remove(backup["filepath"])
                    deleted_count += 1
                    logger.info(f"Deleted old backup: {backup['filename']}")
                except Exception as e:
                    logger.error(f"Error deleting backup {backup['filename']}: {e}")

            logger.info(f"Cleanup completed: deleted {deleted_count} old backups")

            return {
                "deleted_count": deleted_count,
                "remaining_count": len(backups) - deleted_count,
                "max_backups": self.max_backups
            }

        except Exception as e:
            logger.error(f"Error during cleanup: {e}", exc_info=True)
            return {
                "error": str(e)
            }

    def delete_backup(self, backup_filename: str) -> dict:
        """
        Delete a specific backup file

        Args:
            backup_filename: Name of the backup file to delete

        Returns:
            Dictionary with deletion information
        """
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)

            if not os.path.exists(backup_path):
                return {
                    "success": False,
                    "error": "Backup file not found"
                }

            os.remove(backup_path)
            logger.info(f"Deleted backup: {backup_filename}")

            return {
                "success": True,
                "deleted_backup": backup_filename
            }

        except Exception as e:
            logger.error(f"Error deleting backup: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def get_backup_stats(self) -> dict:
        """
        Get backup statistics

        Returns:
            Dictionary with backup statistics
        """
        try:
            backups = self.list_backups()

            if not backups:
                return {
                    "total_backups": 0,
                    "total_size": 0,
                    "total_size_mb": "0.00",
                    "oldest_backup": None,
                    "newest_backup": None
                }

            total_size = sum(b["size"] for b in backups)

            return {
                "total_backups": len(backups),
                "max_backups": self.max_backups,
                "total_size": total_size,
                "total_size_mb": f"{total_size / (1024 * 1024):.2f}",
                "average_size_mb": f"{(total_size / len(backups)) / (1024 * 1024):.2f}",
                "oldest_backup": backups[-1] if backups else None,
                "newest_backup": backups[0] if backups else None,
                "backup_directory": self.backup_dir,
                "compression_enabled": self.compress_backups
            }

        except Exception as e:
            logger.error(f"Error getting backup stats: {e}", exc_info=True)
            return {
                "error": str(e)
            }


# Create global instance
backup_service = BackupService()
