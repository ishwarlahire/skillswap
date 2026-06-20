import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(100), nullable=True)
    level = Column(Enum(SkillLevel), default=SkillLevel.INTERMEDIATE, nullable=False)
    offered_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    wanted_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    offered_by = relationship("User", foreign_keys=[offered_by_id], back_populates="skills_offered")
    wanted_by = relationship("User", foreign_keys=[wanted_by_id], back_populates="skills_wanted")
