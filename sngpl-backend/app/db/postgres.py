"""PostgreSQL database configuration (alternative to SQLite)"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# PostgreSQL-specific engine configuration
def create_postgres_engine(database_url: str):
    """
    Create PostgreSQL engine with production-ready settings

    Args:
        database_url: PostgreSQL connection URL
                     Format: postgresql://user:password@host:port/database

    Returns:
        SQLAlchemy engine instance
    """
    return create_engine(
        database_url,
        pool_size=20,  # Number of persistent connections
        max_overflow=40,  # Additional connections when pool is full
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Set to True for SQL query logging
        connect_args={
            "options": "-c timezone=utc"  # Use UTC timezone
        }
    )


def get_postgres_session_local(database_url: str):
    """
    Create session factory for PostgreSQL

    Args:
        database_url: PostgreSQL connection URL

    Returns:
        SessionLocal class for creating database sessions
    """
    engine = create_postgres_engine(database_url)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Migration helper functions
def is_postgres(database_url: str) -> bool:
    """Check if database URL is PostgreSQL"""
    return database_url.startswith("postgresql://") or database_url.startswith("postgres://")


def get_engine_for_url(database_url: str):
    """
    Get appropriate engine based on database URL

    Args:
        database_url: Database connection URL

    Returns:
        SQLAlchemy engine instance
    """
    if is_postgres(database_url):
        return create_postgres_engine(database_url)
    else:
        # SQLite engine (existing configuration)
        from app.db.database import engine
        return engine
