import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from schemas import GoogleAuthRequest, AuthResponse, UserResponse, AuthConfigResponse

logger = logging.getLogger(__name__)

# Auto-load .env configuration if present
_env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_file):
    try:
        with open(_env_file, "r", encoding="utf-8") as _ef:
            for _line in _ef:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip('"').strip("'")
                    if _k and _k not in os.environ:
                        os.environ[_k] = _v
    except Exception as _e:
        logger.warning(f"Error loading .env file: {_e}")


# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/google", auto_error=False)
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET must be set in the server environment")
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
        if not JWT_SECRET:
            raise jwt.InvalidTokenError("JWT_SECRET is not configured")
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
ADMIN_EMAILS = {
    "agrim.goel26@st.niituniversity.in",
    "tanmay.singh26@st.niituniversity.in",
}
ALLOWED_DOMAINS = ("@st.niituniversity.in", "@niituniversity.in")
ALLOWED_HOSTED_DOMAINS = {"st.niituniversity.in", "niituniversity.in"}


def determine_role_from_email(email: str) -> UserRole:
    """
    Determines user role strictly based on university email:
    - 'agrim.goel26@st.niituniversity.in' is Faculty / Admin.
    - 'tanmay.singh26@st.niituniversity.in' is Super Admin.
    - Demo emails starting with 'admin' or 'faculty' or containing '.fac@' are admin.
    - 'agrimgoel14@gmail.com' stays a student account.
    - All other @st.niituniversity.in emails are student by default (can be granted admin from website).
    """
    email_lower = email.strip().lower()
    if email_lower == "agrimgoel14@gmail.com":
        return UserRole.STUDENT
    if (
        email_lower in ADMIN_EMAILS
        or email_lower.startswith("admin")
        or email_lower.startswith("faculty")
        or ".fac@" in email_lower
    ):
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
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured on this server",
        )
    if not payload.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A Google ID token is required",
        )

    try:
        google_data = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as exc:
        logger.info("Rejected invalid Google ID token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google ID token",
        ) from exc
    except Exception as exc:
        logger.error("Google ID token verification service failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in verification is temporarily unavailable",
        ) from exc

    email = (google_data.get("email") or "").strip().lower()
    if not email or google_data.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account must have a verified email address",
        )
    hosted_domain = (google_data.get("hd") or "").strip().lower()
    if hosted_domain not in ALLOWED_HOSTED_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sign in with an account managed by NIIT University",
        )
    name = google_data.get("name") or email.split("@")[0].title()
    photo_url = google_data.get("picture")

    email_lower = email.strip().lower()
    if not any(email_lower.endswith(dom) for dom in ALLOWED_DOMAINS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Restricted: Only @st.niituniversity.in accounts are permitted to sign in.",
        )

    role: UserRole = determine_role_from_email(email_lower)

    # Upsert User in database
    user = db.query(User).filter(User.email == email).first()

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
        if (
            email_lower in ADMIN_EMAILS
            or email_lower.startswith("admin")
            or email_lower.startswith("faculty")
            or ".fac@" in email_lower
        ):
            user.role = UserRole.ADMIN
        elif email_lower == "agrimgoel14@gmail.com":
            user.role = UserRole.STUDENT
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


@auth_router.post("/toggle-role")
def toggle_user_role(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    1-Click Role Toggle for demo administrators (specifically agrim.goel26@st.niituniversity.in and super admins).
    Flips role between 'admin' and 'student'.
    Returns updated user, new role, and fresh JWT token.
    """
    allowed_toggle_emails = {
        "agrim.goel26@st.niituniversity.in",
        "tanmay.singh26@st.niituniversity.in",
    }
    email_lower = (current_user.email or "").strip().lower()
    if email_lower not in allowed_toggle_emails and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role toggle is reserved for Faculty Administrators.",
        )

    # Flip role
    new_role = UserRole.STUDENT if current_user.role == UserRole.ADMIN else UserRole.ADMIN
    current_user.role = new_role
    db.commit()
    db.refresh(current_user)

    # Generate fresh JWT token with new role
    token_claims = {
        "sub": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "name": current_user.name,
    }
    new_access_token = create_access_token(token_claims)

    return {
        "message": f"Role switched successfully to {new_role.value.capitalize()}!",
        "role": new_role.value,
        "access_token": new_access_token,
        "user": UserResponse.model_validate(current_user),
    }


@auth_router.get("/config", response_model=AuthConfigResponse)
def get_auth_config():
    """Returns the active Google OAuth client configuration."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    return AuthConfigResponse(
        google_client_id=client_id,
        hosted_domain="st.niituniversity.in",
        has_client_id=bool(client_id),
    )


