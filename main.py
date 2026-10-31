import os
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, status, Response, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, or_, and_
from sqlalchemy.orm import Session, joinedload

from database import engine, Base, get_db, SessionLocal
from models import (
    User,
    UserRole,
    Space,
    AcousticProfile,
    Reservation,
    ReservationStatus,
    StandbyWaitlist,
)
from schemas import (
    UserResponse,
    SpaceResponse,
    OccupiedSpaceResponse,
    ReservationCreate,
    ReservationResponse,
    StandbyJoinRequest,
    StandbyResponse,
    RoomSearchResponse,
    UserDashboardResponse,
    AdminDecisionRequest,
    AdminHistoryItemResponse,
    AdminProfileResponse,
    QRScanResponse,
    QRScanRequest,
    AIParsedBookingRequest,
    AIParsedBookingResponse,
)
from auth import auth_router, get_current_user, require_admin
from background_tasks import (
    start_scheduler,
    stop_scheduler,
    process_qr_auto_release_and_standby_rotation,
)
from ml_engine import suggest_optimal_slots
from seed_data import seed_database

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("campus_api")


import pytz

IST = pytz.timezone('Asia/Kolkata')


def get_ist_now() -> datetime:
    """Returns current Indian Standard Time (Asia/Kolkata) as naive datetime."""
    return datetime.now(IST).replace(tzinfo=None)


def to_naive_utc(dt: datetime) -> datetime:
    """Normalizes any datetime to naive IST (Asia/Kolkata) for consistent database comparisons."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(IST).replace(tzinfo=None)
    return dt


to_naive_ist = to_naive_utc


def classify_reservation(res: Reservation, now: Optional[datetime] = None) -> str:
    """
    Classification rule, applied in ONE place and reused by dashboard and history:
    ACTIVE = status in (Booked, Pending_Permission, Scanned) AND end_time > get_ist_now()
    HISTORY = status in (Cancelled, Denied, Expired) OR end_time <= get_ist_now()
    A Scanned reservation must NEVER go to history because of its status alone.
    """
    if now is None:
        now = get_ist_now()

    active_statuses = {
        ReservationStatus.BOOKED,
        ReservationStatus.PENDING_PERMISSION,
        ReservationStatus.SCANNED,
    }

    if res.status in active_statuses and res.end_time > now:
        return "ACTIVE"
    return "HISTORY"


# =====================================================================
# Lifespan Context Manager (Startup & Shutdown)
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and auto-seed if empty
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Safe column migration for SQLite
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN urgent_requests_used INTEGER DEFAULT 0"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN is_urgent BOOLEAN DEFAULT 0"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN last_scanned_at DATETIME"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Column migration check note: {e}")

    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    except Exception as e:
        logger.error(f"Auto-seed error on startup: {e}")
    finally:
        db.close()

    # Start APScheduler background worker
    start_scheduler()
    yield

    # Shutdown: Stop APScheduler cleanly
    stop_scheduler()


# =====================================================================
# FastAPI Application Initialization
# =====================================================================
app = FastAPI(
    title="Campus Resource Management API",
    description="AI-powered Campus Resource Management & Room Allotment Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware (Fully open so frontend connects seamlessly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cache_control_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Include Authentication Router
app.include_router(auth_router)


# =====================================================================
# General / Health / Dev Endpoints
# =====================================================================
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "AI Campus Resource Management API",
        "timestamp": get_ist_now().isoformat(),
        "version": "2.0.0",
    }


@app.get("/", include_in_schema=False)
@app.get("/app", include_in_schema=False)
def serve_frontend():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend index.html not found"}


@app.get("/api/spaces", response_model=List[SpaceResponse], tags=["Spaces"])
def list_spaces(db: Session = Depends(get_db)):
    """Lists all available spaces / rooms on campus."""
    spaces = db.query(Space).order_by(Space.name.asc()).all()
    return spaces


@app.get("/api/rooms/live-status", tags=["Spaces"])
def get_rooms_live_status(response: Response, db: Session = Depends(get_db)):
    """
    Returns real-time occupancy status for all campus spaces.
    Identifies whether each space is currently 'Vacant / Free' or 'Occupied / In-Use',
    along with occupant and upcoming scheduled booking.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    now = get_ist_now()
    spaces = db.query(Space).order_by(Space.name.asc()).all()

    active_statuses = [ReservationStatus.BOOKED, ReservationStatus.SCANNED]

    result = []
    for s in spaces:
        current_res = (
            db.query(Reservation)
            .options(joinedload(Reservation.user))
            .filter(
                Reservation.space_id == s.id,
                Reservation.status.in_(active_statuses),
                Reservation.start_time <= now + timedelta(minutes=15),
                Reservation.end_time > now,
            )
            .order_by(Reservation.start_time.asc())
            .first()
        )

        next_res = (
            db.query(Reservation)
            .options(joinedload(Reservation.user))
            .filter(
                Reservation.space_id == s.id,
                Reservation.status.in_(active_statuses),
                Reservation.start_time > now + timedelta(minutes=15),
            )
            .order_by(Reservation.start_time.asc())
            .first()
        )

        curr_data = None
        if current_res:
            curr_data = {
                "id": str(current_res.id),
                "user_name": current_res.user.name if current_res.user else "Student",
                "purpose": current_res.purpose,
                "start_time": current_res.start_time.isoformat(),
                "end_time": current_res.end_time.isoformat(),
                "status": current_res.status.value,
                "is_urgent": getattr(current_res, "is_urgent", False),
            }

        next_data = None
        if next_res:
            next_data = {
                "id": str(next_res.id),
                "user_name": next_res.user.name if next_res.user else "Student",
                "purpose": next_res.purpose,
                "start_time": next_res.start_time.isoformat(),
                "end_time": next_res.end_time.isoformat(),
                "status": next_res.status.value,
                "is_urgent": getattr(next_res, "is_urgent", False),
            }

        result.append({
            "id": str(s.id),
            "name": s.name,
            "capacity": s.capacity,
            "acoustic_profile": s.acoustic_profile.value,
            "is_occupied": current_res is not None,
            "current_reservation": curr_data,
            "next_reservation": next_data,
        })

    return result


