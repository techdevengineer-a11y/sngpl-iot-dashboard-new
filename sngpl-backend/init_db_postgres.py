"""
Initialize PostgreSQL + TimescaleDB Database
Creates database, tables, TimescaleDB hypertables, and default admin user
"""

import sys
import os
from datetime import datetime
import bcrypt
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.database import engine, Base, init_timescale
from app.models.models import User, Device, AlarmThreshold


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_database():
    """Create the database if it doesn't exist"""
    # Parse database URL
    db_url = settings.DATABASE_URL
    # Example: postgresql://user:pass@host:port/dbname
    parts = db_url.replace('postgresql://', '').split('@')
    user_pass = parts[0].split(':')
    host_port_db = parts[1].split('/')

    user = user_pass[0]
    password = user_pass[1]
    host_port = host_port_db[0].split(':')
    host = host_port[0]
    port = int(host_port[1]) if len(host_port) > 1 else 5432
    dbname = host_port_db[1]

    print(f"\n{'='*60}")
    print(f"  PostgreSQL Database Initialization")
    print(f"{'='*60}")
    print(f"  Host: {host}:{port}")
    print(f"  Database: {dbname}")
    print(f"  User: {user}")
    print(f"{'='*60}\n")

    try:
        # Connect to PostgreSQL server (not to specific database)
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database='postgres'  # Connect to default database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (dbname,)
        )
        exists = cursor.fetchone()

        if exists:
            print(f"[INFO] Database '{dbname}' already exists")
        else:
            # Create database
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(dbname)
                )
            )
            print(f"[OK] Database '{dbname}' created successfully")

        cursor.close()
        conn.close()

        # Now connect to the new database and fix permissions
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=dbname
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Grant necessary permissions (PostgreSQL 15+ requirement)
        try:
            print(f"[INFO] Setting up permissions for user '{user}'...")

            cursor.execute(f"GRANT USAGE ON SCHEMA public TO {user};")
            cursor.execute(f"GRANT CREATE ON SCHEMA public TO {user};")
            cursor.execute(f"GRANT ALL PRIVILEGES ON SCHEMA public TO {user};")
            cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {user};")
            cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {user};")

            print(f"[OK] Permissions granted successfully")
        except Exception as e:
            print(f"[WARNING] Could not set some permissions: {e}")
            print(f"[INFO] You may need to run as superuser:")
            print(f"       psql -U postgres -d {dbname} -f fix_postgres_permissions.sql")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"[ERROR] Failed to create database: {e}")
        return False


def create_tables():
    """Create all tables using SQLAlchemy"""
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] All tables created successfully")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {e}")
        return False


def create_admin_user():
    """Create default admin user"""
    from app.db.database import SessionLocal

    db = SessionLocal()

    try:
        # Check if admin exists
        existing_admin = db.query(User).filter(User.username == "admin").first()

        if existing_admin:
            print("[INFO] Admin user already exists")
            return True

        # Create admin user
        admin = User(
            username="admin",
            email="admin@sngpl.com",
            hashed_password=hash_password("admin123"),
            role="admin",
            is_active=True,
            created_at=datetime.now()
        )

        db.add(admin)
        db.commit()

        print("[OK] Admin user created")
        print("     Username: admin")
        print("     Password: admin123")
        print("     [IMPORTANT] Change this password after first login!")

        return True

    except Exception as e:
        print(f"[ERROR] Failed to create admin user: {e}")
        db.rollback()
        return False

    finally:
        db.close()


def create_default_thresholds():
    """Create default alarm thresholds"""
    from app.db.database import SessionLocal

    db = SessionLocal()

    try:
        # Check if thresholds exist
        existing = db.query(AlarmThreshold).first()

        if existing:
            print("[INFO] Alarm thresholds already exist")
            return True

        # Default thresholds
        thresholds = [
            AlarmThreshold(
                device_id=None,  # Global threshold
                parameter="temperature",
                low_threshold=32.0,  # Freezing point
                high_threshold=120.0,  # High temperature
                is_active=True
            ),
            AlarmThreshold(
                device_id=None,
                parameter="static_pressure",
                low_threshold=20.0,
                high_threshold=100.0,
                is_active=True
            ),
            AlarmThreshold(
                device_id=None,
                parameter="differential_pressure",
                low_threshold=0.0,
                high_threshold=300.0,
                is_active=True
            ),
        ]

        for threshold in thresholds:
            db.add(threshold)

        db.commit()
        print("[OK] Default alarm thresholds created")

        return True

    except Exception as e:
        print(f"[ERROR] Failed to create thresholds: {e}")
        db.rollback()
        return False

    finally:
        db.close()


def main():
    """Main initialization function"""
    print("\n" + "="*60)
    print("  SNGPL IoT Platform - Database Initialization")
    print("  PostgreSQL + TimescaleDB")
    print("="*60 + "\n")

    success = True

    # Step 1: Create database
    print("[1/5] Creating database...")
    if not create_database():
        success = False
        print("\n[ERROR] Database creation failed")
        print("        Make sure PostgreSQL is running and credentials are correct")
        print(f"        Check DATABASE_URL in .env file")
        sys.exit(1)

    # Step 2: Create tables
    print("\n[2/5] Creating tables...")
    if not create_tables():
        success = False
        sys.exit(1)

    # Step 3: Initialize TimescaleDB
    print("\n[3/5] Initializing TimescaleDB...")
    try:
        init_timescale()
        print("[OK] TimescaleDB initialized")
        print("     - Extension enabled")
        print("     - Hypertables created")
    except Exception as e:
        print(f"[ERROR] TimescaleDB initialization failed: {e}")
        print("        Make sure TimescaleDB extension is installed")
        success = False

    # Step 4: Create admin user
    print("\n[4/5] Creating admin user...")
    if not create_admin_user():
        success = False

    # Step 5: Create default thresholds
    print("\n[5/5] Creating default alarm thresholds...")
    if not create_default_thresholds():
        success = False

    # Summary
    print("\n" + "="*60)
    if success:
        print("  [SUCCESS] Database initialized successfully!")
        print("="*60)
        print("\n  Next steps:")
        print("  1. Start the backend: python main.py")
        print("  2. Start the MQTT listener: python mqtt_listener.py")
        print("  3. Start the frontend: cd ../frontend && npm run dev")
        print("\n  Login credentials:")
        print("     Username: admin")
        print("     Password: admin123")
        print("\n  [IMPORTANT] Change the admin password after first login!")
    else:
        print("  [WARNING] Database initialization completed with errors")
        print("="*60)
        print("\n  Please fix the errors above and try again")

    print("\n" + "="*60 + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
