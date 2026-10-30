import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db.models import Room, Booking, User, MaintenanceRecord, OccupancyLog
from app.api.deps import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
def get_admin_dashboard_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    total_rooms = db.query(Room).filter(Room.is_active == True).count()
    available_rooms = db.query(Room).filter(Room.is_active == True, Room.status == "AVAILABLE").count()
    occupied_rooms = db.query(Room).filter(Room.is_active == True, Room.status == "OCCUPIED").count()
    maintenance_rooms = db.query(Room).filter(
        Room.is_active == True, 
        Room.status.in_(["UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"])
    ).count()

    # Bookings stats
    pending_bookings = db.query(Booking).filter(Booking.status == "PENDING").count()
    approved_bookings = db.query(Booking).filter(Booking.status == "APPROVED").count()
    checked_in_bookings = db.query(Booking).filter(Booking.status == "CHECKED_IN").count()
    rejected_bookings = db.query(Booking).filter(Booking.status == "REJECTED").count()
    total_bookings = db.query(Booking).count()

    # Utilization rate calculation
    active_in_use = occupied_rooms + checked_in_bookings
    utilization_rate = round((active_in_use / max(total_rooms, 1)) * 100, 1)

    # Bookings by acoustic profile
    acoustic_stats = db.query(
        Room.acoustic_profile,
        func.count(Booking.id)
    ).join(Booking, Booking.room_id == Room.id, isouter=True).group_by(Room.acoustic_profile).all()

    acoustic_breakdown = {
        row[0]: row[1] for row in acoustic_stats if row[0]
    }

    # Bookings by building
    building_stats = db.query(
        Room.building,
        func.count(Booking.id)
    ).join(Booking, Booking.room_id == Room.id, isouter=True).group_by(Room.building).all()

    building_breakdown = {
        row[0]: row[1] for row in building_stats if row[0]
    }

    # Recent activity logs
    recent_logs = db.query(OccupancyLog).order_by(OccupancyLog.timestamp.desc()).limit(10).all()
    logs_data = [{
        "id": log.id,
        "room_id": log.room_id,
        "room_number": log.room.room_number if log.room else "",
        "event_type": log.event_type,
        "details": log.details,
        "timestamp": log.timestamp.isoformat() if log.timestamp else ""
    } for log in recent_logs]

    # Quick admin counts
    total_students = db.query(User).filter(User.role == "student").count()

    return {
        "stats": {
            "total_rooms": total_rooms,
            "available_rooms": available_rooms,
            "occupied_rooms": occupied_rooms,
            "maintenance_rooms": maintenance_rooms,
            "pending_requests": pending_bookings,
            "approved_bookings": approved_bookings,
            "checked_in_bookings": checked_in_bookings,
            "rejected_bookings": rejected_bookings,
            "total_bookings": total_bookings,
            "total_students": total_students,
            "utilization_rate": utilization_rate
        },
        "acoustic_breakdown": acoustic_breakdown,
        "building_breakdown": building_breakdown,
        "recent_logs": logs_data
    }
