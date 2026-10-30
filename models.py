import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.
    Uses PostgreSQL's native UUID type if available, otherwise CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"


class AcousticProfile(str, enum.Enum):
    SILENT = "Silent"
    COLLABORATIVE = "Collaborative"
    AMPLIFIED = "Amplified"


class ReservationStatus(str, enum.Enum):
    PENDING_PERMISSION = "Pending_Permission"
    BOOKED = "Booked"
    DENIED = "Denied"
    SCANNED = "Scanned"
    EXPIRED = "Expired"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # college roll number or UUID
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)
    role = Column(
        SAEnum(UserRole, name="user_role_enum", native_enum=False),
        default=UserRole.STUDENT,
        nullable=False,
    )
    total_bookings = Column(Integer, default=0, nullable=False)

    reservations = relationship("Reservation", back_populates="user", cascade="all, delete-orphan")
    waitlists = relationship("StandbyWaitlist", back_populates="user", cascade="all, delete-orphan")


class Space(Base):
    __tablename__ = "spaces"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    acoustic_profile = Column(
        SAEnum(AcousticProfile, name="acoustic_profile_enum", native_enum=False),
        nullable=False,
    )

    reservations = relationship("Reservation", back_populates="space", cascade="all, delete-orphan")
    waitlists = relationship("StandbyWaitlist", back_populates="space", cascade="all, delete-orphan")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    purpose = Column(String, nullable=False)
    accompanying_count = Column(Integer, default=0, nullable=False)
    start_time = Column(DateTime, index=True, nullable=False)
    end_time = Column(DateTime, index=True, nullable=False)
    status = Column(
        SAEnum(ReservationStatus, name="reservation_status_enum", native_enum=False),
        default=ReservationStatus.PENDING_PERMISSION,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reservations")
    space = relationship("Space", back_populates="reservations")

    __table_args__ = (
        Index("idx_reservations_space_time", "space_id", "start_time", "end_time"),
    )


class StandbyWaitlist(Base):
    __tablename__ = "standby_waitlists"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    requested_start = Column(DateTime, nullable=False)
    requested_end = Column(DateTime, nullable=False)
    flash_claim_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="waitlists")
    space = relationship("Space", back_populates="waitlists")

    __table_args__ = (
        Index("idx_waitlist_space_active", "space_id", "is_active"),
    )
