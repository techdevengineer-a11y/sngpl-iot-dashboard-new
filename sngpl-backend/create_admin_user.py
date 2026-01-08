"""
Create or reset admin user in PostgreSQL database
Run this to ensure admin user exists with correct password
"""

import sys
import os
from datetime import datetime
import bcrypt

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import User


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    # Truncate to 72 bytes max (bcrypt limitation)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    # Generate hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_or_reset_admin():
    """Create or reset admin user"""
    db = SessionLocal()

    try:
        print("\n" + "="*60)
        print("  Create/Reset Admin User")
        print("="*60 + "\n")

        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()

        password = "admin123"

        # Hash password using bcrypt
        hashed = hash_password(password)

        if admin:
            print("[INFO] Admin user already exists")
            print("[INFO] Resetting password...")

            admin.hashed_password = hashed
            admin.is_active = True
            admin.email = "admin@sngpl.com"
            admin.role = "admin"

            db.commit()
            print("[OK] Admin password reset successfully")
        else:
            print("[INFO] Creating new admin user...")

            admin = User(
                username="admin",
                email="admin@sngpl.com",
                hashed_password=hashed,
                role="admin",
                is_active=True,
                created_at=datetime.now()
            )

            db.add(admin)
            db.commit()
            print("[OK] Admin user created successfully")

        print("\n" + "="*60)
        print("  Login Credentials:")
        print("="*60)
        print(f"  Username: admin")
        print(f"  Password: admin123")
        print("="*60)
        print("\n[IMPORTANT] Change this password after first login!")
        print()

        return True

    except Exception as e:
        print(f"\n[ERROR] Failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

    finally:
        db.close()


if __name__ == "__main__":
    success = create_or_reset_admin()
    sys.exit(0 if success else 1)
