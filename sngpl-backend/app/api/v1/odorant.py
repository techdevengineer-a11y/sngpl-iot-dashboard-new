from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.db.database import get_db
from app.api.v1.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic Models
class OdorantDrumCreate(BaseModel):
    device_id: int
    section_id: int
    station_name: str
    initial_level: float
    odorant_consumption_rate: Optional[float] = 0.5

    class Config:
        str_strip_whitespace = True

class OdorantDrumRefill(BaseModel):
    drum_id: int
    refilled_amount: float
    notes: Optional[str] = None

class OdorantDrumResponse(BaseModel):
    id: int
    device_id: int
    section_id: int
    section_name: Optional[str]
    station_name: str
    refill_date: datetime
    initial_level: float
    current_level: float
    total_mmcf_consumed: float
    odorant_used: float
    odorant_consumption_rate: float
    percentage_remaining: float
    is_active: bool

class OdorantRefillHistoryResponse(BaseModel):
    id: int
    device_id: int
    station_name: str
    refill_date: datetime
    previous_level: Optional[float]
    refilled_amount: float
    new_level: float
    refilled_by_username: Optional[str]
    notes: Optional[str]

# Get all active odorant drums with real-time data
@router.get("/drums", response_model=List[OdorantDrumResponse])
async def get_odorant_drums(
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all active odorant drums with real-time consumption data"""
    try:
        section_filter = "AND od.section_id = :section_id" if section_id else ""

        query = text(f"""
            SELECT
                od.id,
                od.device_id,
                od.section_id,
                s.name as section_name,
                od.station_name,
                od.refill_date,
                od.initial_level,
                od.current_level,
                od.total_mmcf_consumed,
                (od.initial_level - od.current_level) as odorant_used,
                od.odorant_consumption_rate,
                ROUND((od.current_level / od.initial_level * 100)::numeric, 2) as percentage_remaining,
                od.is_active
            FROM odorant_drums od
            LEFT JOIN sections s ON od.section_id = s.id
            WHERE od.is_active = true
            {section_filter}
            ORDER BY od.current_level ASC, od.refill_date DESC
        """)

        params = {"section_id": section_id} if section_id else {}
        result = db.execute(query, params)

        drums = []
        for row in result:
            drums.append({
                "id": row.id,
                "device_id": row.device_id,
                "section_id": row.section_id,
                "section_name": row.section_name,
                "station_name": row.station_name,
                "refill_date": row.refill_date,
                "initial_level": float(row.initial_level),
                "current_level": float(row.current_level),
                "total_mmcf_consumed": float(row.total_mmcf_consumed),
                "odorant_used": float(row.odorant_used),
                "odorant_consumption_rate": float(row.odorant_consumption_rate),
                "percentage_remaining": float(row.percentage_remaining),
                "is_active": row.is_active
            })

        return drums
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching odorant drums: {str(e)}")

# Create new odorant drum entry
@router.post("/drums", status_code=status.HTTP_201_CREATED)
async def create_odorant_drum(
    drum: OdorantDrumCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new odorant drum entry (admin only)"""
    try:
        logger.info(f"Creating odorant drum: device_id={drum.device_id}, section_id={drum.section_id}, station={drum.station_name}, level={drum.initial_level}, rate={drum.odorant_consumption_rate}")
        # Deactivate any existing active drum for this device
        deactivate_query = text("""
            UPDATE odorant_drums
            SET is_active = false
            WHERE device_id = :device_id AND is_active = true
        """)
        db.execute(deactivate_query, {"device_id": drum.device_id})

        # Create new drum entry
        insert_query = text("""
            INSERT INTO odorant_drums
            (device_id, section_id, station_name, initial_level, current_level, odorant_consumption_rate)
            VALUES (:device_id, :section_id, :station_name, :initial_level, :initial_level, :consumption_rate)
            RETURNING id
        """)

        result = db.execute(insert_query, {
            "device_id": drum.device_id,
            "section_id": drum.section_id,
            "station_name": drum.station_name,
            "initial_level": drum.initial_level,
            "consumption_rate": drum.odorant_consumption_rate
        })

        drum_id = result.fetchone()[0]

        # Log the initial refill in history
        history_query = text("""
            INSERT INTO odorant_refill_history
            (drum_id, device_id, previous_level, refilled_amount, new_level, refilled_by, notes)
            VALUES (:drum_id, :device_id, 0, :refilled_amount, :new_level, :user_id, 'Initial setup')
        """)

        db.execute(history_query, {
            "drum_id": drum_id,
            "device_id": drum.device_id,
            "refilled_amount": drum.initial_level,
            "new_level": drum.initial_level,
            "user_id": current_user["user_id"]
        })

        db.commit()

        return {"message": "Odorant drum created successfully", "drum_id": drum_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating odorant drum: {str(e)}")

# Refill odorant drum
@router.post("/drums/refill", status_code=status.HTTP_200_OK)
async def refill_odorant_drum(
    refill: OdorantDrumRefill,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Refill an odorant drum"""
    try:
        # Get current drum level
        get_drum_query = text("SELECT current_level, initial_level FROM odorant_drums WHERE id = :drum_id")
        drum_result = db.execute(get_drum_query, {"drum_id": refill.drum_id}).fetchone()

        if not drum_result:
            raise HTTPException(status_code=404, detail="Odorant drum not found")

        previous_level = float(drum_result.current_level)
        max_capacity = float(drum_result.initial_level)
        new_level = min(previous_level + refill.refilled_amount, max_capacity)

        # Update drum level
        update_query = text("""
            UPDATE odorant_drums
            SET current_level = :new_level, updated_at = NOW()
            WHERE id = :drum_id
        """)
        db.execute(update_query, {"new_level": new_level, "drum_id": refill.drum_id})

        # Log refill in history
        history_query = text("""
            INSERT INTO odorant_refill_history
            (drum_id, device_id, previous_level, refilled_amount, new_level, refilled_by, notes)
            SELECT :drum_id, device_id, :previous_level, :refilled_amount, :new_level, :user_id, :notes
            FROM odorant_drums WHERE id = :drum_id
        """)

        db.execute(history_query, {
            "drum_id": refill.drum_id,
            "previous_level": previous_level,
            "refilled_amount": refill.refilled_amount,
            "new_level": new_level,
            "user_id": current_user["user_id"],
            "notes": refill.notes
        })

        db.commit()

        return {
            "message": "Odorant drum refilled successfully",
            "previous_level": previous_level,
            "refilled_amount": refill.refilled_amount,
            "new_level": new_level
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error refilling odorant drum: {str(e)}")

# Get refill history for a drum
@router.get("/drums/{drum_id}/history", response_model=List[OdorantRefillHistoryResponse])
async def get_refill_history(
    drum_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get refill history for a specific odorant drum"""
    try:
        query = text("""
            SELECT
                orh.id,
                orh.device_id,
                od.station_name,
                orh.refill_date,
                orh.previous_level,
                orh.refilled_amount,
                orh.new_level,
                u.username as refilled_by_username,
                orh.notes
            FROM odorant_refill_history orh
            LEFT JOIN odorant_drums od ON orh.drum_id = od.id
            LEFT JOIN users u ON orh.refilled_by = u.id
            WHERE orh.drum_id = :drum_id
            ORDER BY orh.refill_date DESC
            LIMIT 50
        """)

        result = db.execute(query, {"drum_id": drum_id})

        history = []
        for row in result:
            history.append({
                "id": row.id,
                "device_id": row.device_id,
                "station_name": row.station_name,
                "refill_date": row.refill_date,
                "previous_level": float(row.previous_level) if row.previous_level else None,
                "refilled_amount": float(row.refilled_amount),
                "new_level": float(row.new_level),
                "refilled_by_username": row.refilled_by_username,
                "notes": row.notes
            })

        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching refill history: {str(e)}")

# Update odorant consumption based on MMCF (called by background job or webhook)
@router.post("/drums/update-consumption")
async def update_odorant_consumption(
    db: Session = Depends(get_db)
):
    """Update odorant consumption for all active drums based on latest MMCF data"""
    try:
        # Get all active drums and calculate consumption
        update_query = text("""
            WITH latest_flow AS (
                SELECT
                    d.id as device_id,
                    COALESCE(SUM(df.cumulative_volume_flow), 0) as total_mmcf
                FROM devices d
                LEFT JOIN device_flow df ON d.id = df.device_id
                    AND df.timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY d.id
            )
            UPDATE odorant_drums od
            SET
                total_mmcf_consumed = lf.total_mmcf,
                current_level = GREATEST(
                    od.initial_level - (lf.total_mmcf * od.odorant_consumption_rate),
                    0
                ),
                updated_at = NOW()
            FROM latest_flow lf
            WHERE od.device_id = lf.device_id
                AND od.is_active = true
                AND od.current_level > 0
        """)

        db.execute(update_query)
        db.commit()

        return {"message": "Odorant consumption updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating odorant consumption: {str(e)}")
