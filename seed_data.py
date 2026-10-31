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
    get_ist_now,
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
        spaces = db.query(Space).order_by(Space.name.asc()).all()
        updated = False
        for idx, s in enumerate(spaces):
            if not getattr(s, "rfid_reader_id", None):
                s.rfid_reader_id = f"RFID-DOOR-{idx+1:02d}"
                updated = True
        if updated:
            db.commit()
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
            "capacity": 100,
            "acoustic_profile": AcousticProfile.AMPLIFIED,
        },
    ]

    spaces_map = {}
    for idx, data in enumerate(spaces_data):
        space = Space(
            id=uuid.uuid4(),
            name=data["name"],
            capacity=data["capacity"],
            acoustic_profile=data["acoustic_profile"],
            rfid_reader_id=data.get("rfid_reader_id", f"RFID-DOOR-{idx+1:02d}"),
        )
        db.add(space)
        spaces_map[data["name"]] = space

    db.flush()

    # -------------------------------------------------------------
    # 2. Users (Admin + Pre-seeded Students including Agrim)
    # -------------------------------------------------------------
    admin_tanmay = User(
        id="ADM-2026-001",
        email="tanmay.singh26@st.niituniversity.in",
        name="Tanmay Singh",
        photo_url="https://api.dicebear.com/7.x/bottts/svg?seed=tanmay.singh26@st.niituniversity.in",
        role=UserRole.ADMIN,
        total_bookings=0,
    )

    admin_user = User(
        id="ADM-001",
        email="sarah.connor.fac@st.niituniversity.in",
        name="Dr. Sarah Connor (Faculty Admin)",
        photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        role=UserRole.ADMIN,
        total_bookings=14,
    )

    user_agrim = User(
        id="ADM-2026-002",
        email="agrim.goel26@st.niituniversity.in",
        name="Agrim Goel (Faculty Admin)",
        photo_url="https://api.dicebear.com/7.x/bottts/svg?seed=agrim.goel26@st.niituniversity.in",
        role=UserRole.ADMIN,
        total_bookings=4,
        urgent_requests_used=1,
    )

    legacy_admin = User(
        id="ADM-002",
        email="admin@campus.edu",
        name="Campus Admin",
        photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        role=UserRole.ADMIN,
        total_bookings=0,
    )

    legacy_agrim = User(
        id="STU-2026-004",
        email="agrimgoel14@gmail.com",
        name="Agrim Goel (Student)",
        photo_url="https://api.dicebear.com/7.x/bottts/svg?seed=agrimgoel14@gmail.com",
        role=UserRole.STUDENT,
        total_bookings=0,
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

    db.add_all([admin_tanmay, admin_user, user_agrim, student_alex, student_priya, legacy_admin, legacy_agrim])
    db.flush()

    # -------------------------------------------------------------
    # 3. Sample Reservations (Pending & Booked with Accompanying Students)
    # -------------------------------------------------------------
    now = get_ist_now()
    res_date = (now + timedelta(days=1)).date()

    res1_accompanying = [
        {
            "name": "Rohan Verma",
            "email": "rohan.verma@st.niituniversity.in",
            "enrollment_number": "BT26GCS015",
            "phone_number": "9876543210",
        },
        {
            "name": "Ananya Sen",
            "email": "ananya.sen@st.niituniversity.in",
            "enrollment_number": "BT26GCS042",
            "phone_number": "9811223344",
        },
        {
            "name": "Kavya Patel",
            "email": "kavya.patel@st.niituniversity.in",
            "enrollment_number": "BT26GCS088",
            "phone_number": "9722334455",
        },
        {
            "name": "Dev Sharma",
            "email": "dev.sharma@st.niituniversity.in",
            "enrollment_number": "BT26GCS104",
            "phone_number": "9933445566",
        },
    ]

    # Booking 1: Pending_Permission for Agrim Goel in Central Innovation Lab
    res1 = Reservation(
        id=uuid.uuid4(),
        user_id=user_agrim.id,
        space_id=spaces_map["Central Innovation Lab"].id,
        purpose="AI Hackathon Platform Group Brainstorming",
        accompanying_count=len(res1_accompanying),
        accompanying_students=res1_accompanying,
        start_time=datetime.combine(res_date, datetime.min.time()).replace(hour=10, minute=0),
        end_time=datetime.combine(res_date, datetime.min.time()).replace(hour=12, minute=0),
        status=ReservationStatus.PENDING_PERMISSION,
        is_urgent=True,
        created_at=now - timedelta(hours=1),
    )

    res2_accompanying = [
        {
            "name": "Tanmay Joshi",
            "email": "tanmay.joshi@st.niituniversity.in",
            "enrollment_number": "BT26GCS112",
            "phone_number": "9844556677",
        },
        {
            "name": "Meera Nair",
            "email": "meera.nair@st.niituniversity.in",
            "enrollment_number": "BT26GCS129",
            "phone_number": "9855667788",
        },
        {
            "name": "Aryan Rao",
            "email": "aryan.rao@st.niituniversity.in",
            "enrollment_number": "BT26GCS135",
            "phone_number": "9866778899",
        },
    ]

    # Booking 2: Pending_Permission for Priya Sharma in Student Collaborative Lounge
    res2 = Reservation(
        id=uuid.uuid4(),
        user_id=student_priya.id,
        space_id=spaces_map["Student Collaborative Lounge"].id,
        purpose="Robotics & Embedded Systems Design Sprint",
        accompanying_count=len(res2_accompanying),
        accompanying_students=res2_accompanying,
        start_time=datetime.combine(res_date, datetime.min.time()).replace(hour=13, minute=0),
        end_time=datetime.combine(res_date, datetime.min.time()).replace(hour=15, minute=0),
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
        accompanying_students=[],
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
