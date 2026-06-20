from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    mobile = Column(String(20), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    experience_level = Column(String(50), nullable=True)   # beginner/intermediate/expert
    years_of_experience = Column(Integer, nullable=True)
    education = Column(String(300), nullable=True)
    availability = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    sessions_completed = Column(Integer, default=0, nullable=False)
    total_hours_taught = Column(Float, default=0.0, nullable=False)
    total_hours_learned = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    skills_offered   = relationship("Skill", foreign_keys="Skill.offered_by_id", back_populates="offered_by", lazy="selectin")
    skills_wanted    = relationship("Skill", foreign_keys="Skill.wanted_by_id",   back_populates="wanted_by",  lazy="selectin")
    sent_requests    = relationship("SwapRequest", foreign_keys="SwapRequest.sender_id",   back_populates="sender")
    received_requests= relationship("SwapRequest", foreign_keys="SwapRequest.receiver_id", back_populates="receiver")
    reviews_given    = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    reviews_received = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee")
    sent_messages    = relationship("Message", foreign_keys="Message.sender_id",   back_populates="sender")
    received_messages= relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    notifications    = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user")
    sessions_as_host = relationship("Session", foreign_keys="Session.host_id",  back_populates="host")
    sessions_as_guest= relationship("Session", foreign_keys="Session.guest_id", back_populates="guest")
