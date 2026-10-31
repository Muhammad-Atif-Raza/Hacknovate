# AI-Powered Campus Resource Management & Optimization Platform

> **Hacknovate Solution**: In the domain of Digital and Civic tech, campus spaces and equipment are frequently locked up through informal channels (WhatsApp chats, verbal agreements, or paper registers), resulting in three major issues:
> - **Double-bookings**: Multiple clubs or batches claiming the same room simultaneously.
> - **Ghost bookings**: Spaces reserved on paper that are completely empty.
> - **Zero transparency**: Students and staff have no easy way to check real-time availability.
>
> This platform centralises the reservation, verification, monitoring, and allocation of campus spaces through automated scheduling, regression-based demand prediction, 15-minute QR verification, and 3-minute dynamic standby reallocation.

---

Production-ready, hackathon-grade backend built using **Python (FastAPI)**, **SQLAlchemy (PostgreSQL with SQLite fallback)**, **Pydantic v2**, and a self-contained **scikit-learn** regression engine.

---

## 🚀 Features

- **Multi-Role Authentication**: Google Identity Services ID-token sign-in, server-side Google token verification, university email-domain restrictions, and signed JWT access tokens.
- **Conflict-Free Search**: Mathematical overlap detection (`start_time < requested_end AND end_time > requested_start`) across `'Pending_Permission'`, `'Booked'`, and `'Scanned'` reservations.
- **ML Smart Slot Suggester**: Self-contained `scikit-learn` Ridge regression model evaluating campus occupancy ratios, peak hours, and room availability to calculate a congestion score and success probability when primary search yields 0 rooms.
- **Dynamic 15-Minute QR Check-in & Auto-Release**: Background worker via `APScheduler` (interval: 60s) expiring unclaimed `'Booked'` reservations where `now > start_time + 15 mins`.
- **3-Minute Dynamic Standby Rotation**: Automatically offers newly released rooms to waitlisted students with simulated push notifications and a 3-minute flash claim window.
- **Admin Portal APIs**: Support for Admin Dashboard (allotted history), Pending Requests Page (approve/deny with conflict verification and total booking counters), and Admin Profile.
- **Zero-Setup Local SQLite Fallback**: Automatically creates and seeds `sqlite:///./hackathon.db` if `DATABASE_URL` is omitted, while seamlessly supporting PostgreSQL in cloud deployments (Railway, Render, AWS, Heroku).

---

## 📁 Modular Directory Structure

```
campus_resource_backend/
│
├── main.py               # FastAPI application, lifespan context, student & admin endpoints
├── database.py           # Engine, SessionLocal, Base, PostgreSQL + SQLite dialect config
├── models.py             # Strict SQLAlchemy models (User, Space, Reservation, StandbyWaitlist, GUID)
├── schemas.py            # Strict Pydantic v2 schemas with time and capacity validations
├── auth.py               # JWT utilities, OAuth dev bypass, get_current_user & require_admin
├── background_tasks.py   # APScheduler worker (15m auto-release & 3m dynamic standby rotation)
├── ml_engine.py          # scikit-learn Ridge regression smart slot recommender
├── seed_data.py          # Pre-populates 6 campus rooms, 1 admin, 2 students, and sample bookings
├── test_backend.py       # End-to-end automated test suite verifying all 8 core capabilities
├── requirements.txt      # Production package dependencies
├── Procfile              # Deployment command for web tier (Uvicorn)
├── Solution.txt          # Problem statement & proposed architectural solution
├── start_server.bat      # One-click Windows startup script
└── README.md             # Documentation & API specifications
```

---

## 🛠️ Quickstart (Local Development)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Database Seeding (Optional - happens automatically on startup)
```bash
python seed_data.py
```

### 3. Start the Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- Interactive ReDoc: `http://localhost:8000/redoc`

### 4. Authentication testing
The legacy `test_backend.py` script uses the removed email-only development login and needs to be updated before it can run against this Google-token-only authentication flow. Test sign-in with a real university Google account after configuring `GOOGLE_CLIENT_ID`.

---

## 🔐 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./hackathon.db` | PostgreSQL connection string (`postgresql://...`) or SQLite fallback |
| `GOOGLE_CLIENT_ID` | *(required for Google sign-in)* | Google Cloud OAuth client ID for the Web application |
| `JWT_SECRET` | *(required for authentication)* | Private, randomly generated HMAC secret for signing JWT access tokens |
| `PORT` | `8000` | Port assigned by hosting provider (Render / Railway) |

Set `GOOGLE_CLIENT_ID` and `JWT_SECRET` in the hosting provider's environment settings. Never commit either value to source control. The Google Client ID is public browser configuration; the JWT secret must remain private.

---

## 📡 API Reference Summary

### Authentication (`/api/auth`)
- `GET /api/auth/config`: Returns the public Google web client ID configured by the server.
- `POST /api/auth/google`: Accepts a Google Identity Services ID token, verifies it against the configured client ID, and issues the app's JWT.
- `POST /api/auth/logout`: Clears UI session.

### Student Portal (`/api/`)
- `GET /api/user/dashboard`: Profile, active bookings, history grouped by status, and waitlists.
- `GET /api/rooms/search`: Query params `capacity`, `start_time`, `end_time`, `acoustic_profile`. Fallbacks to `ml_suggested_slots` when 0 rooms are open.
- `POST /api/bookings`: Create reservation (status: `'Pending_Permission'`).
- `POST /api/bookings/{id}/scan-qr`: Room check-in (validates `[start_time - 5m, start_time + 15m]`, status `'Booked'` -> `'Scanned'`).
- `POST /api/standby/join`: Join standby waitlist for congested room/timeframe.
- `POST /api/standby/{id}/flash-claim`: Claim auto-released room within 3-minute flash window.

### Admin Portal (`/api/admin`) *(Protected by `require_admin`)*
- `GET /api/admin/pending-requests`: Returns reservations awaiting approval.
- `PATCH /api/admin/requests/{id}/decision`: Approve (`'Booked'` + student count increment) or Deny (`'Denied'`).
- `GET /api/admin/dashboard/allotted-history`: Processed reservations (`'Booked'`, `'Scanned'`, `'Expired'`).
- `GET /api/admin/profile`: Admin details, personal bookings, and total campus requests processed.

### Developer Tools (`/api/dev`)
- `POST /api/dev/seed?force_reset=false`: Re-seed or reset initial rooms and users.
- `POST /api/dev/trigger-maintenance`: Manually trigger background QR expiration and standby rotation cycle.
