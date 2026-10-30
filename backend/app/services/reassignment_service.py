import json
import datetime
from sqlalchemy.orm import Session
from app.db.models import Room, Booking, MaintenanceRecord, Notification, OccupancyLog
from app.services.recommendation_engine import calculate_suitability_score
from app.services.conflict_validator import check_room_availability

def lock_room_for_maintenance(
    db: Session,
    room_id: int,
    title: str,
    reason: str,
    new_status: str = "UNDER_MAINTENANCE",
    admin_user_id: int = None
) -> dict:
    """
    Locks a room for maintenance, auto-detects affected reservations,
    and intelligently reassigns them to suitable alternative rooms.
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise ValueError("Room not found.")

    room.status = new_status
    
    # Find affected bookings
    today_str = datetime.date.today().isoformat()
    affected_bookings = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(["APPROVED", "PENDING"]),
        Booking.booking_date >= today_str
    ).all()

    all_other_rooms = db.query(Room).filter(
        Room.id != room_id,
        Room.is_active == True,
        ~Room.status.in_(["UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"])
    ).all()

    reassigned_count = 0
    reassignment_logs = []

    for b in affected_bookings:
        required_eq = json.loads(b.required_equipment) if b.required_equipment else []
        best_alt_room = None
        best_score = -1

        for alt in all_other_rooms:
            # Check availability for that slot
            is_avail, _ = check_room_availability(db, alt.id, b.booking_date, b.start_time, b.end_time)
            if is_avail and alt.capacity >= b.number_of_people:
                score, _ = calculate_suitability_score(alt, b.number_of_people, required_eq, None)
                if score > best_score:
                    best_score = score
                    best_alt_room = alt

        if best_alt_room:
            old_room_num = room.room_number
            b.room_id = best_alt_room.id
            reassigned_count += 1
            log_entry = {
                "booking_id": b.id,
                "student_name": b.user.full_name if b.user else "Student",
                "original_room": old_room_num,
                "reassigned_room": f"{best_alt_room.room_number} ({best_alt_room.name})",
                "date": b.booking_date,
                "time": f"{b.start_time} - {b.end_time}",
                "status": "REASSIGNED"
            }
            reassignment_logs.append(log_entry)

            # Create notification for student
            notif = Notification(
                user_id=b.user_id,
                title="Room Booking Reassigned due to Maintenance",
                message=(
                    f"Notice: Room {old_room_num} underwent scheduled maintenance. "
                    f"Your reservation #{b.id} on {b.booking_date} ({b.start_time}-{b.end_time}) "
                    f"has been automatically moved to {best_alt_room.room_number} - {best_alt_room.name}."
                ),
                type="MAINTENANCE_REASSIGNMENT",
                link="/student/dashboard"
            )
            db.add(notif)
        else:
            # No alternative room could be found
            b.status = "CANCELLED"
            b.rejection_reason = f"Room entered maintenance ({reason}) and no matching alternative venue was available."
            log_entry = {
                "booking_id": b.id,
                "student_name": b.user.full_name if b.user else "Student",
                "original_room": room.room_number,
                "reassigned_room": "None Available",
                "date": b.booking_date,
                "time": f"{b.start_time} - {b.end_time}",
                "status": "CANCELLED_NO_ALTERNATIVE"
            }
            reassignment_logs.append(log_entry)

            notif = Notification(
                user_id=b.user_id,
                title="Booking Cancelled: Venue Maintenance",
                message=(
                    f"Reservation #{b.id} for {room.room_number} on {b.booking_date} was cancelled "
                    f"due to facility maintenance. Please apply for another room or contact admin."
                ),
                type="MAINTENANCE_REASSIGNMENT",
                link="/student/apply"
            )
            db.add(notif)

    # Record maintenance history
    maint_record = MaintenanceRecord(
        room_id=room.id,
        title=title,
        reason=reason,
        status="ACTIVE",
        affected_bookings_count=len(affected_bookings),
        reassigned_details=json.dumps(reassignment_logs),
        created_by_user_id=admin_user_id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(maint_record)

    # Log occupancy / room status change
    occ = OccupancyLog(
        room_id=room.id,
        event_type="MAINTENANCE_LOCK",
        details=f"Room set to {new_status}: {title} - {reason}. Affected: {len(affected_bookings)}, Reassigned: {reassigned_count}."
    )
    db.add(occ)

    db.commit()
    db.refresh(maint_record)

    return {
        "room_id": room.id,
        "new_status": room.status,
        "affected_count": len(affected_bookings),
        "reassigned_count": reassigned_count,
        "details": reassignment_logs
    }
