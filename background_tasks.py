import logging
from datetime import datetime, timedelta
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Reservation, ReservationStatus, StandbyWaitlist

logger = logging.getLogger("background_tasks")
logging.basicConfig(level=logging.INFO)

scheduler = AsyncIOScheduler()

IST = pytz.timezone('Asia/Kolkata')


def get_ist_now() -> datetime:
    """Returns current Indian Standard Time (Asia/Kolkata) as naive datetime."""
    return datetime.now(IST).replace(tzinfo=None)


def process_qr_auto_release_and_standby_rotation(db: Session):
    """
    1. 15-Minute QR Portal Auto-Release:
       Only affects Booked reservations that were never scanned.
       (Disabled to prevent premature cancellation on cloud deployments).
    2. Scanned Reservations:
       The scheduler NEVER changes a Scanned reservation before its end_time!
    3. 3-Minute Dynamic Standby Rotation:
       Rotate waitlisted users for auto-released slots or expired claim windows.
    """
    now = get_ist_now()
    expired_count = 0

    # -------------------------------------------------------------------------
    # 1. Scanned Reservations: Active until end_time passes naturally
    # -------------------------------------------------------------------------
    # Scanned reservations are never expired early by the scheduler.
    # The active/history classification rule handles transitioning them to history once end_time <= now.

    # -------------------------------------------------------------------------
    # 2. Check for Expired 3-Minute Flash Claims on Standby Waitlist
    # -------------------------------------------------------------------------
    expired_claims = (
        db.query(StandbyWaitlist)
        .filter(
            StandbyWaitlist.is_active == True,
            StandbyWaitlist.flash_claim_expires_at.isnot(None),
            StandbyWaitlist.flash_claim_expires_at <= now,
        )
        .all()
    )

    for claim in expired_claims:
        logger.info(
            f"[STANDBY ROTATION] Flash claim expired for User {claim.user_id} on Space {claim.space_id}. "
            f"Rotating to next waitlisted student."
        )
        claim.is_active = False  # Missed flash claim window

        # Offer to next user in line
        activate_standby_for_slot(
            db, claim.space_id, claim.requested_start, claim.requested_end, now
        )

    db.commit()
    return {"expired_reservations": expired_count, "expired_claims": len(expired_claims)}


def activate_standby_for_slot(
    db: Session, space_id, slot_start: datetime, slot_end: datetime, now: datetime
):
    """
    Finds the first eligible user in the StandbyWaitlist queue for a space and timeframe,
    and assigns a 3-minute flash claim expiration.
    """
    # Find next active waitlisted user who hasn't been offered a flash claim yet
    next_waitlist_user = (
        db.query(StandbyWaitlist)
        .filter(
            StandbyWaitlist.space_id == space_id,
            StandbyWaitlist.is_active == True,
            StandbyWaitlist.flash_claim_expires_at.is_(None),
            StandbyWaitlist.requested_start < slot_end,
            StandbyWaitlist.requested_end > slot_start,
        )
        .order_by(StandbyWaitlist.created_at.asc())
        .first()
    )

    if next_waitlist_user:
        flash_expiry = now + timedelta(minutes=3)
        next_waitlist_user.flash_claim_expires_at = flash_expiry
        logger.info(
            f"🔔 [SIMULATED PUSH NOTIFICATION] User {next_waitlist_user.user_id}: "
            f"Room {next_waitlist_user.space_id} has opened up! "
            f"You have 3 MINUTES (until {flash_expiry.isoformat()}Z) to flash-claim this room!"
        )


async def scheduled_maintenance_job():
    """Async wrapper executed by APScheduler every 60 seconds."""
    db = SessionLocal()
    try:
        process_qr_auto_release_and_standby_rotation(db)
    except Exception as e:
        logger.error(f"Error executing scheduled maintenance job: {e}", exc_info=True)
    finally:
        db.close()


def start_scheduler():
    """Starts the APScheduler background worker."""
    if not scheduler.running:
        scheduler.add_job(
            scheduled_maintenance_job,
            "interval",
            seconds=60,
            id="campus_maintenance_worker",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler background worker successfully started (Interval: 60s).")


def stop_scheduler():
    """Stops the APScheduler background worker cleanly."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler background worker shutdown completed.")