@app.post("/api/dev/seed", tags=["Developer Tools"])
def trigger_seed(
    force_reset: bool = Query(False, description="Drop and recreate database before seeding"),
    db: Session = Depends(get_db),
):
    """Populates or resets the database with realistic rooms, users, and reservations."""
    result = seed_database(db, force_reset=force_reset)
    return result


@app.post("/api/dev/trigger-maintenance", tags=["Developer Tools"])
def trigger_maintenance_cycle(db: Session = Depends(get_db)):
    """Manually triggers the 15-min QR auto-release and standby rotation cycle."""
    stats = process_qr_auto_release_and_standby_rotation(db)
    return {"message": "Maintenance cycle executed successfully", "stats": stats}


# =====================================================================
# Student / User Endpoints
# =====================================================================
@app.get("/api/user/dashboard", response_model=UserDashboardResponse, tags=["Student Portal"])
def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns user profile (name, email, photo_url, total_bookings),
    active bookings, past history grouped by status, and active standby waitlists.
    """
    now = get_ist_now()

    # Fetch user's reservations with space relations
    reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.space))
        .filter(Reservation.user_id == current_user.id)
        .order_by(Reservation.start_time.desc())
        .all()
    )

    # Classification rule applied in ONE place and reused by dashboard and history:
    # ACTIVE = status in (Booked, Pending_Permission, Scanned) AND end_time > get_ist_now()
    # HISTORY = status in (Cancelled, Denied, Expired) OR end_time <= get_ist_now()
    # A Scanned reservation must NEVER go to history because of its status alone.
    active_reservations = []
    history_reservations = []

    for res in reservations:
        if classify_reservation(res, now) == "ACTIVE":
            active_reservations.append(res)
        else:
            history_reservations.append(res)

    # Group history: Remove 'Scanned' from any history-by-status list!
    grouped_history = {
        "All": [ReservationResponse.model_validate(r) for r in history_reservations],
        "Completed": [
            ReservationResponse.model_validate(r) for r in history_reservations
            if r.status not in [ReservationStatus.EXPIRED, ReservationStatus.DENIED]
        ],
        ReservationStatus.EXPIRED.value: [
            ReservationResponse.model_validate(r) for r in history_reservations
            if r.status == ReservationStatus.EXPIRED
        ],
        ReservationStatus.DENIED.value: [
            ReservationResponse.model_validate(r) for r in history_reservations
            if r.status == ReservationStatus.DENIED
        ],
    }

    # Fetch active standby waitlists
    waitlists = (
        db.query(StandbyWaitlist)
        .options(joinedload(StandbyWaitlist.space))
        .filter(
            StandbyWaitlist.user_id == current_user.id,
            StandbyWaitlist.is_active == True,
        )
        .order_by(StandbyWaitlist.created_at.desc())
        .all()
    )

    validated_active = [ReservationResponse.model_validate(r) for r in active_reservations]
    validated_history = [ReservationResponse.model_validate(r) for r in history_reservations]

    return UserDashboardResponse(
        user=UserResponse.model_validate(current_user),
        active_bookings=validated_active,
        active_reservations=validated_active,
        history=validated_history,
        history_by_status=grouped_history,
        standby_waitlists=[StandbyResponse.model_validate(w) for w in waitlists],
    )


@app.get("/api/rooms/search", response_model=RoomSearchResponse, tags=["Student Portal"])
def search_rooms(
    capacity: int = Query(..., gt=0, description="Minimum room capacity (1-100)"),
    start_time: datetime = Query(..., description="Desired start time (ISO 8601)"),
    end_time: datetime = Query(..., description="Desired end time (ISO 8601)"),
    acoustic_profile: Optional[AcousticProfile] = Query(None, description="Acoustic environment preference"),
    db: Session = Depends(get_db),
):
    """
    Conflict-Free Search with Smart ML Fallback:
    1. Queries Space where capacity >= requested and acoustic_profile == requested (if provided),
       excluding rooms with conflicting reservations (status IN Pending_Permission, Booked, Scanned).
    2. Smart ML Fallback: If 0 rooms are available, invokes scikit-learn regression
       to suggest optimal alternative time slots.
    """
    start_utc = to_naive_utc(start_time)
    end_utc = to_naive_utc(end_time)

    now_utc = get_ist_now()
    if start_utc < now_utc - timedelta(minutes=2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time cannot be in the past. Please select a future date and time.",
        )

    if end_utc <= start_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time.",
        )

    if capacity > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of people cannot exceed the maximum limit of 100.",
        )

    if capacity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be at least 1 person.",
        )

    # Statuses that lock a room
    blocking_statuses = [
        ReservationStatus.PENDING_PERMISSION,
        ReservationStatus.BOOKED,
        ReservationStatus.SCANNED,
    ]

    # Subquery: Space IDs with overlapping reservations
    busy_space_ids = {
        r.space_id
        for r in db.query(Reservation.space_id)
        .filter(
            Reservation.status.in_(blocking_statuses),
            Reservation.start_time < end_utc,
            Reservation.end_time > start_utc,
        )
        .all()
    }

    # Query matching and free spaces
    available_rooms_query = (
        db.query(Space)
        .filter(
            Space.capacity >= capacity,
            Space.acoustic_profile == acoustic_profile if acoustic_profile else True,
        )
    )

    if busy_space_ids:
        available_rooms_query = available_rooms_query.filter(~Space.id.in_(busy_space_ids))

    available_rooms = available_rooms_query.all()

    # Query matching occupied spaces for standby waitlist and urgent override
    occupied_rooms = []
    if busy_space_ids:
        occ_query = (
            db.query(Space)
            .filter(
                Space.capacity >= capacity,
                Space.acoustic_profile == acoustic_profile if acoustic_profile else True,
                Space.id.in_(busy_space_ids),
            )
            .all()
        )
        for s in occ_query:
            conf_res = (
                db.query(Reservation)
                .options(joinedload(Reservation.user))
                .filter(
                    Reservation.space_id == s.id,
                    Reservation.status.in_(blocking_statuses),
                    Reservation.start_time < end_utc,
                    Reservation.end_time > start_utc,
                )
                .order_by(Reservation.start_time.asc())
                .first()
            )
            occupied_rooms.append(
                OccupiedSpaceResponse(
                    id=s.id,
                    name=s.name,
                    capacity=s.capacity,
                    acoustic_profile=s.acoustic_profile,
                    conflicting_status=conf_res.status.value if conf_res else "Booked",
                    current_occupant=conf_res.user.name if (conf_res and conf_res.user) else None,
                    conflicting_start=conf_res.start_time if conf_res else None,
                    conflicting_end=conf_res.end_time if conf_res else None,
                )
            )

    if available_rooms:
        return RoomSearchResponse(
            available_rooms=[SpaceResponse.model_validate(s) for s in available_rooms],
            occupied_rooms=occupied_rooms,
            ml_suggested_slots=[],
        )

    # 0 rooms available -> Trigger ML Smart Slot Suggester Fallback
    logger.info(
        f"0 rooms free for window [{start_utc} - {end_utc}], capacity={capacity}, acoustic={acoustic_profile}. "
        "Invoking ML Smart Slot Suggester..."
    )
    suggested_slots = suggest_optimal_slots(
        db=db,
        requested_capacity=capacity,
        requested_start=start_utc,
        requested_end=end_utc,
        acoustic_profile=acoustic_profile,
        limit=3,
    )

    return RoomSearchResponse(
        available_rooms=[],
        occupied_rooms=occupied_rooms,
        ml_suggested_slots=suggested_slots,
    )


@app.post("/api/bookings", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED, tags=["Student Portal"])
def create_booking(
    payload: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a reservation request. Checks room capacity and conflicts.
    Saves reservation with initial status 'Pending_Permission'.
    """
    start_utc = to_naive_utc(payload.start_time)
    end_utc = to_naive_utc(payload.end_time)

    now = get_ist_now()
    if start_utc < now - timedelta(minutes=15):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time cannot be in the past. Please select a future date and time.",
        )

    if end_utc <= start_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time.",
        )

    # Verify space exists
    space = db.query(Space).filter(Space.id == payload.space_id).first()
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested space does not exist",
        )

    students_list = [s.model_dump() for s in payload.accompanying_students] if payload.accompanying_students else []
    accompanying_count = len(students_list) if students_list else payload.accompanying_count

    # Check capacity against party size (student + accompanying)
    total_party_size = 1 + accompanying_count
    if space.capacity < total_party_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Party size ({total_party_size}) exceeds space capacity ({space.capacity})",
        )

    # Conflict-Free check
    blocking_statuses = [
        ReservationStatus.PENDING_PERMISSION,
        ReservationStatus.BOOKED,
        ReservationStatus.SCANNED,
    ]
    conflicting_res = (
        db.query(Reservation)
        .filter(
            Reservation.space_id == payload.space_id,
            Reservation.status.in_(blocking_statuses),
            Reservation.start_time < end_utc,
            Reservation.end_time > start_utc,
        )
        .first()
    )

    if conflicting_res:
        if payload.is_urgent:
            if current_user.urgent_requests_used >= 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Monthly urgent request quota (3/3) exhausted.",
                )
            if conflicting_res.status == ReservationStatus.SCANNED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Room is already physically checked into (Scanned) and cannot be overridden.",
                )
            # Route urgent override request to Faculty/Admin Pending queue
            current_user.urgent_requests_used += 1
            booking_status = ReservationStatus.PENDING_PERMISSION
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This space is already reserved for the selected timeframe. An urgent override request is required.",
            )
    else:
        # NO CONFLICT: Empty room ALWAYS auto-approves to BOOKED immediately!
        booking_status = ReservationStatus.BOOKED
        current_user.total_bookings += 1

    reservation = Reservation(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=payload.space_id,
        purpose=payload.purpose,
        accompanying_count=accompanying_count,
        accompanying_students=students_list,
        start_time=start_utc,
        end_time=end_utc,
        status=booking_status,
        is_urgent=payload.is_urgent,
        created_at=now,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    return ReservationResponse.model_validate(reservation)


@app.post("/api/bookings/{reservation_id}/scan-qr", response_model=QRScanResponse, tags=["Student Portal"])
def scan_qr_checkin(
    reservation_id: uuid.UUID,
    payload: Optional[dict] = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    QR Check-in verification:
    Validates that:
    1. Scanned QR matches the booked room space_id.
    2. Reservation belongs to student (or admin).
    Immediately updates status to 'Scanned'.
    """
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.space), joinedload(Reservation.user))
        .filter(Reservation.id == reservation_id)
        .first()
    )

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )

    # Permission check: owner or admin
    if reservation.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to check into this reservation",
        )

    # Strict QR room match verification
    if payload:
        scanned_space_id = payload.get("scanned_space_id") or payload.get("space_id")
        if scanned_space_id:
            scanned_str = str(scanned_space_id).strip().lower()
            res_space_str = str(reservation.space_id).strip().lower()

            matched = (scanned_str == res_space_str)
            if not matched:
                all_spaces = db.query(Space).order_by(Space.name.asc()).all()
                for idx, s in enumerate(all_spaces):
                    if (scanned_str == str(idx + 1) or scanned_str == f"room_{idx + 1}") and s.id == reservation.space_id:
                        matched = True
                        break

            if not matched:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Wrong Room QR Scanned! Expected room #{reservation.space_id}.",
                )

    # Validate status: if already scanned, update last_scanned_at
    if reservation.status == ReservationStatus.SCANNED:
        reservation.last_scanned_at = get_ist_now()
        db.commit()
        db.refresh(reservation)
        return QRScanResponse(
            message=f"Re-verification scan confirmed for {reservation.space.name}! Occupancy maintained.",
            reservation=ReservationResponse.model_validate(reservation),
        )

    # Immediately flip status to SCANNED
    reservation.status = ReservationStatus.SCANNED
    reservation.last_scanned_at = get_ist_now()
    db.commit()
    db.refresh(reservation)

    return QRScanResponse(
        message=f"Check-in verified successfully! Welcome to {reservation.space.name}.",
        reservation=ReservationResponse.model_validate(reservation),
    )


@app.post("/api/standby/join", response_model=StandbyResponse, status_code=status.HTTP_201_CREATED, tags=["Student Portal"])
def join_standby_waitlist(
    payload: StandbyJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows a student to join the StandbyWaitlist for a congested room and time slot."""
    start_utc = to_naive_utc(payload.requested_start)
    end_utc = to_naive_utc(payload.requested_end)

    space = db.query(Space).filter(Space.id == payload.space_id).first()
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified space does not exist",
        )

    # Check if user already actively waitlisted for this space and overlapping slot
    existing = (
        db.query(StandbyWaitlist)
        .filter(
            StandbyWaitlist.user_id == current_user.id,
            StandbyWaitlist.space_id == payload.space_id,
            StandbyWaitlist.is_active == True,
            StandbyWaitlist.requested_start < end_utc,
            StandbyWaitlist.requested_end > start_utc,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active waitlist request for this room and time window.",
        )

    waitlist_entry = StandbyWaitlist(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=payload.space_id,
        requested_start=start_utc,
        requested_end=end_utc,
        flash_claim_expires_at=None,
        is_active=True,
        created_at=get_ist_now(),
    )
    db.add(waitlist_entry)
    db.commit()
    db.refresh(waitlist_entry)

    return StandbyResponse.model_validate(waitlist_entry)


@app.post("/api/standby/{waitlist_id}/flash-claim", response_model=ReservationResponse, tags=["Student Portal"])
def flash_claim_room(
    waitlist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows a waitlisted student to flash-claim an auto-released room
    within their active 3-minute window.
    """
    waitlist_entry = (
        db.query(StandbyWaitlist)
        .filter(StandbyWaitlist.id == waitlist_id)
        .first()
    )

    if not waitlist_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Waitlist entry not found",
        )

    if waitlist_entry.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to claim this waitlist offer",
        )

    if not waitlist_entry.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This standby waitlist entry is no longer active",
        )

    now = get_ist_now()
    if not waitlist_entry.flash_claim_expires_at or now > waitlist_entry.flash_claim_expires_at:
        waitlist_entry.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flash claim window has expired. The room was rotated to the next waitlisted user.",
        )

    # Double check no conflicting reservation took the slot
    conflicting = (
        db.query(Reservation)
        .filter(
            Reservation.space_id == waitlist_entry.space_id,
            Reservation.status.in_([ReservationStatus.BOOKED, ReservationStatus.SCANNED]),
            Reservation.start_time < waitlist_entry.requested_end,
            Reservation.end_time > waitlist_entry.requested_start,
        )
        .first()
    )
    if conflicting:
        waitlist_entry.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is no longer available for this time window",
        )

    # Create Booked reservation
    claimed_reservation = Reservation(
        id=uuid.uuid4(),
        user_id=waitlist_entry.user_id,
        space_id=waitlist_entry.space_id,
        purpose="Claimed via Dynamic Standby Flash Claim",
        accompanying_count=0,
        start_time=waitlist_entry.requested_start,
        end_time=waitlist_entry.requested_end,
        status=ReservationStatus.BOOKED,
        created_at=get_ist_now(),
    )
    db.add(claimed_reservation)

    # Deactivate waitlist entry & increment student total_bookings
    waitlist_entry.is_active = False
    current_user.total_bookings += 1

    db.commit()
    db.refresh(claimed_reservation)

    return ReservationResponse.model_validate(claimed_reservation)


# =====================================================================
# Admin Portal Endpoints (Protected by require_admin)
# =====================================================================
@app.get("/api/admin/dashboard/allotted-history", response_model=List[AdminHistoryItemResponse], tags=["Admin Portal"])
def get_allotted_history(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    (For Admin Dashboard Tab)
    Returns full history of all allotted/processed rooms
    (status IN 'Booked', 'Scanned', 'Expired'), including student name, email,
    photo_url, room name, purpose, and timestamps.
    """
    processed_statuses = [
        ReservationStatus.BOOKED,
        ReservationStatus.SCANNED,
        ReservationStatus.EXPIRED,
        ReservationStatus.DENIED,
    ]

    reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.user), joinedload(Reservation.space))
        .filter(Reservation.status.in_(processed_statuses))
        .order_by(Reservation.start_time.desc())
        .all()
    )

    items = []
    for r in reservations:
        items.append(
            AdminHistoryItemResponse(
                reservation_id=r.id,
                student_id=r.user.id if r.user else "N/A",
                student_name=r.user.name if r.user else "Unknown Student",
                student_email=r.user.email if r.user else "unknown@campus.edu",
                student_photo_url=r.user.photo_url if r.user else None,
                room_id=r.space.id if r.space else uuid.UUID(int=0),
                room_name=r.space.name if r.space else "Unknown Room",
                capacity=r.space.capacity if r.space else 0,
                acoustic_profile=r.space.acoustic_profile if r.space else AcousticProfile.COLLABORATIVE,
                purpose=r.purpose,
                accompanying_count=r.accompanying_count,
                accompanying_students=r.accompanying_students or [],
                start_time=r.start_time,
                end_time=r.end_time,
                status=r.status,
                is_urgent=r.is_urgent,
                created_at=r.created_at,
            )
        )
    return items


