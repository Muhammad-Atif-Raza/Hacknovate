import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import MaintenanceRecord, Room, User, OccupancyLog
from app.schemas.booking import MaintenanceLockRequest
from app.api.deps import get_current_admin
from app.services.reassignment_service import lock_room_for_maintenance

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("")
def get_maintenance_records(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.created_at.desc()).all()
    out = []
    for r in records:
        out.append({
            "id": r.id,
            "room_id": r.room_id,
            "room_number": r.room.room_number if r.room else "Unknown",
            "room_name": r.room.name if r.room else "",
            "building": r.room.building if r.room else "",
            "title": r.title,
            "reason": r.reason,
            "status": r.status,
            "affected_bookings_count": r.affected_bookings_count,
            "reassigned_details": r.reassigned_details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None
        })
    return out


@router.post("")
def set_room_maintenance(
    maint_req: MaintenanceLockRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    try:
        result = lock_room_for_maintenance(
            db=db,
            room_id=maint_req.room_id,
            title=maint_req.title,
            reason=maint_req.reason,
            new_status=maint_req.new_status,
            admin_user_id=current_admin.id
        )
        return {
            "success": True,
            "message": f"Room locked for maintenance. {result['reassigned_count']} reservations reassigned.",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{record_id}/resolve")
def resolve_maintenance(
    record_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found.")

    record.status = "RESOLVED"
    record.resolved_at = datetime.datetime.utcnow()

    # Restore room status if still under maintenance
    if record.room:
        record.room.status = "AVAILABLE"
        occ = OccupancyLog(
            room_id=record.room.id,
            event_type="MAINTENANCE_LOCK",
            details=f"Maintenance resolved ({record.title}). Room restored to AVAILABLE."
        )
        db.add(occ)

    db.commit()
    return {"message": "Maintenance marked as resolved. Room restored to AVAILABLE."}
