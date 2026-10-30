import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import StandbyQueue, Booking, Room, User, Notification
from app.schemas.booking import StandbyCreate, StandbyOut, BookingOut
from app.api.deps import get_current_user
from app.services.qr_service import generate_qr_for_booking
from app.core.config import settings

router = APIRouter(prefix="/standby", tags=["Dynamic Standby Queue"])

@router.post("", response_model=StandbyOut)
def join_standby_queue(
    standby_in: StandbyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == standby_in.room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Check if user already waiting for this room/slot
    existing = db.query(StandbyQueue).filter(
        StandbyQueue.user_id == current_user.id,
        StandbyQueue.room_id == standby_in.room_id,
        StandbyQueue.booking_date == standby_in.booking_date,
        StandbyQueue.start_time == standby_in.start_time,
        StandbyQueue.status.in_(["WAITING", "OFFERED"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already in the standby waitlist for this room and slot.")

    new_standby = StandbyQueue(
        room_id=standby_in.room_id,
        booking_date=standby_in.booking_date,
        start_time=standby_in.start_time,
        end_time=standby_in.end_time,
        user_id=current_user.id,
        status="WAITING",
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_standby)
    db.commit()
    db.refresh(new_standby)
    return new_standby


@router.get("/my", response_model=List[StandbyOut])
def get_my_standby_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entries = db.query(StandbyQueue).filter(
        StandbyQueue.user_id == current_user.id
    ).order_by(StandbyQueue.created_at.desc()).all()
    return entries


@router.post("/{standby_id}/claim", response_model=BookingOut)
def claim_standby_slot(
    standby_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    standby = db.query(StandbyQueue).filter(
        StandbyQueue.id == standby_id,
        StandbyQueue.user_id == current_user.id
    ).first()
    if not standby:
        raise HTTPException(status_code=404, detail="Standby entry not found.")

    if standby.status != "OFFERED":
        raise HTTPException(status_code=400, detail=f"Cannot claim: Entry status is '{standby.status}', not 'OFFERED'.")

    now = datetime.datetime.utcnow()
    if standby.claim_deadline and now > standby.claim_deadline:
        standby.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="The 3-minute claim deadline has expired.")

    # Convert to confirmed booking
    booking_id = f"CPH-BK-{random.randint(10000, 99999)}"
    qr_token, _ = generate_qr_for_booking(booking_id, settings.SECRET_KEY)
    
    # Calculate checkin deadline (15 min window)
    checkin_dl = now + datetime.timedelta(minutes=settings.CHECKIN_WINDOW_MINUTES)

    new_booking = Booking(
        id=booking_id,
        user_id=current_user.id,
        room_id=standby.room_id,
        booking_date=standby.booking_date,
        start_time=standby.start_time,
        end_time=standby.end_time,
        number_of_people=standby.room.capacity,
        purpose="Standby Queue Fast-Track Allocation",
        why_needed="Claimed via automated dynamic standby waitlist.",
        status="APPROVED",
        qr_token=qr_token,
        checkin_deadline=checkin_dl,
        created_at=now,
        updated_at=now
    )
    db.add(new_booking)

    # Mark standby entry as claimed
    standby.status = "CLAIMED"

    # Notification
    notif = Notification(
        user_id=current_user.id,
        title="Standby Slot Claimed Successfully!",
        message=f"You successfully claimed Room {standby.room.room_number}. Reservation #{booking_id} is APPROVED. QR check-in ready.",
        type="APPROVAL",
        link="/student/dashboard"
    )
    db.add(notif)

    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.delete("/{standby_id}")
def leave_standby_queue(
    standby_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    standby = db.query(StandbyQueue).filter(
        StandbyQueue.id == standby_id,
        StandbyQueue.user_id == current_user.id
    ).first()
    if not standby:
        raise HTTPException(status_code=404, detail="Standby entry not found.")

    standby.status = "EXPIRED"
    db.commit()
    return {"message": "Left standby queue."}