@app.get("/api/admin/pending-requests", response_model=List[ReservationResponse], tags=["Admin Portal"])
def get_pending_requests(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    (For Admin Pending Request Page)
    Returns all reservations currently in 'Pending_Permission' status,
    ordered with urgent requests first, then start_time ascending.
    """
    pending = (
        db.query(Reservation)
        .options(joinedload(Reservation.user), joinedload(Reservation.space))
        .filter(Reservation.status == ReservationStatus.PENDING_PERMISSION)
        .order_by(Reservation.is_urgent.desc(), Reservation.start_time.asc())
        .all()
    )
    return [ReservationResponse.model_validate(r) for r in pending]


@app.patch("/api/admin/requests/{reservation_id}/decision", response_model=ReservationResponse, tags=["Admin Portal"])
def admin_make_decision(
    reservation_id: uuid.UUID,
    payload: AdminDecisionRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin Approve or Deny Decision:
    - If 'approve': Re-verify no conflicting 'Booked' reservation exists for that room/time.
      Sets status to 'Booked', and increments student's User.total_bookings += 1.
    - If 'deny': Sets status to 'Denied'.
    """
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.user), joinedload(Reservation.space))
        .filter(Reservation.id == reservation_id)
        .first()
    )

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )

    if payload.action == "approve":
        if reservation.status != ReservationStatus.PENDING_PERMISSION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve reservation already in '{reservation.status.value}' state",
            )

        # Conflict check against any existing Booked or Scanned reservation
        conflicting = (
            db.query(Reservation)
            .filter(
                Reservation.space_id == reservation.space_id,
                Reservation.id != reservation.id,
                Reservation.status.in_([ReservationStatus.BOOKED, ReservationStatus.SCANNED]),
                Reservation.start_time < reservation.end_time,
                Reservation.end_time > reservation.start_time,
            )
            .first()
        )
        if conflicting:
            if reservation.is_urgent and conflicting.status == ReservationStatus.BOOKED:
                # Urgent override: automatically displace previous un-scanned booking
                conflicting.status = ReservationStatus.DENIED
                c_student = db.query(User).filter(User.id == conflicting.user_id).first()
                if c_student and c_student.total_bookings > 0:
                    c_student.total_bookings -= 1
                logger.info(f"Admin approved urgent reservation {reservation.id}, auto-cancelling un-scanned reservation {conflicting.id}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot approve: a conflicting reservation was already booked for this space and timeframe.",
                )

        reservation.status = ReservationStatus.BOOKED

        # Increment student's total_bookings
        student = db.query(User).filter(User.id == reservation.user_id).first()
        if student:
            student.total_bookings += 1

    elif payload.action in ("deny", "cancel"):
        if reservation.status not in (
            ReservationStatus.PENDING_PERMISSION,
            ReservationStatus.BOOKED,
            ReservationStatus.SCANNED,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel reservation in '{reservation.status.value}' state",
            )

        # If cancelling an already approved or checked-in reservation, decrement student total_bookings
        if reservation.status in (ReservationStatus.BOOKED, ReservationStatus.SCANNED):
            student = db.query(User).filter(User.id == reservation.user_id).first()
            if student and student.total_bookings > 0:
                student.total_bookings -= 1

        # If cancelling/denying an urgent request, refund student's monthly urgency quota
        if reservation.is_urgent:
            student = db.query(User).filter(User.id == reservation.user_id).first()
            if student and student.urgent_requests_used > 0:
                student.urgent_requests_used -= 1

        reservation.status = ReservationStatus.DENIED

    db.commit()
    db.refresh(reservation)

    return ReservationResponse.model_validate(reservation)


