import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.db.database import SessionLocal
from app.db.models import Booking, StandbyQueue, Notification, OccupancyLog, Room

scheduler = BackgroundScheduler()

def check_booking_expirations_and_standby():
    """
    Background worker running every 60 seconds:
    1. Expires approved bookings if student didn't check in within 15 minutes of start.
    2. Advances standby queue offers if 3-minute claim window has expired.
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        today_str = datetime.date.today().isoformat()
        current_time_str = now.strftime("%H:%M")

        # 1. Expire un-checked-in approved bookings whose deadline has passed
        expired_bookings = db.query(Booking).filter(
            Booking.status == "APPROVED",
            Booking.checkin_deadline != None,
            Booking.checkin_deadline < now
        ).all()

        for b in expired_bookings:
            b.status = "EXPIRED"
            b.rejection_reason = "Booking auto-released: 15-minute check-in grace period expired without QR scan."
            
            # Add notification
            notif = Notification(
                user_id=b.user_id,
                title="Booking Auto-Released (No-Show)",
                message=f"Your reservation #{b.id} for {b.room.room_number if b.room else 'room'} was automatically released due to no-show.",
                type="CHECKIN_REMINDER",
                link="/student/dashboard"
            )
            db.add(notif)

            # Log occupancy
            occ = OccupancyLog(
                room_id=b.room_id,
                booking_id=b.id,
                event_type="AUTO_RELEASE",
                details=f"Reservation {b.id} auto-released. 15-minute check-in deadline expired."
            )
            db.add(occ)

            # Offer to standby queue if any waiting
            _offer_to_next_standby(db, b.room_id, b.booking_date, b.start_time, b.end_time)

        # 2. Check standby queue claim timeouts (3 minutes claim window)
        expired_standbys = db.query(StandbyQueue).filter(
            StandbyQueue.status == "OFFERED",
            StandbyQueue.claim_deadline != None,
            StandbyQueue.claim_deadline < now
        ).all()

        for sq in expired_standbys:
            sq.status = "EXPIRED"
            notif = Notification(
                user_id=sq.user_id,
                title="Standby Slot Claim Window Expired",
                message=f"The 3-minute claim window for Room {sq.room.room_number if sq.room else ''} on {sq.booking_date} has expired.",
                type="STANDBY_OFFER",
                link="/student/dashboard"
            )
            db.add(notif)
            # Offer to the next user in line
            _offer_to_next_standby(db, sq.room_id, sq.booking_date, sq.start_time, sq.end_time)

        db.commit()
    except Exception as e:
        print(f"[Scheduler Error] {e}")
        db.rollback()
    finally:
        db.close()

def _offer_to_next_standby(db, room_id: int, booking_date: str, start_time: str, end_time: str):
    """Offers available slot to the earliest waiting user in standby queue."""
    next_in_line = db.query(StandbyQueue).filter(
        StandbyQueue.room_id == room_id,
        StandbyQueue.booking_date == booking_date,
        StandbyQueue.start_time == start_time,
        StandbyQueue.end_time == end_time,
        StandbyQueue.status == "WAITING"
    ).order_by(StandbyQueue.created_at.asc()).first()

    if next_in_line:
        now = datetime.datetime.utcnow()
        next_in_line.status = "OFFERED"
        next_in_line.offered_at = now
        next_in_line.claim_deadline = now + datetime.timedelta(minutes=3)
        
        notif = Notification(
            user_id=next_in_line.user_id,
            title="Standby Slot Available! Claim within 3 Minutes",
            message=(
                f"A previously booked slot in Room {next_in_line.room.room_number if next_in_line.room else ''} "
                f"for {next_in_line.booking_date} ({next_in_line.start_time}-{next_in_line.end_time}) "
                f"is now offered to you! You have 3 minutes to claim it."
            ),
            type="STANDBY_OFFER",
            link="/student/dashboard"
        )
        db.add(notif)

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(check_booking_expirations_and_standby, "interval", seconds=30, id="booking_check_job")
        scheduler.start()
