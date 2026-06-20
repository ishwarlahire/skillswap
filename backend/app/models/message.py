from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Message(Base):
    __tablename__ = "messages"

    id              = Column(Integer, primary_key=True, index=True)
    sender_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    swap_request_id = Column(Integer, ForeignKey("swap_requests.id", ondelete="SET NULL"), nullable=True)
    content         = Column(Text, nullable=False)
    is_read         = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    sender      = relationship("User", foreign_keys=[sender_id],   back_populates="sent_messages")
    receiver    = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    swap_request= relationship("SwapRequest", back_populates="messages")
