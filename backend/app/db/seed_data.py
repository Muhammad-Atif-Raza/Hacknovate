import datetime
import json
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.db.models import User, Room, Equipment, Booking, MaintenanceRecord, Notification, OccupancyLog
from app.core.security import get_password_hash
from app.services.qr_service import generate_qr_for_booking
from app.core.config import settings

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded with NIIT University accounts
        if db.query(User).filter(User.email == "admin@niituniversity.in").first():
            print("Database already seeded with NIIT accounts. Skipping.")
            return

        print("Seeding database with NIIT University campus data...")

        # 1. Equipment Catalog
        equipment_list = [
            Equipment(name="High-Def Projector", icon="Projector"),
            Equipment(name="Magnetic Whiteboard", icon="PenTool"),
            Equipment(name="Dual Display Computer", icon="Monitor"),
            Equipment(name="Wireless Microphone", icon="Mic"),
            Equipment(name="Surround Sound System", icon="Volume2"),
            Equipment(name="4K Video Conference Cam", icon="Video"),
            Equipment(name="Overhead Document Camera", icon="Camera"),
            Equipment(name="Smart Podium & Clicker", icon="Cast"),
        ]
        db.add_all(equipment_list)
        db.flush()

        eq_map = {eq.name: eq for eq in equipment_list}

        # 2. Users (Admin + Students)
        admin_user = User(
            email="admin@niituniversity.in",
            full_name="Dr. Eleanor Vance",
            enrollment_number=None,
            department="Campus Resource & Facilities Administration",
            course="Administration",
            year="Faculty",
            role="admin",
            hashed_password=get_password_hash("AdminPassword123!"),
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
            is_active=True
        )

        admin_student_alias = User(
            email="admin@st.niituniversity.in",
            full_name="Administrator Portal Access",
            enrollment_number=None,
            department="Campus Administration",
            course="Administration",
            year="Faculty",
            role="admin",
            hashed_password=get_password_hash("AdminPassword123!"),
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
            is_active=True
        )

        student_tanmay = User(
            email="tanmay.sharma@st.niituniversity.in",
            full_name="Tanmay Sharma",
            enrollment_number="ENR2024CS042",
            department="Computer Science & Engineering",
            course="B.Tech Computer Science",
            year="3rd Year",
            role="student",
            hashed_password=get_password_hash("StudentPassword123!"),
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            is_active=True
        )

        student_priya = User(
            email="priya.nair@st.niituniversity.in",
            full_name="Priya Nair",
            enrollment_number="ENR2024EC019",
            department="Electronics & Communication",
            course="B.Tech ECE",
            year="2nd Year",
            role="student",
            hashed_password=get_password_hash("StudentPassword123!"),
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
            is_active=True
        )

        db.add_all([admin_user, admin_student_alias, student_tanmay, student_priya])
        db.flush()

        # 3. Rooms
        rooms = [
            Room(
                room_number="LH-101",
                name="Alan Turing Memorial Lecture Theatre",
                building="Aryabhata Science Block",
                floor=1,
                capacity=120,
                acoustic_profile="Amplified Sound Permitted",
                status="AVAILABLE",
                latitude=28.5450,
                longitude=77.1920,
                image_url="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
                description="Tiered amphitheater style hall equipped with dual laser projection and multi-zone acoustics.",
                equipment_items=[eq_map["High-Def Projector"], eq_map["Wireless Microphone"], eq_map["Surround Sound System"], eq_map["Smart Podium & Clicker"]]
            ),
            Room(
                room_number="SR-104",
                name="Quantum Computing Lab & Discussion Room",
                building="Aryabhata Science Block",
                floor=1,
                capacity=30,
                acoustic_profile="Collaborative Discussion",
                status="AVAILABLE",
                latitude=28.5453,
                longitude=77.1924,
                image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
                description="Modern group deliberation lab with writeable glass walls and high-performance workstations.",
                equipment_items=[eq_map["Magnetic Whiteboard"], eq_map["Dual Display Computer"], eq_map["High-Def Projector"]]
            ),
            Room(
                room_number="TT-201",
                name="Collaborative UX Design Studio",
                building="Turing Tech Tower",
                floor=2,
                capacity=24,
                acoustic_profile="Collaborative Discussion",
                status="OCCUPIED",
                latitude=28.5462,
                longitude=77.1935,
                image_url="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
                description="Flexible modular seating, digital interactive panels, and agile sprint breakout spaces.",
                equipment_items=[eq_map["High-Def Projector"], eq_map["Magnetic Whiteboard"], eq_map["4K Video Conference Cam"]]
            ),
            Room(
                room_number="TT-401",
                name="Silicon Valley Seminar Hall",
                building="Turing Tech Tower",
                floor=4,
                capacity=85,
                acoustic_profile="Amplified Sound Permitted",
                status="AVAILABLE",
                latitude=28.5465,
                longitude=77.1938,
                image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
                description="Executive seminar suite equipped with global telepresence and digital stage lighting.",
                equipment_items=[eq_map["High-Def Projector"], eq_map["Wireless Microphone"], eq_map["4K Video Conference Cam"], eq_map["Surround Sound System"]]
            ),
            Room(
                room_number="LIB-01",
                name="Silent Research Sanctuary A",
                building="Central Knowledge Library",
                floor=2,
                capacity=16,
                acoustic_profile="Silent Study Zone",
                status="AVAILABLE",
                latitude=28.5442,
                longitude=77.1905,
                image_url="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
                description="Acoustically isolated quiet enclave for deep focus, thesis research, and literature study.",
                equipment_items=[eq_map["Magnetic Whiteboard"], eq_map["Dual Display Computer"]]
            ),
            Room(
                room_number="LIB-02",
                name="Silent Research Sanctuary B",
                building="Central Knowledge Library",
                floor=2,
                capacity=12,
                acoustic_profile="Silent Study Zone",
                status="AVAILABLE",
                latitude=28.5444,
                longitude=77.1908,
                image_url="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
                description="Individual reading carrels with individual ergonomic illumination and power ports.",
                equipment_items=[eq_map["Dual Display Computer"]]
            ),
            Room(
                room_number="LIB-G03",
                name="Media Production & Podcasting Studio",
                building="Central Knowledge Library",
                floor=0,
                capacity=8,
                acoustic_profile="Collaborative Discussion",
                status="UNDER_MAINTENANCE",
                latitude=28.5439,
                longitude=77.1902,
                image_url="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
                description="Soundproof booth with broadcast mics and studio monitoring. Currently undergoing acoustic panel calibration.",
                equipment_items=[eq_map["Surround Sound System"], eq_map["Wireless Microphone"], eq_map["4K Video Conference Cam"]]
            ),
            Room(
                room_number="RAC-AUD",
                name="Grand Memorial University Auditorium",
                building="Ramanujan Arts & Seminar Complex",
                floor=1,
                capacity=350,
                acoustic_profile="Amplified Sound Permitted",
                status="AVAILABLE",
                latitude=28.5475,
                longitude=77.1915,
                image_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
                description="Premier multi-tier campus auditorium with full theatrical lighting rig and Dolby pro sound.",
                equipment_items=[eq_map["High-Def Projector"], eq_map["Wireless Microphone"], eq_map["Surround Sound System"], eq_map["Smart Podium & Clicker"]]
            ),
            Room(
                room_number="RAC-202",
                name="Socratic Debate & Moot Court Room",
                building="Ramanujan Arts & Seminar Complex",
                floor=2,
                capacity=45,
                acoustic_profile="Collaborative Discussion",
                status="AVAILABLE",
                latitude=28.5478,
                longitude=77.1918,
                image_url="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
                description="Parliamentary horseshoe seating arrangement with individual bench microphones.",
                equipment_items=[eq_map["High-Def Projector"], eq_map["Magnetic Whiteboard"], eq_map["Wireless Microphone"]]
            )
        ]
        db.add_all(rooms)
        db.flush()

        # 4. Seed sample bookings
        today_str = datetime.date.today().isoformat()
        tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

        # Approved Booking for Tanmay (with QR code)
        qr_token, _ = generate_qr_for_booking("CPH-BK-10420", settings.SECRET_KEY)
        now = datetime.datetime.utcnow()
        checkin_deadline = now + datetime.timedelta(minutes=15)

        b1 = Booking(
            id="CPH-BK-10420",
            user_id=student_tanmay.id,
            room_id=rooms[0].id,  # LH-101
            booking_date=today_str,
            start_time="14:00",
            end_time="16:00",
            number_of_people=45,
            purpose="ACM Student Chapter Workshop on Cloud Architecture",
            why_needed="Hands-on workshop requiring projector, stage microphones and large seating capacity.",
            accompanying_students=json.dumps([
                {"name": "Aman Verma", "enrollment": "ENR2024CS012"},
                {"name": "Sneha Sen", "enrollment": "ENR2024CS088"}
            ]),
            required_equipment=json.dumps(["High-Def Projector", "Wireless Microphone"]),
            status="APPROVED",
            qr_token=qr_token,
            checkin_deadline=checkin_deadline,
            created_at=now - datetime.timedelta(hours=3),
            updated_at=now
        )

        # Pending Booking for Priya (ready for Admin to Approve/Reject!)
        b2 = Booking(
            id="CPH-BK-20815",
            user_id=student_priya.id,
            room_id=rooms[1].id,  # SR-104
            booking_date=tomorrow_str,
            start_time="10:00",
            end_time="12:00",
            number_of_people=18,
            purpose="Robotics & Sensor Circuit Collaborative Design Sprint",
            why_needed="Group deliberation with hardware kits requiring whiteboard and workstation monitors.",
            accompanying_students=json.dumps([
                {"name": "Rohan Gupta", "enrollment": "ENR2024EC033"},
                {"name": "Kavita Rao", "enrollment": "ENR2024EC071"}
            ]),
            required_equipment=json.dumps(["Magnetic Whiteboard", "Dual Display Computer"]),
            status="PENDING",
            created_at=now - datetime.timedelta(hours=1),
            updated_at=now - datetime.timedelta(hours=1)
        )

        # Another Pending Booking for Tanmay
        b3 = Booking(
            id="CPH-BK-30922",
            user_id=student_tanmay.id,
            room_id=rooms[4].id,  # LIB-01
            booking_date=tomorrow_str,
            start_time="15:00",
            end_time="17:00",
            number_of_people=6,
            purpose="Competitive Programming Team Final Review",
            why_needed="Silent focus environment without background noise to simulate contest conditions.",
            accompanying_students=json.dumps([
                {"name": "Deepak Shah", "enrollment": "ENR2024CS099"}
            ]),
            required_equipment=json.dumps(["Magnetic Whiteboard"]),
            status="PENDING",
            created_at=now - datetime.timedelta(minutes=30),
            updated_at=now - datetime.timedelta(minutes=30)
        )

        db.add_all([b1, b2, b3])
        db.flush()

        # 5. Maintenance record for LIB-G03
        maint = MaintenanceRecord(
            room_id=rooms[6].id,  # LIB-G03
            title="Acoustic Foam Calibration & HVAC Inspection",
            reason="Scheduled quarterly acoustic dampening replacement and air purification cycle.",
            status="ACTIVE",
            affected_bookings_count=0,
            reassigned_details=json.dumps([]),
            created_by_user_id=admin_user.id,
            created_at=now - datetime.timedelta(days=1)
        )
        db.add(maint)

        # 6. Notifications
        n1 = Notification(
            user_id=student_tanmay.id,
            title="Booking Approved! QR Check-in Ready",
            message=f"Your reservation #CPH-BK-10420 for {rooms[0].room_number} on {today_str} (14:00-16:00) has been APPROVED. Scan your QR code on arrival.",
            type="APPROVAL",
            link="/student/dashboard"
        )
        n2 = Notification(
            user_id=admin_user.id,
            title="2 Pending Booking Requests",
            message="Applications #CPH-BK-20815 and #CPH-BK-30922 are awaiting administrative evaluation.",
            type="SYSTEM",
            link="/admin/pending"
        )
        db.add_all([n1, n2])

        # 7. Occupancy Logs
        occ1 = OccupancyLog(
            room_id=rooms[0].id,
            booking_id="CPH-BK-10420",
            event_type="CHECK_IN",
            details="Booking approved by Administrator. Ready for student QR scan.",
            timestamp=now - datetime.timedelta(hours=2)
        )
        occ2 = OccupancyLog(
            room_id=rooms[6].id,
            event_type="MAINTENANCE_LOCK",
            details="Room locked for HVAC & Acoustic Foam Maintenance.",
            timestamp=now - datetime.timedelta(days=1)
        )
        db.add_all([occ1, occ2])

        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
