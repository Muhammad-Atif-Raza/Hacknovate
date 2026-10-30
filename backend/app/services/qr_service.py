import io
import base64
import uuid
import datetime
import qrcode
from sqlalchemy.orm import Session
from app.db.models import Booking, QRCheckin, OccupancyLog, Room

def generate_qr_for_booking(booking_id: str, secret_key: str) -> tuple[str, str]:
    """
    Returns (qr_token, qr_base64_image).
    """
    qr_token = f"CPH-SEC-{uuid.uuid4().hex[:12].upper()}-{booking_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(qr_token)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1E3A8A", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return qr_token, f"data:image/png;base64,{img_str}"


def verify_qr_checkin(
    db: Session,
    qr_token: str,
    client_ip: str = "127.0.0.1"
) -> tuple[bool, str, dict]:
    """
    Validates QR checkin against the database.
    Backend validates checkin time (within 15 minutes of booking start time or active window).
    """
    booking = db.query(Booking).filter(Booking.qr_token == qr_token).first()
    if not booking:
        return False, "Invalid or unrecognized QR Code token.", {}

    if booking.status == "CHECKED_IN":
        return True, "Already checked in! Your reservation is active.", {
            "booking_id": booking.id,
            "room_id": booking.room_id,
            "room_name": booking.room.name if booking.room else "",
            "status": "CHECKED_IN"
        }

    if booking.status == "EXPIRED":
        return False, "This booking has expired due to 15-minute no-show policy.", {}

    if booking.status != "APPROVED":
        return False, f"Cannot check in: Booking status is {booking.status}.", {}

    # Check checkin deadline
    now = datetime.datetime.utcnow()
    if booking.checkin_deadline and now > booking.checkin_deadline:
        booking.status = "EXPIRED"
        db.commit()
        return False, "Check-in window has elapsed. Room has been released.", {}

    # Mark as checked in
    booking.status = "CHECKED_IN"
    
    checkin_rec = QRCheckin(
        booking_id=booking.id,
        scanned_at=now,
        client_ip=client_ip,
        status="SUCCESS"
    )
    db.add(checkin_rec)

    # Log occupancy
    occ = OccupancyLog(
        room_id=booking.room_id,
        booking_id=booking.id,
        event_type="CHECK_IN",
        details=f"Student {booking.user.full_name} checked in successfully via QR code."
    )
    db.add(occ)
    
    db.commit()
    db.refresh(booking)

    return True, "Check-in verified successfully! Room access granted.", {
        "booking_id": booking.id,
        "room_id": booking.room_id,
        "room_name": booking.room.name if booking.room else "",
        "room_number": booking.room.room_number if booking.room else "",
        "checkin_time": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "status": "CHECKED_IN"
    }
