import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL configuration with PostgreSQL support and SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./hackathon.db"
elif DATABASE_URL.startswith("postgres://"):
    # Railway & Render legacy format compatibility
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {"options": "-c timezone=Asia/Kolkata"},
    pool_pre_ping=True,
    echo=False,
)

if not is_sqlite:
    @event.listens_for(engine, "connect")
    def set_timezone(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("SET TIME ZONE 'Asia/Kolkata';")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
