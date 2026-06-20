from sqlalchemy import Column, Integer, ForeignKey, Float, Text, DateTime, CheckConstraint, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="valid_rating"),)

    id          = Column(Integer, primary_key=True, index=True)
    session_id  = Column(Integer, ForeignKey("sessions.id",  ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id",     ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id",     ondelete="CASCADE"), nullable=False)
    swap_request_id = Column(Integer, ForeignKey("swap_requests.id", ondelete="CASCADE"), nullable=True)
    rating      = Column(Float, nullable=False)
    comment     = Column(Text, nullable=True)
    skill_name  = Column(String(100), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    session  = relationship("Session", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")
