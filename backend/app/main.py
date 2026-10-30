from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import engine, Base
from app.db.seed_data import seed_database
from app.core.scheduler import start_scheduler, scheduler

from app.api.auth import router as auth_router
from app.api.rooms import router as rooms_router
from app.api.bookings import router as bookings_router
from app.api.checkin import router as checkin_router
from app.api.recommendations import router as recommendations_router
from app.api.standby import router as standby_router
from app.api.maintenance import router as maintenance_router
from app.api.analytics import router as analytics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed realistic initial data
    Base.metadata.create_all(bind=engine)
    seed_database()
    # Start background scheduler for automatic 15-min check-in expiry and standby claims
    start_scheduler()
    yield
    # Shutdown: stop scheduler cleanly
    if scheduler.running:
        scheduler.shutdown(wait=False)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Campus Room and Facility Booking Platform with Conflict Prevention and Smart Rule-Based Suggestions.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(bookings_router, prefix=settings.API_V1_STR)
app.include_router(checkin_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)
app.include_router(standby_router, prefix=settings.API_V1_STR)
app.include_router(maintenance_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "documentation": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
