import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class NotifType(str, enum.Enum):
    NEW_REQUEST   = "new_request"
    REQ_ACCEPTED  = "request_accepted"
    REQ_REJECTED  = "request_rejected"
    NEW_MESSAGE   = "new_message"
    SESSION_SCHED = "session_scheduled"
    SESSION_REMIND= "session_reminder"
    REVIEW_RECV   = "review_received"
    REQ_CANCELLED = "request_cancelled"
    REQ_COMPLETED = "request_completed"

class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type       = Column(Enum(NotifType), nullable=False)
    title      = Column(String(200), nullable=False)
    body       = Column(Text, nullable=True)
    link       = Column(String(500), nullable=True)
    is_read    = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
