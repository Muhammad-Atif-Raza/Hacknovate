from pydantic import BaseModel
from typing import Optional, List
import datetime

class EquipmentOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = "Tv"

    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    room_number: str
    name: str
    building: str
    floor: int = 1
    capacity: int
    acoustic_profile: str = "Collaborative Discussion"
    status: str = "AVAILABLE"
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    description: Optional[str] = None

class RoomCreate(RoomBase):
    equipment_ids: List[int] = []

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    acoustic_profile: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    equipment_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None

class RoomOut(RoomBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    equipment_items: List[EquipmentOut] = []

    class Config:
        from_attributes = True

class RoomSearchRequest(BaseModel):
    number_of_people: int
    booking_date: str
    start_time: str
    end_time: str
    required_facilities: List[str] = []
    acoustic_preference: Optional[str] = None
