from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import Room, Equipment, User
from app.schemas.room import RoomOut, RoomCreate, RoomUpdate, EquipmentOut
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("/equipment", response_model=List[EquipmentOut])
def get_equipment_catalog(db: Session = Depends(get_db)):
    return db.query(Equipment).order_by(Equipment.name.asc()).all()

@router.get("", response_model=List[RoomOut])
def get_rooms(
    building: Optional[str] = None,
    min_capacity: Optional[int] = None,
    acoustic_profile: Optional[str] = None,
    status_filter: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if not include_inactive:
        query = query.filter(Room.is_active == True)
    if building:
        query = query.filter(Room.building == building)
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)
    if acoustic_profile:
        query = query.filter(Room.acoustic_profile == acoustic_profile)
    if status_filter:
        query = query.filter(Room.status == status_filter)

    return query.order_by(Room.building.asc(), Room.room_number.asc()).all()

@router.get("/{room_id}", response_model=RoomOut)
def get_room_by_id(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    return room

@router.post("", response_model=RoomOut)
def create_room(
    room_in: RoomCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Room).filter(Room.room_number == room_in.room_number.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room number {room_in.room_number} already exists.")

    new_room = Room(
        room_number=room_in.room_number.strip().upper(),
        name=room_in.name.strip(),
        building=room_in.building.strip(),
        floor=room_in.floor,
        capacity=room_in.capacity,
        acoustic_profile=room_in.acoustic_profile,
        status=room_in.status,
        latitude=room_in.latitude,
        longitude=room_in.longitude,
        image_url=room_in.image_url,
        description=room_in.description,
        is_active=True
    )

    if room_in.equipment_ids:
        eqs = db.query(Equipment).filter(Equipment.id.in_(room_in.equipment_ids)).all()
        new_room.equipment_items = eqs

    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    room_in: RoomUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if room_in.room_number is not None:
        # Check duplicate
        dup = db.query(Room).filter(Room.room_number == room_in.room_number.strip().upper(), Room.id != room_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Room number already taken.")
        room.room_number = room_in.room_number.strip().upper()

    if room_in.name is not None:
        room.name = room_in.name.strip()
    if room_in.building is not None:
        room.building = room_in.building.strip()
    if room_in.floor is not None:
        room.floor = room_in.floor
    if room_in.capacity is not None:
        room.capacity = room_in.capacity
    if room_in.acoustic_profile is not None:
        room.acoustic_profile = room_in.acoustic_profile
    if room_in.status is not None:
        room.status = room_in.status
    if room_in.latitude is not None:
        room.latitude = room_in.latitude
    if room_in.longitude is not None:
        room.longitude = room_in.longitude
    if room_in.image_url is not None:
        room.image_url = room_in.image_url
    if room_in.description is not None:
        room.description = room_in.description
    if room_in.is_active is not None:
        room.is_active = room_in.is_active

    if room_in.equipment_ids is not None:
        eqs = db.query(Equipment).filter(Equipment.id.in_(room_in.equipment_ids)).all()
        room.equipment_items = eqs

    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    room.is_active = False
    room.status = "TEMPORARILY_UNAVAILABLE"
    db.commit()
    return {"message": f"Room {room.room_number} deactivated successfully."}
