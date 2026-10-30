from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Notification
from app.schemas.user import UserRegister, UserLogin, UserOut, UserUpdate, Token
from app.schemas.booking import NotificationOut
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_current_user
from typing import List

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # Validate college email domain strictly for students
    email_domain = user_in.email.split("@")[-1].lower() if "@" in user_in.email else ""
    if not (email_domain == settings.AUTHORIZED_STUDENT_DOMAIN or email_domain.endswith("." + settings.AUTHORIZED_STUDENT_DOMAIN)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student registration is strictly restricted to authorized @{settings.AUTHORIZED_STUDENT_DOMAIN} email addresses."
        )

    # Check if email exists
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this college email already exists."
        )

    # Check enrollment number if provided
    if user_in.enrollment_number:
        existing_enr = db.query(User).filter(User.enrollment_number == user_in.enrollment_number.strip().upper()).first()
        if existing_enr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This enrollment number is already registered."
            )

    new_user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        enrollment_number=user_in.enrollment_number.strip().upper() if user_in.enrollment_number else None,
        department=user_in.department.strip(),
        course=user_in.course.strip() if user_in.course else None,
        year=user_in.year.strip() if user_in.year else None,
        role="student",
        hashed_password=get_password_hash(user_in.password),
        avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={user_in.full_name.replace(' ', '+')}&backgroundColor=1e3a8a",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create welcome notification
    notif = Notification(
        user_id=new_user.id,
        title="Welcome to Campus Resource Hub",
        message="Your student profile is active. You can now browse campus rooms and apply for bookings.",
        type="SYSTEM",
        link="/student/apply"
    )
    db.add(notif)
    db.commit()

    token = create_access_token({"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return {"access_token": token, "token_type": "bearer", "user": new_user}


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    identifier = login_in.email.strip().lower()

    # Enforce domain restriction on login
    if "@" in identifier:
        domain = identifier.split("@")[-1].lower()
        if not any(domain == d or domain.endswith("." + d) for d in settings.AUTHORIZED_EMAIL_DOMAINS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Login is restricted to official email addresses ending with @{settings.AUTHORIZED_STUDENT_DOMAIN} (or @niituniversity.in for administrators)."
            )

    # Support login with either email or enrollment number
    user = db.query(User).filter(
        (User.email == identifier) | (User.enrollment_number == identifier.upper())
    ).first()

    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid college email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact campus administration."
        )

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.full_name:
        current_user.full_name = update_data.full_name.strip()
    if update_data.department:
        current_user.department = update_data.department.strip()
    if update_data.course is not None:
        current_user.course = update_data.course.strip()
    if update_data.year is not None:
        current_user.year = update_data.year.strip()
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url.strip()

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    return notifs


@router.put("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}


@router.put("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).update({"is_read": True})
    db.commit()
    return {"status": "success"}
