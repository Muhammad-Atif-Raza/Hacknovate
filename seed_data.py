import uuid
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
from models import (
    User,
    UserRole,
    Space,
    AcousticProfile,
    Reservation,
    ReservationStatus,
    StandbyWaitlist,
)

logger = logging.getLogger("seed_data")


def seed_database(db: Session, force_reset: bool = False):
    """
    Seeds database with initial rooms, users, and reservations.
    If force_reset=True, deletes existing data first.
    """
    if force_reset:
        logger.info("Resetting existing database tables...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    # Check if already seeded
    existing_spaces_count = db.query(Space).count()
    if existing_spaces_count > 0 and not force_reset:
        logger.info("Database already contains spaces. Skipping auto-seed.")
        return {"status": "skipped", "message": "Database already contains seed data."}

    logger.info("Populating database with hackathon initial seed data...")

    # -------------------------------------------------------------
    # 1. Campus Rooms (Spaces)
    # -------------------------------------------------------------
    spaces_data = [
        {
            "name": "Turing Innovation Lab",
            "capacity": 20,
            "acoustic_profile": AcousticProfile.COLLABORATIVE,
        },
        {
            "name": "Ada Lovelace Silent Study",
            "capacity": 8,
            "acoustic_profile": AcousticProfile.SILENT,
        },
        {
            "name": "Babbage Amphitheater",
            "capacity": 75,
            "acoustic_profile": AcousticProfile.AMPLIFIED,
        },
        {
            "name": "Shannon Quiet Pod A",
            "capacity": 4,
            "acoustic_profile": AcousticProfile.SILENT,
        },
        {
            "name": "Von Neumann Team Room",
            "capacity": 12,
            "acoustic_profile": AcousticProfile.COLLABORATIVE,
        },
        {
            "name": "Curie Auditorium",
            "capacity": 120,
            "acoustic_profile": AcousticProfile.AMPLIFIED,
        },
    ]

    spaces_map = {}
    for data in spaces_data:
        space = Space(
            id=uuid.uuid4(),
            name=data["name"],
            capacity=data["capacity"],
            acoustic_profile=data["acoustic_profile"],
        )
        db.add(space)
        spaces_map[data["name"]] = space

    db.flush()

    # -------------------------------------------------------------
    # 2. Users (1 Admin, 2 Students)
    # -------------------------------------------------------------
    admin_user = User(
        id="ADM-001",
        email="admin@campus.edu",
        name="Dr. Sarah Connor (Faculty Admin)",
        photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        role=UserRole.ADMIN,
        total_bookings=12,
    )

    student1 = User(
        id="STU-2026-001",
        email="alex.chen@campus.edu",
        name="Alex Chen",
        photo_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role=UserRole.STUDENT,
        total_bookings=3,
    )

    student2 = User(
        id="STU-2026-002",
        email="priya.sharma@campus.edu",
        name="Priya Sharma",
        photo_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        role=UserRole.STUDENT,
        total_bookings=5,
    )

    db.add_all([admin_user, student1, student2])
    db.flush()

    # -------------------------------------------------------------
    # 3. Sample Reservations
    # -------------------------------------------------------------
    now = datetime.utcnow()

    # Booking 1: Pending_Permission for Alex Chen in Turing Lab
    res1 = Reservation(
        id=uuid.uuid4(),
        user_id=student1.id,
        space_id=spaces_map["Turing Innovation Lab"].id,
        purpose="AI Hackathon Group Brainstorming",
        accompanying_count=4,
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=4),
        status=ReservationStatus.PENDING_PERMISSION,
        created_at=now - timedelta(hours=1),
    )

    # Booking 2: Pending_Permission for Priya Sharma in Von Neumann Team Room
    res2 = Reservation(
        id=uuid.uuid4(),
        user_id=student2.id,
        space_id=spaces_map["Von Neumann Team Room"].id,
        purpose="Robotics Club Design Sprint",
        accompanying_count=6,
        start_time=now + timedelta(days=1, hours=3),
        end_time=now + timedelta(days=1, hours=5),
        status=ReservationStatus.PENDING_PERMISSION,
        created_at=now - timedelta(minutes=30),
    )

    # Booking 3: Booked for Alex Chen in Ada Lovelace Silent Study
    res3 = Reservation(
        id=uuid.uuid4(),
        user_id=student1.id,
        space_id=spaces_map["Ada Lovelace Silent Study"].id,
        purpose="Deep Learning Thesis Prep",
        accompanying_count=0,
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=2, minutes=30),
        status=ReservationStatus.BOOKED,
        created_at=now - timedelta(hours=2),
    )

    db.add_all([res1, res2, res3])
    db.commit()

    logger.info("Successfully seeded 6 rooms, 3 users, and 3 sample reservations.")
    return {
        "status": "success",
        "spaces_count": len(spaces_data),
        "users_count": 3,
        "reservations_count": 3,
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db, force_reset=True)
    finally:
        db.close()
