"""Region-based access scoping.

A user can be limited to one or more free-text *regions* (see UserRegion). When limited, every
device-facing query must be filtered so the user only sees devices whose `region` matches one of
their assigned regions. Matching is trimmed + case-insensitive to tolerate free-text entry.

A user is UNRESTRICTED (sees everything) when:
  - their role is "admin", OR
  - they have no UserRegion rows (back-compat for existing accounts).
"""

from typing import Optional, Set

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Device, UserRegion


def _norm(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def allowed_regions(user, db: Session) -> Optional[Set[str]]:
    """Return the set of normalized regions the user may see, or None if unrestricted."""
    if user is None:
        return None
    if getattr(user, "role", None) == "admin":
        return None
    rows = db.query(UserRegion.region).filter(UserRegion.user_id == user.id).all()
    regions = {_norm(r[0]) for r in rows if _norm(r[0])}
    if not regions:
        return None  # no assignment => unrestricted
    return regions


def scope_device_query(query, user, db: Session):
    """Apply a region filter to a SQLAlchemy query that selects from Device (or joins it)."""
    regions = allowed_regions(user, db)
    if regions is None:
        return query
    return query.filter(func.lower(func.trim(Device.region)).in_(regions))


def device_in_scope(device: Device, user, db: Session) -> bool:
    """Whether a single device is visible to the user."""
    regions = allowed_regions(user, db)
    if regions is None:
        return True
    return _norm(getattr(device, "region", None)) in regions
