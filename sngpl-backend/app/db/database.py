"""Database configuration and session management - PostgreSQL + TimescaleDB"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Create PostgreSQL engine optimized for TimescaleDB
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=settings.DB_POOL_RECYCLE,  # Recycle connections
    echo=False,  # Set to True for SQL debugging
    pool_timeout=30,  # Connection timeout in seconds
    connect_args={
        "connect_timeout": 10,
        "application_name": "sngpl_iot_platform"
    }
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize TimescaleDB extension and hypertables (optional)
def init_timescale():
    """Initialize TimescaleDB extension and convert tables to hypertables (optional)"""
    try:
        with engine.connect() as conn:
            # Try to enable TimescaleDB extension
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
                conn.commit()
                logger.info("✓ TimescaleDB extension enabled")

                # Convert device_reading table to hypertable if not already
                try:
                    conn.execute(text("""
                        SELECT create_hypertable(
                            'device_reading',
                            'timestamp',
                            if_not_exists => TRUE,
                            chunk_time_interval => INTERVAL '1 day'
                        );
                    """))
                    conn.commit()
                    logger.info("✓ device_reading converted to hypertable")
                    logger.info("✓ TimescaleDB fully initialized - Time-series optimizations active")
                except Exception as e:
                    if "already a hypertable" not in str(e):
                        logger.warning(f"Could not create hypertable: {e}")

            except Exception as e:
                # TimescaleDB not available - continue with regular PostgreSQL
                if "is not available" in str(e) or "does not exist" in str(e):
                    logger.warning("⚠ TimescaleDB extension not found")
                    logger.warning("⚠ Running with standard PostgreSQL (no time-series optimizations)")
                    logger.info("ℹ To enable TimescaleDB:")
                    logger.info("  1. Install TimescaleDB: https://docs.timescale.com/install/")
                    logger.info("  2. Restart PostgreSQL")
                    logger.info("  3. Restart this application")
                else:
                    raise

    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        # Don't raise - allow app to continue with regular PostgreSQL
