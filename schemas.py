import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict, model_validator
from models import UserRole, AcousticProfile, ReservationStatus


# ==========================================
# User Schemas
# ==========================================
class UserBase(BaseModel):
    email: str = Field(..., max_length=255)
    name: str = Field(..., min_length=1, max_length=100)
    photo_url: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    id: str = Field(..., min_length=1, max_length=64)


class UserResponse(UserBase):
    id: str
    total_bookings: int = 0
    urgent_requests_used: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Space (Room) Schemas
# ==========================================
class SpaceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    capacity: int = Field(..., gt=0, le=100, description="Capacity must be between 1 and 100")
    acoustic_profile: AcousticProfile


class SpaceCreate(SpaceBase):
    pass


class SpaceResponse(SpaceBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Accompanying Student Schema
# ==========================================
class AccompanyingStudent(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="Full Name")
    full_name: Optional[str] = Field(None, max_length=100, description="Full Name")
    email: str = Field(..., min_length=3, max_length=255, description="College / Personal Email")
    enrollment_number: str = Field(..., min_length=2, max_length=50, description="Enrollment / Roll Number")
    phone_number: str = Field(..., min_length=10, max_length=15, description="10-digit Phone Number")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def resolve_names(self) -> "AccompanyingStudent":
        resolved = (self.name or self.full_name or "").strip()
        if not resolved:
            raise ValueError("Full Name is required for all accompanying students.")
        self.name = resolved
        self.full_name = resolved
        return self


# ==========================================
# Reservation Schemas
# ==========================================
class ReservationCreate(BaseModel):
    space_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    accompanying_count: int = Field(default=0, ge=0, le=99)
    accompanying_students: List[AccompanyingStudent] = Field(default_factory=list)
    purpose: str = Field(..., min_length=3, max_length=500)
    is_urgent: bool = False

    @model_validator(mode="after")
    def validate_time_window(self) -> "ReservationCreate":
        # Check start_time not in the past (allow 2-minute buffer for clock drift)
        now_utc = datetime.utcnow()
        st = self.start_time
        if st.tzinfo is not None:
            st = st.astimezone(timezone.utc).replace(tzinfo=None)
        et = self.end_time
        if et.tzinfo is not None:
            et = et.astimezone(timezone.utc).replace(tzinfo=None)

        if st < now_utc - timedelta(minutes=2):
            raise ValueError("Start time cannot be in the past. Please select a future date and time.")

        if et <= st:
            raise ValueError("End time must be after start time.")

        # Cap maximum capacity at 100 people
        total_party = 1 + (len(self.accompanying_students) if self.accompanying_students else self.accompanying_count)
        if total_party > 100:
            raise ValueError("Number of people cannot exceed the maximum limit of 100.")

        # Ensure accompanying_count is kept in sync if students list provided
        if self.accompanying_students and len(self.accompanying_students) > 0:
            self.accompanying_count = len(self.accompanying_students)

        return self


class ReservationResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    space_id: uuid.UUID
    purpose: str
    accompanying_count: int
    accompanying_students: List[AccompanyingStudent] = Field(default_factory=list)
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
    is_urgent: bool = False
    created_at: datetime
    space: Optional[SpaceResponse] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Standby Waitlist Schemas
# ==========================================
class StandbyJoinRequest(BaseModel):
    space_id: uuid.UUID
    requested_start: datetime
    requested_end: datetime

    @model_validator(mode="after")
    def validate_standby_window(self) -> "StandbyJoinRequest":
        now_utc = datetime.utcnow()
        st = self.requested_start
        if st.tzinfo is not None:
            st = st.astimezone(timezone.utc).replace(tzinfo=None)
        et = self.requested_end
        if et.tzinfo is not None:
            et = et.astimezone(timezone.utc).replace(tzinfo=None)

        if st < now_utc - timedelta(minutes=2):
            raise ValueError("Requested start time cannot be in the past.")

        if et <= st:
            raise ValueError("requested_end must be strictly after requested_start")

        return self


class StandbyResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    space_id: uuid.UUID
    requested_start: datetime
    requested_end: datetime
    flash_claim_expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    space: Optional[SpaceResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Auth Schemas
# ==========================================
class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    dev_bypass_email: Optional[str] = None
    dev_role: UserRole = UserRole.STUDENT
    name: Optional[str] = None
    photo_url: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user: UserResponse


# ==========================================
# ML Engine & Search Schemas
# ==========================================
class MLSuggestedSlotResponse(BaseModel):
    suggested_start: datetime
    suggested_end: datetime
    congestion_score: float
    success_probability: float
    available_spaces: List[SpaceResponse]
    reason: str


class RoomSearchResponse(BaseModel):
    available_rooms: List[SpaceResponse]
    ml_suggested_slots: List[MLSuggestedSlotResponse] = []


# ==========================================
# Dashboard & History Schemas
# ==========================================
class UserDashboardResponse(BaseModel):
    user: UserResponse
    active_bookings: List[ReservationResponse]
    history_by_status: Dict[str, List[ReservationResponse]]
    standby_waitlists: List[StandbyResponse]


class AdminDecisionRequest(BaseModel):
    action: Literal["approve", "deny", "cancel"]


class AdminHistoryItemResponse(BaseModel):
    reservation_id: uuid.UUID
    student_id: str
    student_name: str
    student_email: str
    student_photo_url: Optional[str] = None
    room_id: uuid.UUID
    room_name: str
    capacity: int
    acoustic_profile: AcousticProfile
    purpose: str
    accompanying_count: int
    accompanying_students: List[AccompanyingStudent] = Field(default_factory=list)
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
    is_urgent: bool = False
    created_at: datetime


class AdminProfileResponse(BaseModel):
    id: str
    photo_url: Optional[str] = None
    name: str
    email: str
    role: UserRole
    personal_bookings: int
    total_requests_processed: int


class QRScanResponse(BaseModel):
    message: str
    reservation: ReservationResponse
