import json
import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import Booking, Room, User, Notification
from app.schemas.booking import BookingCreate, BookingOut, BookingRejectRequest
from app.api.deps import get_current_user, get_current_admin
from app.services.conflict_validator import check_room_availability
from app.services.qr_service import generate_qr_for_booking
from app.core.config import settings

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def _generate_booking_id(db: Session) -> str:
    for _ in range(10):
        candidate = f"CPH-BK-{random.randint(10000, 99999)}"
        if not db.query(Booking).filter(Booking.id == candidate).first():
            return candidate
    return f"CPH-BK-{int(datetime.datetime.utcnow().timestamp())}"

@router.post("", response_model=BookingOut)
def create_booking_application(
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == booking_in.room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Selected room not found or inactive.")

    if room.status in ["UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"]:
        raise HTTPException(status_code=400, detail=f"Room {room.room_number} is currently locked for maintenance.")

    if booking_in.number_of_people > room.capacity:
        raise HTTPException(status_code=400, detail=f"Requested party size exceeds room capacity ({room.capacity}).")

    # Basic time check
    if booking_in.start_time >= booking_in.end_time:
        raise HTTPException(status_code=400, detail="Start time must precede end time.")

    booking_id = _generate_booking_id(db)
    
    new_booking = Booking(
        id=booking_id,
        user_id=current_user.id,
        room_id=room.id,
        booking_date=booking_in.booking_date,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        number_of_people=booking_in.number_of_people,
        purpose=booking_in.purpose.strip(),
        why_needed=booking_in.why_needed.strip(),
        accompanying_students=json.dumps([s.model_dump() for s in booking_in.accompanying_students]),
        required_equipment=json.dumps(booking_in.required_equipment),
        status="PENDING",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )

    db.add(new_booking)

    # Notify admins about new request
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        admin_notif = Notification(
            user_id=admin.id,
            title="New Room Reservation Application",
            message=f"{current_user.full_name} submitted reservation #{booking_id} for {room.room_number} on {booking_in.booking_date}.",
            type="SYSTEM",
            link="/admin/pending"
        )
        db.add(admin_notif)

    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/my", response_model=List[BookingOut])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    return bookings


@router.get("/pending", response_model=List[BookingOut])
def get_pending_bookings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(
        Booking.status == "PENDING"
    ).order_by(Booking.created_at.asc()).all()
    return bookings


@router.get("/all", response_model=List[BookingOut])
def get_all_bookings(
    status_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    return query.order_by(Booking.created_at.desc()).all()


@router.post("/{booking_id}/approve", response_model=BookingOut)
def approve_booking(
    booking_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Lock for update to prevent concurrent double-approvals
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Booking is already in '{booking.status}' status.")

    # Validate room availability and conflict
    is_avail, conflict_msg = check_room_availability(
        db,
        room_id=booking.room_id,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        exclude_booking_id=booking.id
    )
    if not is_avail:
        raise HTTPException(status_code=409, detail=f"Cannot approve: {conflict_msg}")

    # Generate QR Code token
    qr_token, _ = generate_qr_for_booking(booking.id, settings.SECRET_KEY)
    booking.qr_token = qr_token
    booking.status = "APPROVED"

    # Set checkin deadline: 15 minutes after scheduled start time on booking_date
    try:
        start_parts = [int(p) for p in booking.start_time.split(":")]
        date_parts = [int(p) for p in booking.booking_date.split("-")]
        start_dt = datetime.datetime(date_parts[0], date_parts[1], date_parts[2], start_parts[0], start_parts[1])
        # Check-in deadline is start_time + 15 mins
        deadline = start_dt + datetime.timedelta(minutes=settings.CHECKIN_WINDOW_MINUTES)
        # If the booking is in the past or immediately starting, set a fair buffer
        now = datetime.datetime.utcnow()
        if deadline < now:
            deadline = now + datetime.timedelta(minutes=settings.CHECKIN_WINDOW_MINUTES)
        booking.checkin_deadline = deadline
    except Exception:
        booking.checkin_deadline = datetime.datetime.utcnow() + datetime.timedelta(hours=2)

    # Notify student
    notif = Notification(
        user_id=booking.user_id,
        title="Booking Approved! QR Check-in Ready",
        message=f"Your reservation #{booking.id} for {booking.room.room_number} on {booking.booking_date} ({booking.start_time}-{booking.end_time}) was APPROVED. Remember to scan QR within 15 minutes of start.",
        type="APPROVAL",
        link=f"/student/dashboard"
    )
    db.add(notif)

    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: str,
    reject_in: BookingRejectRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Booking is already in '{booking.status}' status.")

    booking.status = "REJECTED"
    booking.rejection_reason = reject_in.rejection_reason.strip()

    # Notify student
    notif = Notification(
        user_id=booking.user_id,
        title="Reservation Application Declined",
        message=f"Your request #{booking.id} for {booking.room.room_number} was rejected. Reason: {booking.rejection_reason}",
        type="REJECTION",
        link="/student/dashboard"
    )
    db.add(notif)

    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}")
def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to cancel this booking.")

    booking.status = "CANCELLED"
    db.commit()
    return {"message": f"Reservation #{booking.id} has been cancelled."}
