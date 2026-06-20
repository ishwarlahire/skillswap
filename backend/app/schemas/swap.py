from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserPublic

class SwapRequestCreate(BaseModel):
    receiver_id: int
    offered_skill_id: Optional[int] = None
    wanted_skill_id: Optional[int] = None
    message: Optional[str] = Field(None, max_length=500)

class SwapRequestUpdate(BaseModel):
    status: str

class SwapRequestOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    sender: Optional[UserPublic] = None
    receiver: Optional[UserPublic] = None
    model_config = {"from_attributes": True}

class SessionCreate(BaseModel):
    swap_request_id: int
    title: str = Field(..., min_length=3, max_length=300)
    description: Optional[str] = None
    scheduled_at: datetime
    end_at: Optional[datetime] = None
    duration_minutes: int = Field(60, ge=15, le=480)
    timezone: str = "Asia/Kolkata"
    meeting_type: str = "google_meet"
    meeting_url: Optional[str] = None
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_type: Optional[str] = None
    meeting_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    swap_request_id: int
    host_id: int
    guest_id: int
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    end_at: Optional[datetime] = None
    duration_minutes: int
    timezone: str
    meeting_type: str
    meeting_url: Optional[str] = None
    status: str
    notes: Optional[str] = None
    host_completed: Optional[datetime] = None
    guest_completed: Optional[datetime] = None
    created_at: datetime
    host: Optional[UserPublic] = None
    guest: Optional[UserPublic] = None
    model_config = {"from_attributes": True}

class ReviewCreate(BaseModel):
    session_id: int
    reviewee_id: int
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    skill_name: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    session_id: int
    reviewer_id: int
    reviewee_id: int
    rating: float
    comment: Optional[str] = None
    skill_name: Optional[str] = None
    created_at: datetime
    reviewer: Optional[UserPublic] = None
    model_config = {"from_attributes": True}

class MessageCreate(BaseModel):
    receiver_id: int
    content: str = Field(..., min_length=1, max_length=2000)
    swap_request_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    swap_request_id: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ConversationOut(BaseModel):
    other_user: UserPublic
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    swap_request_id: Optional[int] = None
