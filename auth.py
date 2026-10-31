import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from schemas import GoogleAuthRequest, AuthResponse, UserResponse

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-campus-resource-key-hackathon-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/google", auto_error=False)
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now_utc})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decodes and validates JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI Dependency: extracts and verifies the authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI Dependency: enforces admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action",
        )
    return current_user


SUPER_ADMIN_EMAILS = {"tanmay.singh26@st.niituniversity.in"}
ALLOWED_DOMAINS = ("@st.niituniversity.in", "@niituniversity.in")


def determine_role_from_email(email: str, dev_role: Optional[UserRole] = None) -> UserRole:
    """
    Determines user role strictly based on university email:
    - 'tanmay.singh26@st.niituniversity.in' is Super Admin.
    - Legacy faculty or admin emails are admin.
    - All other @st.niituniversity.in emails are student by default (can be granted admin from website).
    """
    email_lower = email.strip().lower()
    if email_lower in SUPER_ADMIN_EMAILS or email_lower == "admin@campus.edu" or ".fac@" in email_lower:
        return UserRole.ADMIN
    return UserRole.STUDENT


@auth_router.post("/google", response_model=AuthResponse)
def authenticate_google(
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """
    Google OAuth login with strict email domain role routing:
    - @st.niituniversity.in -> Student role (Student Portal)
    - .fac@st.niituniversity.in -> Admin role (Admin's Panel)
    """
    email: Optional[str] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None

    # Dev Bypass Path (Hackathon friendly)
    if payload.dev_bypass_email:
        email = payload.dev_bypass_email.strip().lower()
        name = payload.name or email.split("@")[0].replace(".", " ").title()
        photo_url = (
            payload.photo_url
            or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"
        )
    elif payload.id_token:
        # Live Google OAuth Verification
        try:
            google_resp = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}",
                timeout=5,
            )
            if google_resp.status_code == 200:
                google_data = google_resp.json()
                email = google_data.get("email", "").strip().lower()
                name = google_data.get("name") or email.split("@")[0].title()
                photo_url = google_data.get("picture")
            else:
                # Fallback for mock tokens in local sandbox
                logger.warning("Google Token verification failed, checking payload fallback")
                raise ValueError("Invalid Google ID token")
        except Exception as e:
            logger.warning(f"Token verification network error: {e}. Fallback enabled.")
            # For offline/test resilience:
            email = (payload.dev_bypass_email or f"user_{uuid.uuid4().hex[:6]}@campus.edu").lower()
            name = payload.name or "Campus User"
            photo_url = payload.photo_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either id_token or dev_bypass_email must be provided",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to obtain valid email from authentication provider",
        )

    email_lower = email.strip().lower()
    if not any(email_lower.endswith(dom) for dom in ALLOWED_DOMAINS) and email_lower != "admin@campus.edu":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Restricted: Only @st.niituniversity.in accounts are permitted to sign in.",
        )

    role: UserRole = determine_role_from_email(email_lower, payload.dev_role)

    # Upsert User in database
    user = db.query(User).filter(User.email == email).first()

    # Migration alias for Agrim Goel:
    if not user and email == "agrim.goel26@st.niituniversity.in":
        user = db.query(User).filter(User.email == "agrimgoel14@gmail.com").first()
        if user:
            user.email = "agrim.goel26@st.niituniversity.in"
            db.commit()
            db.refresh(user)

    # Migration alias for Sarah Connor:
    if not user and email == "sarah.connor.fac@st.niituniversity.in":
        user = db.query(User).filter(User.email == "admin@campus.edu").first()
        if user:
            user.email = "sarah.connor.fac@st.niituniversity.in"
            db.commit()
            db.refresh(user)

    if not user:
        # Determine ID format: Roll number or readable ID
        prefix = "ADM" if role == UserRole.ADMIN else "STU"
        generated_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        user = User(
            id=generated_id,
            email=email,
            name=name,
            photo_url=photo_url,
            role=role,
            total_bookings=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update mutable fields
        if name:
            user.name = name
        if photo_url:
            user.photo_url = photo_url
        if email_lower in SUPER_ADMIN_EMAILS:
            user.role = UserRole.ADMIN
        # NOTE: For existing users, preserve user.role so admin privileges granted via website persist!
        db.commit()
        db.refresh(user)

    # Create JWT Access Token
    token_claims = {
        "sub": user.id,
        "email": user.email,
        "role": user.role.value,
        "name": user.name,
    }
    access_token = create_access_token(token_claims)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user=UserResponse.model_validate(user),
    )


@auth_router.post("/logout")
def logout():
    """Sign-out endpoint for client UI session clearing."""
    return {"message": "Successfully logged out. Please clear your access token from client storage."}
