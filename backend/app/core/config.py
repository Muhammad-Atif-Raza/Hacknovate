import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Campus Resource Hub"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campus-resource-hub-super-secret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Supports PostgreSQL by default or fallback to SQLite for local development
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./campus_hub.db"
    )
    
    # Authorized college email domain (strictly @st.niituniversity.in for students, @niituniversity.in for admin)
    AUTHORIZED_STUDENT_DOMAIN: str = "st.niituniversity.in"
    AUTHORIZED_EMAIL_DOMAINS: list[str] = ["st.niituniversity.in", "niituniversity.in"]
    
    # Checkin grace period in minutes
    CHECKIN_WINDOW_MINUTES: int = 15
    # Standby claim window in minutes
    STANDBY_CLAIM_MINUTES: int = 3

settings = Settings()
