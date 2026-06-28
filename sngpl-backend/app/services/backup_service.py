"""Database Backup and Recovery Service (PostgreSQL via pg_dump / pg_restore).

Drop-in replacement for the previous SQLite file-copy implementation, which did
not work against the production PostgreSQL database. Public method signatures and
return-dict keys are unchanged, so app/api/v1/backup.py needs no edits.
"""

import os
import subprocess
from datetime import datetime
from typing import Optional, List
from urllib.parse import urlparse

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("backup")

BACKUP_PREFIX = "sngpl_backup_"
BACKUP_SUFFIX = ".dump"          # pg_dump custom format (-Fc), compressed + restorable


class BackupService:
    """Service for PostgreSQL database backups and recovery."""

    def __init__(self):
        self.backup_dir = os.getenv("BACKUP_DIR", "./backups")
        self.max_backups = int(os.getenv("MAX_BACKUPS", "30"))
        self.compress_backups = True  # -Fc is always compressed
        self.ensure_backup_directory()

    def ensure_backup_directory(self):
        os.makedirs(self.backup_dir, exist_ok=True)

    def _conn(self):
        """Build (env, [pg connection args]) from settings.DATABASE_URL."""
        url = urlparse(settings.DATABASE_URL)
        env = {**os.environ}
        if url.password:
            env["PGPASSWORD"] = url.password
        target = [
            "-h", url.hostname or "localhost",
            "-p", str(url.port or 5432),
            "-U", url.username or "postgres",
            "-d", (url.path or "/").lstrip("/"),
        ]
        return env, target

    def create_backup(self, backup_name: Optional[str] = None) -> dict:
        try:
            if not backup_name:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"{BACKUP_PREFIX}{ts}{BACKUP_SUFFIX}"
            if not backup_name.endswith(BACKUP_SUFFIX):
                backup_name += BACKUP_SUFFIX
            backup_path = os.path.join(self.backup_dir, backup_name)

            env, target = self._conn()
            cmd = ["pg_dump", *target, "-Fc", "-f", backup_path]
            logger.info(f"Creating backup: {backup_name}")
            subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)

            backup_size = os.path.getsize(backup_path)
            self.cleanup_old_backups()
            logger.info(f"Backup created: {backup_path} ({backup_size} bytes)")
            return {
                "success": True,
                "backup_name": backup_name,
                "backup_path": backup_path,
                "backup_size": backup_size,
                "compressed": True,
                "timestamp": datetime.now().isoformat(),
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"pg_dump failed: {e.stderr}")
            return {"success": False, "error": f"pg_dump failed: {(e.stderr or '').strip()[:300]}"}
        except Exception as e:
            logger.error(f"Error creating backup: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def list_backups(self) -> List[dict]:
        try:
            files = sorted(
                [f for f in os.listdir(self.backup_dir) if f.endswith(BACKUP_SUFFIX)],
                reverse=True,
            )
            backups = []
            for filename in files:
                filepath = os.path.join(self.backup_dir, filename)
                st = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "filepath": filepath,
                    "size": st.st_size,
                    "size_mb": f"{st.st_size / (1024 * 1024):.2f}",
                    "compressed": True,
                    "created_at": datetime.fromtimestamp(st.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(st.st_mtime).isoformat(),
                })
            return backups
        except Exception as e:
            logger.error(f"Error listing backups: {e}", exc_info=True)
            return []

    def restore_backup(self, backup_filename: str,
                       create_backup_before_restore: bool = True) -> dict:
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)
            if not os.path.exists(backup_path):
                return {"success": False, "error": "Backup file not found"}

            safety_backup_info = None
            if create_backup_before_restore:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                safety_backup_info = self.create_backup(
                    f"{BACKUP_PREFIX}before_restore_{ts}{BACKUP_SUFFIX}")

            env, target = self._conn()
            cmd = ["pg_restore", *target, "--clean", "--if-exists", "--no-owner", backup_path]
            logger.info(f"Restoring database from: {backup_filename}")
            subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
            logger.info("Database restored successfully")
            return {
                "success": True,
                "backup_restored": backup_filename,
                "safety_backup": safety_backup_info,
                "timestamp": datetime.now().isoformat(),
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"pg_restore error: {e.stderr}")
            return {"success": False, "error": f"pg_restore failed: {(e.stderr or '').strip()[:300]}"}
        except Exception as e:
            logger.error(f"Error restoring backup: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def cleanup_old_backups(self) -> dict:
        try:
            backups = self.list_backups()
            if len(backups) <= self.max_backups:
                return {"deleted_count": 0, "remaining_count": len(backups),
                        "max_backups": self.max_backups}
            to_delete = backups[self.max_backups:]
            deleted = 0
            for b in to_delete:
                try:
                    os.remove(b["filepath"])
                    deleted += 1
                    logger.info(f"Deleted old backup: {b['filename']}")
                except Exception as e:
                    logger.error(f"Error deleting backup {b['filename']}: {e}")
            return {"deleted_count": deleted, "remaining_count": len(backups) - deleted,
                    "max_backups": self.max_backups}
        except Exception as e:
            logger.error(f"Error during cleanup: {e}", exc_info=True)
            return {"error": str(e)}

    def delete_backup(self, backup_filename: str) -> dict:
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)
            if not os.path.exists(backup_path):
                return {"success": False, "error": "Backup file not found"}
            os.remove(backup_path)
            logger.info(f"Deleted backup: {backup_filename}")
            return {"success": True, "deleted_backup": backup_filename}
        except Exception as e:
            logger.error(f"Error deleting backup: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def get_backup_stats(self) -> dict:
        try:
            backups = self.list_backups()
            if not backups:
                return {"total_backups": 0, "total_size": 0, "total_size_mb": "0.00",
                        "oldest_backup": None, "newest_backup": None}
            total = sum(b["size"] for b in backups)
            return {
                "total_backups": len(backups),
                "max_backups": self.max_backups,
                "total_size": total,
                "total_size_mb": f"{total / (1024 * 1024):.2f}",
                "average_size_mb": f"{(total / len(backups)) / (1024 * 1024):.2f}",
                "oldest_backup": backups[-1],
                "newest_backup": backups[0],
                "backup_directory": self.backup_dir,
                "compression_enabled": True,
            }
        except Exception as e:
            logger.error(f"Error getting backup stats: {e}", exc_info=True)
            return {"error": str(e)}


# Create global instance
backup_service = BackupService()
