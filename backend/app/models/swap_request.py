import enum
from sqlalchemy import Column, Integer, ForeignKey, Enum, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SwapStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SwapRequest(Base):
    __tablename__ = "swap_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    offered_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    wanted_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(Enum(SwapStatus), default=SwapStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")
    sessions = relationship("Session", back_populates="swap_request", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="swap_request")
