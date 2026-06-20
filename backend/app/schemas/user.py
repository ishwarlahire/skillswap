from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = None
    level: str = "intermediate"

class SkillOut(SkillBase):
    id: int
    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=200)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = None
    mobile: Optional[str] = Field(None, max_length=20)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    experience_level: Optional[str] = None
    years_of_experience: Optional[int] = Field(None, ge=0, le=50)
    education: Optional[str] = Field(None, max_length=300)
    availability: Optional[str] = Field(None, max_length=200)

class UserPublic(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    mobile: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    experience_level: Optional[str] = None
    years_of_experience: Optional[int] = None
    education: Optional[str] = None
    availability: Optional[str] = None
    is_admin: bool = False
    rating: float = 0.0
    total_reviews: int = 0
    sessions_completed: int = 0
    total_hours_taught: float = 0.0
    total_hours_learned: float = 0.0
    created_at: datetime
    skills_offered: List[SkillOut] = []
    skills_wanted: List[SkillOut] = []
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

class NotifOut(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}