@app.get("/api/admin/profile", response_model=AdminProfileResponse, tags=["Admin Portal"])
def get_admin_profile(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    (For Admin Profile Tab)
    Returns admin's photo_url, name, email, role, personal bookings,
    and total count of requests processed across campus.
    """
    processed_count = (
        db.query(Reservation)
        .filter(
            Reservation.status.in_([
                ReservationStatus.BOOKED,
                ReservationStatus.DENIED,
                ReservationStatus.SCANNED,
                ReservationStatus.EXPIRED,
            ])
        )
        .count()
    )

    return AdminProfileResponse(
        id=admin.id,
        photo_url=admin.photo_url,
        name=admin.name,
        email=admin.email,
        role=admin.role,
        personal_bookings=admin.total_bookings,
        total_requests_processed=processed_count,
    )


# =====================================================================
# Admin Convenience Aliases
# =====================================================================
@app.get("/api/admin/pending", response_model=List[ReservationResponse], tags=["Admin Portal"])
def get_pending_requests_alias(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_pending_requests(admin=admin, db=db)


@app.get("/api/admin/history", tags=["Admin Portal"])
def get_admin_history_alias(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = get_allotted_history(admin=admin, db=db)
    return {
        "total_reservations": len(items),
        "items": [item.model_dump() if hasattr(item, "model_dump") else item for item in items],
        "by_status": {
            "Booked": sum(1 for i in items if i.status == ReservationStatus.BOOKED),
            "Scanned": sum(1 for i in items if i.status == ReservationStatus.SCANNED),
            "Expired": sum(1 for i in items if i.status == ReservationStatus.EXPIRED),
            "Denied": sum(1 for i in items if i.status == ReservationStatus.DENIED),
        },
    }


@app.post("/api/admin/approve/{reservation_id}", response_model=ReservationResponse, tags=["Admin Portal"])
def admin_approve_request(
    reservation_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_make_decision(
        reservation_id=reservation_id,
        payload=AdminDecisionRequest(action="approve"),
        admin=admin,
        db=db,
    )


@app.post("/api/admin/deny/{reservation_id}", response_model=ReservationResponse, tags=["Admin Portal"])
def admin_deny_request(
    reservation_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_make_decision(
        reservation_id=reservation_id,
        payload=AdminDecisionRequest(action="deny"),
        admin=admin,
        db=db,
    )


@app.post("/api/admin/reservations/{reservation_id}/cancel", response_model=ReservationResponse, tags=["Admin Portal"])
def admin_cancel_reservation(
    reservation_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Dedicated endpoint for Admin to cancel/revoke an active or pending reservation.
    Decrements student's total_bookings if already approved/scanned and releases room.
    """
    return admin_make_decision(
        reservation_id=reservation_id,
        payload=AdminDecisionRequest(action="cancel"),
        admin=admin,
        db=db,
    )


@app.post("/api/admin/reservations/cancel-all", tags=["Admin Portal"])
def admin_cancel_all_reservations(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Wipes/cancels all reservations, resets all users' total_bookings and urgent_requests_used.
    Ensures all 6 campus rooms become 100% Free/Available immediately.
    """
    db.query(Reservation).delete()
    db.query(StandbyWaitlist).delete()
    db.query(User).update({User.total_bookings: 0, User.urgent_requests_used: 0})
    db.commit()
    return {"message": "All campus reservations have been successfully cancelled. All rooms are now 100% Free/Available."}


# =====================================================================
# AI Natural Language Quick Book Engine
# =====================================================================
@app.post("/api/ai/parse-booking", response_model=AIParsedBookingResponse, tags=["AI Engine"])
def ai_parse_booking(
    payload: AIParsedBookingRequest,
    db: Session = Depends(get_db),
):
    """
    Parses conversational natural language booking instructions:
    e.g. "Book a silent room for 3 people tomorrow at 3 PM for project discussion"
    Extracts capacity, acoustic profile, start/end time, purpose, finds the best
    available matching room, and IMMEDIATELY creates the Booked reservation!
    """
    text = payload.prompt.strip().lower()
    now = get_ist_now()

    # 1. Capacity Extraction
    import re
    cap_match = re.search(r'(?:for\s+)?(\d+)\s*(?:people|person|students?|attendees?|seats?|members?)', text)
    if not cap_match:
        cap_match = re.search(r'capacity\s*(?:of\s*)?(\d+)', text)
    capacity = int(cap_match.group(1)) if cap_match else 1

    # 2. Acoustic Profile Extraction
    acoustic_profile = "Collaborative"
    if any(k in text for k in ["silent", "quiet", "pod", "focus", "study pod"]):
        acoustic_profile = "Silent"
    elif any(k in text for k in ["amplified", "lecture", "audio", "mic", "seminar", "presentation", "auditorium"]):
        acoustic_profile = "Amplified"
    elif any(k in text for k in ["collaborative", "collab", "group", "discussion", "team", "sprint"]):
        acoustic_profile = "Collaborative"

    # 3. Date Resolution
    target_date = now.date()
    if "tomorrow" in text:
        target_date = (now + timedelta(days=1)).date()
    elif "day after tomorrow" in text:
        target_date = (now + timedelta(days=2)).date()

    # 4. Time Resolution (Only match explicit clock times)
    hour = None
    minute = 0
    time_match = re.search(r'\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\b', text)
    if time_match:
        if time_match.group(1):
            h = int(time_match.group(1))
            m = int(time_match.group(2)) if time_match.group(2) else 0
            meridiem = time_match.group(3)
        elif time_match.group(4):
            h = int(time_match.group(4))
            m = int(time_match.group(5)) if time_match.group(5) else 0
            meridiem = time_match.group(6)
        else:
            h = int(time_match.group(7))
            m = int(time_match.group(8)) if time_match.group(8) else 0
            meridiem = None

        if meridiem == "pm" and h < 12:
            h += 12
        elif meridiem == "am" and h == 12:
            h = 0
        elif not meridiem and h < 7:  # Assume afternoon if 1-6 without am/pm
            h += 12
        hour, minute = h, m

    rel_match = re.search(r'in\s+(\d+)\s*hours?', text)
    if rel_match:
        rel_hrs = int(rel_match.group(1))
        future_time = now + timedelta(hours=rel_hrs)
        target_date = future_time.date()
        hour = future_time.hour
        minute = future_time.minute
    elif "now" in text or hour is None:
        # Default to now (local time)
        hour = now.hour
        minute = now.minute

    start_dt = datetime(target_date.year, target_date.month, target_date.day, hour, minute)
    if "now" not in text and start_dt < (now - timedelta(minutes=15)) and "tomorrow" not in text and target_date == now.date():
        start_dt += timedelta(days=1)

    duration_match = re.search(r'(?:for\s+)?(\d+)\s*(?:hours?|hrs?)', text)
    duration_hrs = int(duration_match.group(1)) if duration_match else 1
    end_dt = start_dt + timedelta(hours=duration_hrs)

    # 5. Purpose Extraction (Strip duration, headcount, and filler FIRST)
    cleaned_prompt = payload.prompt
    cleaned_prompt = re.sub(r'(?:for\s+)?\d+\s*(?:hours?|hrs?|minutes?|mins?)', '', cleaned_prompt, flags=re.IGNORECASE)
    cleaned_prompt = re.sub(r'(?:for\s+)?\d+\s*(?:people|person|students?|attendees?|seats?|members?)', '', cleaned_prompt, flags=re.IGNORECASE)
    cleaned_prompt = re.sub(r'capacity\s*(?:of\s*)?\d+', '', cleaned_prompt, flags=re.IGNORECASE)
    cleaned_prompt = re.sub(r'for\s+(?:me|us|myself)', '', cleaned_prompt, flags=re.IGNORECASE)

    purpose = "Collaborative Academic Project Session"
    purpose_matches = list(re.finditer(r'for\s+([a-zA-Z0-9\s&_\-]+?)(?:\s+(?:tomorrow|today|tonight|now|at\s+\d+|in\s+\d+)|$)', cleaned_prompt, re.IGNORECASE))
    if purpose_matches:
        candidate = purpose_matches[-1].group(1).strip()
        if candidate and candidate.lower() not in ["a", "an", "the", "room", "space"]:
            purpose = candidate.title() if len(candidate) > 3 else candidate.upper()

    # Find Available Space & Directly Book It
    blocking_statuses = [
        ReservationStatus.PENDING_PERMISSION,
        ReservationStatus.BOOKED,
        ReservationStatus.SCANNED,
    ]
    busy_space_ids = {
        r.space_id
        for r in db.query(Reservation.space_id)
        .filter(
            Reservation.status.in_(blocking_statuses),
            Reservation.start_time < end_dt,
            Reservation.end_time > start_dt,
        )
        .all()
    }

    match_query = db.query(Space).filter(
        Space.capacity >= capacity,
        Space.acoustic_profile == acoustic_profile,
    )
    if busy_space_ids:
        match_query = match_query.filter(~Space.id.in_(busy_space_ids))
    best_room = match_query.order_by(Space.capacity.asc()).first()

    if not best_room:
        fallback_query = db.query(Space).filter(Space.capacity >= capacity)
        if busy_space_ids:
            fallback_query = fallback_query.filter(~Space.id.in_(busy_space_ids))
        best_room = fallback_query.order_by(Space.capacity.asc()).first()

    if best_room:
        user = db.query(User).filter(User.role == UserRole.STUDENT).first()
        if not user:
            user = db.query(User).first()
        user_id = user.id if user else "student"

        new_res = Reservation(
            id=uuid.uuid4(),
            user_id=user_id,
            space_id=best_room.id,
            purpose=purpose,
            accompanying_count=max(0, capacity - 1),
            accompanying_students=[],
            start_time=start_dt,
            end_time=end_dt,
            status=ReservationStatus.BOOKED,
            is_urgent=False,
            created_at=get_ist_now(),
        )
        if user:
            user.total_bookings += 1
        db.add(new_res)
        db.commit()
        db.refresh(new_res)

        summary_text = f"{best_room.name} ({capacity} pax, {best_room.acoustic_profile.value}) • {start_dt.strftime('%b %d, %I:%M %p')} - {end_dt.strftime('%I:%M %p')}"

        return AIParsedBookingResponse(
            success=True,
            booked_room=best_room.name,
            reservation_id=str(new_res.id),
            capacity=capacity,
            acoustic_profile=best_room.acoustic_profile.value,
            start_time=start_dt,
            end_time=end_dt,
            purpose=purpose,
            summary=summary_text,
            message=f"Successfully auto-booked {best_room.name}!",
        )
    else:
        return AIParsedBookingResponse(
            success=False,
            capacity=capacity,
            acoustic_profile=acoustic_profile,
            start_time=start_dt,
            end_time=end_dt,
            purpose=purpose,
            summary=f"No rooms free for {capacity} people at {start_dt.strftime('%b %d, %I:%M %p')}",
            message="All campus rooms matching this request are reserved during this slot.",
        )


