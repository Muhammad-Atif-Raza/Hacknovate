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
from schemas import GoogleAuthRequest, AuthResponse, UserResponse, AuthConfigResponse, UpdateGoogleConfig

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

    # 1. Google OAuth via Access Token (OAuth2 UserInfo)
    if payload.access_token:
        try:
            google_resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"},
                timeout=6,
            )
            if google_resp.status_code == 200:
                google_data = google_resp.json()
                email = google_data.get("email", "").strip().lower()
                name = google_data.get("name") or email.split("@")[0].title()
                photo_url = google_data.get("picture")
            else:
                logger.warning(f"Google UserInfo API returned {google_resp.status_code}: {google_resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google OAuth access token",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Google access token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Google authentication service error: {e}",
            )

    # 2. Google OAuth via ID Token (JWT TokenInfo)
    elif payload.id_token:
        try:
            google_resp = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}",
                timeout=6,
            )
            if google_resp.status_code == 200:
                google_data = google_resp.json()
                email = google_data.get("email", "").strip().lower()
                name = google_data.get("name") or email.split("@")[0].title()
                photo_url = google_data.get("picture")
            else:
                # In case Google API responds with error or offline testing, attempt unverified JWT claims decode
                try:
                    claims = jwt.decode(payload.id_token, options={"verify_signature": False})
                    email = claims.get("email", "").strip().lower()
                    name = claims.get("name") or (email.split("@")[0].title() if email else None)
                    photo_url = claims.get("picture")
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Google OAuth ID token",
                    )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Token verification network warning: {e}. Checking unverified JWT claims.")
            try:
                claims = jwt.decode(payload.id_token, options={"verify_signature": False})
                email = claims.get("email", "").strip().lower()
                name = claims.get("name") or (email.split("@")[0].title() if email else None)
                photo_url = claims.get("picture")
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Google token verification failed: {e}",
                )

    # 3. Development / Sandbox Bypass Path
    elif payload.dev_bypass_email:
        email = payload.dev_bypass_email.strip().lower()
        name = payload.name or email.split("@")[0].replace(".", " ").title()
        photo_url = (
            payload.photo_url
            or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either id_token, access_token, or dev_bypass_email must be provided",
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


@auth_router.get("/config", response_model=AuthConfigResponse)
def get_auth_config():
    """Returns the active Google OAuth client configuration."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    return AuthConfigResponse(
        google_client_id=client_id,
        hosted_domain="st.niituniversity.in",
        has_client_id=bool(client_id),
    )


@auth_router.post("/config")
def update_auth_config(payload: UpdateGoogleConfig):
    """Dynamically updates or configures the Google OAuth Client ID."""
    client_id = payload.google_client_id.strip()
    os.environ["GOOGLE_CLIENT_ID"] = client_id

    # Persist to local .env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = [l for l in f.readlines() if not l.startswith("GOOGLE_CLIENT_ID=")]
    lines.append(f"GOOGLE_CLIENT_ID={client_id}\n")
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    return {
        "message": "Google Client ID updated successfully",
        "google_client_id": client_id,
        "has_client_id": bool(client_id),
    }
