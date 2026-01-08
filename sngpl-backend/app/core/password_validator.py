"""Password validation and security utilities"""

import re
import bcrypt
from typing import Tuple, List
from sqlalchemy.orm import Session


class PasswordValidator:
    """Validates password complexity and manages password history"""

    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    PASSWORD_HISTORY_COUNT = 5
    SPECIAL_CHARS = r'!@#$%^&*()_+-=[]{}|;:,.<>?'

    @classmethod
    def validate_password(cls, password: str, settings: dict = None) -> Tuple[bool, List[str]]:
        """
        Validate password against complexity requirements

        Args:
            password: The password to validate
            settings: Optional dictionary with custom settings (min_length, require_uppercase, etc.)

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Get settings or use defaults
        min_length = settings.get('min_length', cls.MIN_LENGTH) if settings else cls.MIN_LENGTH
        require_uppercase = settings.get('require_uppercase', cls.REQUIRE_UPPERCASE) if settings else cls.REQUIRE_UPPERCASE
        require_lowercase = settings.get('require_lowercase', cls.REQUIRE_LOWERCASE) if settings else cls.REQUIRE_LOWERCASE
        require_digit = settings.get('require_digit', cls.REQUIRE_DIGIT) if settings else cls.REQUIRE_DIGIT
        require_special = settings.get('require_special', cls.REQUIRE_SPECIAL) if settings else cls.REQUIRE_SPECIAL

        # Check minimum length
        if len(password) < min_length:
            errors.append(f"Password must be at least {min_length} characters long")

        # Check for uppercase letter
        if require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        # Check for lowercase letter
        if require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        # Check for digit
        if require_digit and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")

        # Check for special character
        if require_special and not re.search(rf'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            errors.append(f"Password must contain at least one special character ({cls.SPECIAL_CHARS})")

        # Check for common weak passwords
        weak_passwords = [
            'password', 'password123', 'password1', '12345678', 'qwerty',
            'abc123', 'monkey', 'letmein', 'welcome', 'admin123'
        ]
        if password.lower() in weak_passwords:
            errors.append("Password is too common. Please choose a more unique password")

        # Check for sequential characters
        if cls._has_sequential_chars(password):
            errors.append("Password should not contain sequential characters (e.g., 'abc', '123')")

        return (len(errors) == 0, errors)

    @classmethod
    def _has_sequential_chars(cls, password: str, length: int = 3) -> bool:
        """Check if password contains sequential characters"""
        password_lower = password.lower()
        for i in range(len(password_lower) - length + 1):
            substring = password_lower[i:i+length]
            # Check if it's sequential numbers
            if substring.isdigit():
                numbers = [int(c) for c in substring]
                if all(numbers[j] + 1 == numbers[j+1] for j in range(len(numbers)-1)):
                    return True
            # Check if it's sequential letters
            elif substring.isalpha():
                chars = [ord(c) for c in substring]
                if all(chars[j] + 1 == chars[j+1] for j in range(len(chars)-1)):
                    return True
        return False

    @classmethod
    def check_password_history(cls, db: Session, user_id: int, new_password: str) -> bool:
        """
        Check if password was used recently

        Args:
            db: Database session
            user_id: User ID
            new_password: New password to check

        Returns:
            True if password is NOT in history (safe to use), False if it was used recently
        """
        from app.models.models import PasswordHistory

        # Get password history count from settings
        history_count = cls.PASSWORD_HISTORY_COUNT

        # Get recent passwords
        recent_passwords = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_id
        ).order_by(PasswordHistory.created_at.desc()).limit(history_count).all()

        # Check if new password matches any recent password
        for old_password in recent_passwords:
            if bcrypt.checkpw(new_password.encode('utf-8'), old_password.password_hash.encode('utf-8')):
                return False  # Password was used recently

        return True  # Password is safe to use

    @classmethod
    def add_to_password_history(cls, db: Session, user_id: int, password_hash: str) -> None:
        """
        Add password hash to history

        Args:
            db: Database session
            user_id: User ID
            password_hash: Hashed password to store
        """
        from app.models.models import PasswordHistory
        from datetime import datetime

        # Add to history
        password_history = PasswordHistory(
            user_id=user_id,
            password_hash=password_hash,
            created_at=datetime.utcnow()
        )
        db.add(password_history)

        # Clean up old history entries (keep only last N)
        history_count = cls.PASSWORD_HISTORY_COUNT
        old_entries = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_id
        ).order_by(PasswordHistory.created_at.desc()).offset(history_count).all()

        for entry in old_entries:
            db.delete(entry)

        db.commit()

    @classmethod
    def get_password_strength(cls, password: str) -> dict:
        """
        Calculate password strength score

        Args:
            password: Password to evaluate

        Returns:
            Dictionary with 'score' (0-100) and 'strength' (Weak/Moderate/Strong/Very Strong)
        """
        score = 0

        # Length scoring
        if len(password) >= 8:
            score += 20
        if len(password) >= 12:
            score += 10
        if len(password) >= 16:
            score += 10

        # Character diversity scoring
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if re.search(rf'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            score += 15

        # Multiple character types
        char_types = sum([
            bool(re.search(r'[A-Z]', password)),
            bool(re.search(r'[a-z]', password)),
            bool(re.search(r'\d', password)),
            bool(re.search(rf'[{re.escape(cls.SPECIAL_CHARS)}]', password))
        ])
        if char_types >= 3:
            score += 10
        if char_types == 4:
            score += 5

        # Determine strength level
        if score >= 80:
            strength = "Very Strong"
        elif score >= 60:
            strength = "Strong"
        elif score >= 40:
            strength = "Moderate"
        else:
            strength = "Weak"

        return {
            "score": min(score, 100),
            "strength": strength
        }
