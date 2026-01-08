"""Logging configuration for the application"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Define log format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Define log levels for different loggers
LOG_LEVEL = logging.INFO


def setup_logging():
    """Setup application logging"""

    # Create formatters
    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)

    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler for all logs (rotating)
    all_logs_handler = RotatingFileHandler(
        LOGS_DIR / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    all_logs_handler.setLevel(logging.INFO)
    all_logs_handler.setFormatter(formatter)
    root_logger.addHandler(all_logs_handler)

    # File handler for errors only (rotating)
    error_logs_handler = RotatingFileHandler(
        LOGS_DIR / "error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    error_logs_handler.setLevel(logging.ERROR)
    error_logs_handler.setFormatter(formatter)
    root_logger.addHandler(error_logs_handler)

    # File handler for MQTT logs (rotating)
    mqtt_logger = logging.getLogger("mqtt")
    mqtt_handler = RotatingFileHandler(
        LOGS_DIR / "mqtt.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3
    )
    mqtt_handler.setLevel(logging.INFO)
    mqtt_handler.setFormatter(formatter)
    mqtt_logger.addHandler(mqtt_handler)
    mqtt_logger.setLevel(logging.INFO)

    # File handler for API logs (rotating)
    api_logger = logging.getLogger("api")
    api_handler = RotatingFileHandler(
        LOGS_DIR / "api.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3
    )
    api_handler.setLevel(logging.INFO)
    api_handler.setFormatter(formatter)
    api_logger.addHandler(api_handler)
    api_logger.setLevel(logging.INFO)

    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)

    logging.info("Logging system initialized")


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)
