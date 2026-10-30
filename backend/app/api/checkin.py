from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Booking, User
from app.schemas.booking import QRVerifyRequest
from app.api.deps import get_current_user
from app.services.qr_service import generate_qr_for_booking, verify_qr_checkin
from app.core.config import settings

router = APIRouter(prefix="", tags=["QR & Check-in"])

@router.get("/bookings/{booking_id}/qr")
def get_booking_qr(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this booking QR.")

    if booking.status not in ["APPROVED", "CHECKED_IN"]:
        raise HTTPException(
            status_code=400,
            detail=f"QR Code is only available for approved bookings (Current status: {booking.status})."
        )

    # Ensure token exists
    if not booking.qr_token:
        qr_token, _ = generate_qr_for_booking(booking.id, settings.SECRET_KEY)
        booking.qr_token = qr_token
        db.commit()

    _, qr_image_base64 = generate_qr_for_booking(booking.id, settings.SECRET_KEY)
    
    return {
        "booking_id": booking.id,
        "room_number": booking.room.room_number if booking.room else "",
        "room_name": booking.room.name if booking.room else "",
        "booking_date": booking.booking_date,
        "time_slot": f"{booking.start_time} - {booking.end_time}",
        "status": booking.status,
        "qr_token": booking.qr_token,
        "qr_image": qr_image_base64,
        "checkin_deadline": booking.checkin_deadline.isoformat() if booking.checkin_deadline else None
    }


@router.post("/checkins/verify")
def checkin_verify(
    verify_req: QRVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    success, message, payload = verify_qr_checkin(db, verify_req.qr_token, client_ip)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {
        "success": True,
        "message": message,
        **payload
    }
