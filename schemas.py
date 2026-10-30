import uuid
from datetime import datetime
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

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Space (Room) Schemas
# ==========================================
class SpaceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    capacity: int = Field(..., gt=0, description="Capacity must be strictly greater than 0")
    acoustic_profile: AcousticProfile


class SpaceCreate(SpaceBase):
    pass


class SpaceResponse(SpaceBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Reservation Schemas
# ==========================================
class ReservationCreate(BaseModel):
    space_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    accompanying_count: int = Field(default=0, ge=0)
    purpose: str = Field(..., min_length=3, max_length=500)

    @model_validator(mode="after")
    def validate_time_window(self) -> "ReservationCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be strictly after start_time")
        return self


class ReservationResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    space_id: uuid.UUID
    purpose: str
    accompanying_count: int
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
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
        if self.requested_end <= self.requested_start:
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
    action: Literal["approve", "deny"]


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
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
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
