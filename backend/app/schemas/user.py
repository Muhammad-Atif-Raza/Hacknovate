from pydantic import BaseModel, Field
from typing import Optional
import datetime

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str
    enrollment_number: Optional[str] = None
    department: str
    course: Optional[str] = None
    year: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    avatar_url: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    enrollment_number: Optional[str] = None
    department: str
    course: Optional[str] = None
    year: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
