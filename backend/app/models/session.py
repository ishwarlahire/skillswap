import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    ONGOING   = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MeetingType(str, enum.Enum):
    GOOGLE_MEET = "google_meet"
    ZOOM        = "zoom"
    TEAMS       = "teams"
    CUSTOM      = "custom"

class Session(Base):
    __tablename__ = "sessions"

    id              = Column(Integer, primary_key=True, index=True)
    swap_request_id = Column(Integer, ForeignKey("swap_requests.id", ondelete="CASCADE"), nullable=False)
    host_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    guest_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title           = Column(String(300), nullable=False)
    description     = Column(Text, nullable=True)
    scheduled_at    = Column(DateTime(timezone=True), nullable=False)
    end_at          = Column(DateTime(timezone=True), nullable=True)
    duration_minutes= Column(Integer, default=60, nullable=False)
    timezone        = Column(String(100), default="Asia/Kolkata", nullable=False)
    meeting_type    = Column(Enum(MeetingType), default=MeetingType.GOOGLE_MEET, nullable=False)
    meeting_url     = Column(String(1000), nullable=True)
    status          = Column(Enum(SessionStatus), default=SessionStatus.SCHEDULED, nullable=False)
    notes           = Column(Text, nullable=True)
    host_completed  = Column(DateTime(timezone=True), nullable=True)
    guest_completed = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    swap_request = relationship("SwapRequest", back_populates="sessions")
    host         = relationship("User", foreign_keys=[host_id],  back_populates="sessions_as_host")
    guest        = relationship("User", foreign_keys=[guest_id], back_populates="sessions_as_guest")
    reviews      = relationship("Review", back_populates="session", cascade="all, delete-orphan")
