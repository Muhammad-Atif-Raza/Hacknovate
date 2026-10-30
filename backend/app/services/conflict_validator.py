from sqlalchemy.orm import Session
from app.db.models import Booking, Room

def is_time_overlapping(start1: str, end1: str, start2: str, end2: str) -> bool:
    """
    Checks if [start1, end1) overlaps with [start2, end2).
    Format expected: "HH:MM"
    """
    return max(start1, start2) < min(end1, end2)

def check_room_availability(
    db: Session,
    room_id: int,
    booking_date: str,
    start_time: str,
    end_time: str,
    exclude_booking_id: str = None
) -> tuple[bool, str]:
    """
    Returns (is_available, conflict_message).
    Checks room status (active, not under maintenance) and overlapping confirmed/checked-in bookings.
    """
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        return False, "Room not found or deactivated."
    
    if room.status in ["UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"]:
        return False, f"Room {room.room_number} is currently locked for maintenance."

    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.booking_date == booking_date,
        Booking.status.in_(["APPROVED", "CHECKED_IN"])
    )

    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)

    confirmed_bookings = query.all()
    for b in confirmed_bookings:
        if is_time_overlapping(start_time, end_time, b.start_time, b.end_time):
            return False, f"Conflict: Room is already booked from {b.start_time} to {b.end_time} by reservation #{b.id}."

    return True, ""
