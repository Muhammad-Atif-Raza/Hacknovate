from pydantic import BaseModel
from typing import Optional, List, Any
import datetime
from app.schemas.user import UserOut
from app.schemas.room import RoomOut

class AccompanyingStudent(BaseModel):
    name: str
    enrollment: Optional[str] = None

class BookingCreate(BaseModel):
    room_id: int
    booking_date: str
    start_time: str
    end_time: str
    number_of_people: int
    purpose: str
    why_needed: str
    accompanying_students: List[AccompanyingStudent] = []
    required_equipment: List[str] = []

class BookingRejectRequest(BaseModel):
    rejection_reason: str

class BookingOut(BaseModel):
    id: str
    user_id: int
    room_id: int
    booking_date: str
    start_time: str
    end_time: str
    number_of_people: int
    purpose: str
    why_needed: str
    accompanying_students: Optional[str] = None
    required_equipment: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    qr_token: Optional[str] = None
    checkin_deadline: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    user: Optional[UserOut] = None
    room: Optional[RoomOut] = None

    class Config:
        from_attributes = True

class StandbyCreate(BaseModel):
    room_id: int
    booking_date: str
    start_time: str
    end_time: str

class StandbyOut(BaseModel):
    id: int
    room_id: int
    booking_date: str
    start_time: str
    end_time: str
    user_id: int
    status: str
    offered_at: Optional[datetime.datetime] = None
    claim_deadline: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    room: Optional[RoomOut] = None

    class Config:
        from_attributes = True

class MaintenanceLockRequest(BaseModel):
    room_id: int
    title: str
    reason: str
    new_status: str = "UNDER_MAINTENANCE"

class QRVerifyRequest(BaseModel):
    qr_token: str

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True
