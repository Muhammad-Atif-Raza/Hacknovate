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

    logger.info("Populating database with realistic campus seed data...")

    # -------------------------------------------------------------
    # 1. Realistic Campus Rooms (Spaces)
    # -------------------------------------------------------------
    spaces_data = [
        {
            "name": "Central Innovation Lab",
            "capacity": 24,
            "acoustic_profile": AcousticProfile.COLLABORATIVE,
        },
        {
            "name": "Main Campus Lecture Hall",
            "capacity": 85,
            "acoustic_profile": AcousticProfile.AMPLIFIED,
        },
        {
            "name": "Library Silent Study Pod",
            "capacity": 6,
            "acoustic_profile": AcousticProfile.SILENT,
        },
        {
            "name": "Library Quiet Research Suite",
            "capacity": 10,
            "acoustic_profile": AcousticProfile.SILENT,
        },
        {
            "name": "Student Collaborative Lounge",
            "capacity": 16,
            "acoustic_profile": AcousticProfile.COLLABORATIVE,
        },
        {
            "name": "University Grand Auditorium",
            "capacity": 150,
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
    # 2. Users (Admin + Pre-seeded Students including Agrim)
    # -------------------------------------------------------------
    admin_user = User(
        id="ADM-001",
        email="admin@campus.edu",
        name="Dr. Sarah Connor (Faculty Admin)",
        photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        role=UserRole.ADMIN,
        total_bookings=14,
    )

    user_agrim = User(
        id="STU-2026-001",
        email="agrimgoel14@gmail.com",
        name="Agrim Goel",
        photo_url="https://api.dicebear.com/7.x/bottts/svg?seed=agrimgoel14@gmail.com",
        role=UserRole.STUDENT,
        total_bookings=4,
    )

    student_alex = User(
        id="STU-2026-002",
        email="alex.chen@campus.edu",
        name="Alex Chen",
        photo_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role=UserRole.STUDENT,
        total_bookings=3,
    )

    student_priya = User(
        id="STU-2026-003",
        email="priya.sharma@campus.edu",
        name="Priya Sharma",
        photo_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        role=UserRole.STUDENT,
        total_bookings=5,
    )

    db.add_all([admin_user, user_agrim, student_alex, student_priya])
    db.flush()

    # -------------------------------------------------------------
    # 3. Sample Reservations (Pending & Booked)
    # -------------------------------------------------------------
    now = datetime.utcnow()

    # Booking 1: Pending_Permission for Agrim Goel in Central Innovation Lab
    res1 = Reservation(
        id=uuid.uuid4(),
        user_id=user_agrim.id,
        space_id=spaces_map["Central Innovation Lab"].id,
        purpose="AI Hackathon Platform Group Brainstorming",
        accompanying_count=4,
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=4),
        status=ReservationStatus.PENDING_PERMISSION,
        created_at=now - timedelta(hours=1),
    )

    # Booking 2: Pending_Permission for Priya Sharma in Student Collaborative Lounge
    res2 = Reservation(
        id=uuid.uuid4(),
        user_id=student_priya.id,
        space_id=spaces_map["Student Collaborative Lounge"].id,
        purpose="Robotics & Embedded Systems Design Sprint",
        accompanying_count=5,
        start_time=now + timedelta(days=1, hours=3),
        end_time=now + timedelta(days=1, hours=5),
        status=ReservationStatus.PENDING_PERMISSION,
        created_at=now - timedelta(minutes=30),
    )

    # Booking 3: Booked for Agrim Goel in Library Silent Study Pod
    res3 = Reservation(
        id=uuid.uuid4(),
        user_id=user_agrim.id,
        space_id=spaces_map["Library Silent Study Pod"].id,
        purpose="Deep Learning Research & Project Preparation",
        accompanying_count=0,
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=2, minutes=30),
        status=ReservationStatus.BOOKED,
        created_at=now - timedelta(hours=2),
    )

    db.add_all([res1, res2, res3])
    db.commit()

    logger.info("Successfully seeded 6 realistic rooms, 4 users, and 3 sample reservations.")
    return {
        "status": "success",
        "spaces_count": len(spaces_data),
        "users_count": 4,
        "reservations_count": 3,
        "users": [
            {"name": admin_user.name, "email": admin_user.email, "role": admin_user.role.value},
            {"name": user_agrim.name, "email": user_agrim.email, "role": user_agrim.role.value},
            {"name": student_alex.name, "email": student_alex.email, "role": student_alex.role.value},
            {"name": student_priya.name, "email": student_priya.email, "role": student_priya.role.value},
        ],
        "spaces": [s["name"] for s in spaces_data],
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        res = seed_database(db, force_reset=True)
        print("Seed result:", res)
    finally:
        db.close()
