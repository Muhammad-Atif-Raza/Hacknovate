import os
import sys
import uuid
from datetime import datetime, timedelta

# Ensure UTF-8 output encoding on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure current directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi.testclient import TestClient
from main import app
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
from background_tasks import process_qr_auto_release_and_standby_rotation
from ml_engine import suggest_optimal_slots

client = TestClient(app)


def print_test_header(title: str):
    print(f"\n{'='*70}\n[TEST] {title}\n{'='*70}")


def run_all_tests():
    print_test_header("1. Health Check & Database Seeding")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("[OK] Health check online:", resp.json())

    # Trigger force reset seed to ensure clean known state
    resp = client.post("/api/dev/seed?force_reset=true")
    assert resp.status_code == 200, f"Seed failed: {resp.text}"
    seed_info = resp.json()
    print("[OK] Database Seeded:", seed_info)
    assert seed_info["spaces_count"] == 6
    assert seed_info["users_count"] >= 3
    assert seed_info["reservations_count"] >= 3

    # Check spaces list
    resp = client.get("/api/spaces")
    assert resp.status_code == 200
    spaces = resp.json()
    assert len(spaces) == 6
    print(f"[OK] Found {len(spaces)} campus spaces across Silent, Collaborative, Amplified.")

    # -------------------------------------------------------------
    # 2. Authentication Tests
    # -------------------------------------------------------------
    print_test_header("2. Authentication & Role Permissions")

    # Student Auth via Dev Bypass
    resp = client.post(
        "/api/auth/google",
        json={
            "dev_bypass_email": "alex.chen@campus.edu",
            "dev_role": "student",
            "name": "Alex Chen",
        },
    )
    assert resp.status_code == 200, f"Student auth failed: {resp.text}"
    student_auth = resp.json()
    student_token = student_auth["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[OK] Student authenticated:", student_auth["user"]["name"], f"(Role: {student_auth['role']})")

    # Admin Auth via Dev Bypass
    resp = client.post(
        "/api/auth/google",
        json={
            "dev_bypass_email": "admin@campus.edu",
            "dev_role": "admin",
            "name": "Dr. Sarah Connor",
        },
    )
    assert resp.status_code == 200, f"Admin auth failed: {resp.text}"
    admin_auth = resp.json()
    admin_token = admin_auth["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] Admin authenticated:", admin_auth["user"]["name"], f"(Role: {admin_auth['role']})")

    # Logout endpoint test
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    print("[OK] Logout endpoint responsive.")

    # Role enforcement test: Student accessing Admin route should get 403 Forbidden
    resp = client.get("/api/admin/pending-requests", headers=student_headers)
    assert resp.status_code == 403, f"Expected 403 for student on admin route, got {resp.status_code}"
    print("[OK] Role Protection: Student correctly forbidden from Admin routes (403).")

    # -------------------------------------------------------------
    # 3. Student Dashboard
    # -------------------------------------------------------------
    print_test_header("3. Student Dashboard Endpoint")
    resp = client.get("/api/user/dashboard", headers=student_headers)
    assert resp.status_code == 200, f"Dashboard failed: {resp.text}"
    dashboard = resp.json()
    print("[OK] Dashboard retrieved for user:", dashboard["user"]["email"])
    print(f"  Total bookings: {dashboard['user']['total_bookings']}")
    print(f"  Active bookings count: {len(dashboard['active_bookings'])}")
    print("  History keys present:", list(dashboard["history_by_status"].keys()))
    assert "Pending_Permission" in dashboard["history_by_status"]
    assert "Booked" in dashboard["history_by_status"]

    # -------------------------------------------------------------
    # 4. Room Search & Conflict-Free Math + ML Fallback
    # -------------------------------------------------------------
    print_test_header("4. Room Search & ML Fallback")
    now = datetime.utcnow()

    # Search where space is available
    search_start = (now + timedelta(days=5)).isoformat() + "Z"
    search_end = (now + timedelta(days=5, hours=2)).isoformat() + "Z"

    resp = client.get(
        "/api/rooms/search",
        params={
            "capacity": 10,
            "start_time": search_start,
            "end_time": search_end,
            "acoustic_profile": "Collaborative",
        },
    )
    assert resp.status_code == 200, f"Search failed: {resp.text}"
    search_res = resp.json()
    print(f"[OK] Open Search: Found {len(search_res['available_rooms'])} available rooms.")
    assert len(search_res["available_rooms"]) > 0

    # Saturated search: Book all matching spaces for a window, then test ML Fallback
    db = SessionLocal()
    collab_spaces = db.query(Space).filter(Space.acoustic_profile == AcousticProfile.COLLABORATIVE).all()
    crowded_start = now + timedelta(days=2, hours=10)
    crowded_end = crowded_start + timedelta(hours=2)

    # Block all collaborative spaces during this window
    for s in collab_spaces:
        res = Reservation(
            id=uuid.uuid4(),
            user_id=student_auth["user"]["id"],
            space_id=s.id,
            purpose="Congestion Simulation",
            accompanying_count=0,
            start_time=crowded_start,
            end_time=crowded_end,
            status=ReservationStatus.BOOKED,
        )
        db.add(res)
    db.commit()
    db.close()

    # Now search for this crowded window -> Should return available_rooms: [] and trigger ML suggestions
    resp = client.get(
        "/api/rooms/search",
        params={
            "capacity": 10,
            "start_time": crowded_start.isoformat() + "Z",
            "end_time": crowded_end.isoformat() + "Z",
            "acoustic_profile": "Collaborative",
        },
    )
    assert resp.status_code == 200
    ml_res = resp.json()
    print(f"[OK] Congested Search: Available rooms: {len(ml_res['available_rooms'])}")
    print(f"[OK] ML Smart Slot Suggester invoked! Returned {len(ml_res['ml_suggested_slots'])} suggestions:")
    assert len(ml_res["available_rooms"]) == 0
    assert len(ml_res["ml_suggested_slots"]) > 0
    for idx, slot in enumerate(ml_res["ml_suggested_slots"], 1):
        print(f"  [{idx}] Slot: {slot['suggested_start']} - {slot['suggested_end']}")
        print(f"      Congestion Score: {slot['congestion_score']}, Success Probability: {slot['success_probability']}")
        print(f"      Available Spaces: {len(slot['available_spaces'])}, Reason: {slot['reason']}")

    # -------------------------------------------------------------
    # 5. Bookings Creation & Conflict Handling
    # -------------------------------------------------------------
    print_test_header("5. Booking Creation & Conflict Check")
    free_space = spaces[0]
    b_start = (now + timedelta(days=3, hours=1)).isoformat() + "Z"
    b_end = (now + timedelta(days=3, hours=3)).isoformat() + "Z"

    # Create new booking
    resp = client.post(
        "/api/bookings",
        headers=student_headers,
        json={
            "space_id": free_space["id"],
            "start_time": b_start,
            "end_time": b_end,
            "accompanying_count": 2,
            "purpose": "Full-Stack Project Work",
        },
    )
    assert resp.status_code == 201, f"Booking creation failed: {resp.text}"
    new_booking = resp.json()
    new_booking_id = new_booking["id"]
    print("[OK] Created booking with status:", new_booking["status"], f"(ID: {new_booking_id})")
    assert new_booking["status"] == "Pending_Permission"

    # Conflicting booking attempt should return 409 Conflict
    resp = client.post(
        "/api/bookings",
        headers=student_headers,
        json={
            "space_id": free_space["id"],
            "start_time": b_start,
            "end_time": b_end,
            "accompanying_count": 1,
            "purpose": "Conflicting attempt",
        },
    )
    assert resp.status_code == 409, f"Expected 409 Conflict, got {resp.status_code}"
    print("[OK] Conflict Prevention: Overlapping booking request rejected with 409 Conflict.")

    # Over-capacity attempt should return 400 Bad Request
    resp = client.post(
        "/api/bookings",
        headers=student_headers,
        json={
            "space_id": free_space["id"],
            "start_time": (now + timedelta(days=4)).isoformat() + "Z",
            "end_time": (now + timedelta(days=4, hours=1)).isoformat() + "Z",
            "accompanying_count": free_space["capacity"] + 10,
            "purpose": "Oversized crowd",
        },
    )
    assert resp.status_code == 400
    print("[OK] Capacity Validation: Over-capacity booking request rejected with 400 Bad Request.")

    # -------------------------------------------------------------
    # 6. Admin Portal: Pending Requests & Decisions
    # -------------------------------------------------------------
    print_test_header("6. Admin Pending Requests & Decision Workflow")
    resp = client.get("/api/admin/pending-requests", headers=admin_headers)
    assert resp.status_code == 200
    pending_list = resp.json()
    print(f"[OK] Admin retrieved {len(pending_list)} pending reservation requests.")
    assert len(pending_list) >= 1

    # Approve the newly created booking
    resp = client.patch(
        f"/api/admin/requests/{new_booking_id}/decision",
        headers=admin_headers,
        json={"action": "approve"},
    )
    assert resp.status_code == 200, f"Approval failed: {resp.text}"
    approved_booking = resp.json()
    print("[OK] Admin Approved booking. New status:", approved_booking["status"])
    assert approved_booking["status"] == "Booked"

    # Check student total_bookings incremented
    resp = client.get("/api/user/dashboard", headers=student_headers)
    assert resp.status_code == 200
    assert resp.json()["user"]["total_bookings"] >= 1
    print("[OK] Student total_bookings automatically incremented upon approval.")

    # Test Admin Allotted History
    resp = client.get("/api/admin/dashboard/allotted-history", headers=admin_headers)
    assert resp.status_code == 200
    history = resp.json()
    print(f"[OK] Admin retrieved {len(history)} allotted/processed reservation records.")
    assert len(history) >= 1

    # Test Admin Profile
    resp = client.get("/api/admin/profile", headers=admin_headers)
    assert resp.status_code == 200
    admin_prof = resp.json()
    print("[OK] Admin Profile retrieved:", admin_prof["name"])
    print(f"  Total Requests Processed: {admin_prof['total_requests_processed']}")

    # -------------------------------------------------------------
    # 7. QR Check-In Verification
    # -------------------------------------------------------------
    print_test_header("7. QR Code Check-in Validation")
    db = SessionLocal()
    # Create a Booked reservation eligible for checkin right now (start_time = now + 2 mins)
    qr_res = Reservation(
        id=uuid.uuid4(),
        user_id=student_auth["user"]["id"],
        space_id=free_space["id"],
        purpose="Live Check-in Test",
        accompanying_count=0,
        start_time=now + timedelta(minutes=2),
        end_time=now + timedelta(hours=1),
        status=ReservationStatus.BOOKED,
    )
    db.add(qr_res)
    db.commit()
    qr_id = qr_res.id
    db.close()

    # Scan QR check-in
    resp = client.post(f"/api/bookings/{qr_id}/scan-qr", headers=student_headers)
    assert resp.status_code == 200, f"QR scan failed: {resp.text}"
    scan_result = resp.json()
    print("[OK] QR Check-in verified successfully:", scan_result["message"])
    assert scan_result["reservation"]["status"] == "Scanned"

    # Too early test: booking 2 hours in the future
    db = SessionLocal()
    future_res = Reservation(
        id=uuid.uuid4(),
        user_id=student_auth["user"]["id"],
        space_id=free_space["id"],
        purpose="Too Early Test",
        accompanying_count=0,
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=3),
        status=ReservationStatus.BOOKED,
    )
    db.add(future_res)
    db.commit()
    future_id = future_res.id
    db.close()

    resp = client.post(f"/api/bookings/{future_id}/scan-qr", headers=student_headers)
    assert resp.status_code == 400
    print("[OK] QR Timing Enforcement: Too-early checkin correctly rejected (400).")

    # -------------------------------------------------------------
    # 8. Background Worker: 15-Min Auto-Release & Standby Rotation
    # -------------------------------------------------------------
    print_test_header("8. 15-Min Auto-Release & 3-Min Standby Rotation")
    db = SessionLocal()
    standby_test_space = spaces[2]  # Use distinct space to avoid collision with test 7
    # Create an unverified Booked reservation that started 20 minutes ago (should auto-expire)
    unclaimed_res = Reservation(
        id=uuid.uuid4(),
        user_id=student_auth["user"]["id"],
        space_id=standby_test_space["id"],
        purpose="Unclaimed No-Show Test",
        accompanying_count=0,
        start_time=now - timedelta(minutes=20),
        end_time=now + timedelta(minutes=40),
        status=ReservationStatus.BOOKED,
    )
    db.add(unclaimed_res)

    # Add a student to StandbyWaitlist for this space and slot
    waitlist_student = StandbyWaitlist(
        id=uuid.uuid4(),
        user_id="STU-2026-003",
        space_id=standby_test_space["id"],
        requested_start=now - timedelta(minutes=20),
        requested_end=now + timedelta(minutes=40),
        is_active=True,
        flash_claim_expires_at=None,
    )
    db.add(waitlist_student)
    db.commit()
    waitlist_id = waitlist_student.id

    # Run maintenance cycle
    stats = process_qr_auto_release_and_standby_rotation(db)
    print("[OK] Maintenance Cycle Executed:", stats)

    # Verify reservation is now Expired
    db.refresh(unclaimed_res)
    print("[OK] Unverified reservation status:", unclaimed_res.status.value)
    assert unclaimed_res.status == ReservationStatus.EXPIRED

    # Verify waitlist student was granted 3-minute flash claim
    db.refresh(waitlist_student)
    assert waitlist_student.flash_claim_expires_at is not None
    print(f"[OK] Dynamic Standby Rotation: Waitlisted user granted 3-minute flash claim until {waitlist_student.flash_claim_expires_at}Z!")

    # Student 2 Auth via Dev Bypass to flash claim
    resp = client.post(
        "/api/auth/google",
        json={"dev_bypass_email": "priya.sharma@campus.edu", "dev_role": "student"},
    )
    student2_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Student 2 claims the released room via Flash Claim
    resp = client.post(f"/api/standby/{waitlist_id}/flash-claim", headers=student2_headers)
    assert resp.status_code == 200, f"Flash claim failed: {resp.text}"
    claimed_res = resp.json()
    print("[OK] Flash Claim Succeeded! Room allotted to waitlisted student:", claimed_res["status"])
    assert claimed_res["status"] == "Booked"

    db.close()

    print_test_header("ALL TESTS PASSED WITH 100% SUCCESS!")


if __name__ == "__main__":
    run_all_tests()
