import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.db.database import Base

# Association Table for Room <-> Equipment
room_equipment = Table(
    "room_equipment",
    Base.metadata,
    Column("room_id", Integer, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True),
    Column("equipment_id", Integer, ForeignKey("equipment.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    enrollment_number = Column(String(100), unique=True, index=True, nullable=True)
    department = Column(String(150), nullable=False)
    course = Column(String(150), nullable=True)
    year = Column(String(50), nullable=True)
    role = Column(String(50), default="student", nullable=False)  # "student", "admin"
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    standby_entries = relationship("StandbyQueue", back_populates="user", cascade="all, delete-orphan")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="Tv")

    rooms = relationship("Room", secondary=room_equipment, back_populates="equipment_items")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    building = Column(String(150), nullable=False, index=True)
    floor = Column(Integer, default=1)
    capacity = Column(Integer, nullable=False)
    # Acoustic profile: "Silent Study Zone", "Collaborative Discussion", "Amplified Sound Permitted"
    acoustic_profile = Column(String(100), default="Collaborative Discussion", nullable=False, index=True)
    # Status: "AVAILABLE", "OCCUPIED", "UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"
    status = Column(String(50), default="AVAILABLE", nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    equipment_items = relationship("Equipment", secondary=room_equipment, back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")
    maintenance_records = relationship("MaintenanceRecord", back_populates="room")
    occupancy_logs = relationship("OccupancyLog", back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(50), primary_key=True, index=True)  # e.g. "CPH-BK-1024"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_date = Column(String(20), nullable=False, index=True)  # "YYYY-MM-DD"
    start_time = Column(String(10), nullable=False, index=True)    # "HH:MM"
    end_time = Column(String(10), nullable=False, index=True)      # "HH:MM"
    number_of_people = Column(Integer, nullable=False)
    purpose = Column(String(255), nullable=False)
    why_needed = Column(Text, nullable=False)
    accompanying_students = Column(Text, nullable=True)  # JSON string
    required_equipment = Column(Text, nullable=True)     # JSON string
    # Status: "PENDING", "APPROVED", "REJECTED", "CHECKED_IN", "CANCELLED", "EXPIRED", "COMPLETED"
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    qr_token = Column(String(255), unique=True, index=True, nullable=True)
    checkin_deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    checkin_records = relationship("QRCheckin", back_populates="booking", cascade="all, delete-orphan")


class QRCheckin(Base):
    __tablename__ = "qr_checkins"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    scanned_at = Column(DateTime, default=datetime.datetime.utcnow)
    client_ip = Column(String(100), nullable=True)
    status = Column(String(50), default="SUCCESS")  # "SUCCESS", "REJECTED", "EXPIRED"

    booking = relationship("Booking", back_populates="checkin_records")


class StandbyQueue(Base):
    __tablename__ = "standby_queue"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_date = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Status: "WAITING", "OFFERED", "CLAIMED", "EXPIRED"
    status = Column(String(50), default="WAITING", nullable=False, index=True)
    offered_at = Column(DateTime, nullable=True)
    claim_deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="standby_entries")
    room = relationship("Room")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    # Status: "ACTIVE", "RESOLVED"
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    affected_bookings_count = Column(Integer, default=0)
    reassigned_details = Column(Text, nullable=True)  # JSON summary
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    room = relationship("Room", back_populates="maintenance_records")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="SYSTEM")  # APPROVAL, REJECTION, CHECKIN_REMINDER, STANDBY_OFFER, MAINTENANCE_REASSIGNMENT
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class OccupancyLog(Base):
    __tablename__ = "occupancy_logs"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(String(50), nullable=True)
    event_type = Column(String(50), nullable=False)  # CHECK_IN, AUTO_RELEASE, MAINTENANCE_LOCK, CHECK_OUT, MANUAL_OVERRIDE
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("Room", back_populates="occupancy_logs")
