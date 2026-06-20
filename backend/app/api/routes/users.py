from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.skill import Skill
from app.models.review import Review
from app.models.notification import Notification
from app.schemas.user import UserPublic, UserUpdate, SkillBase, SkillOut, NotifOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserPublic)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(current_user, k, v)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/search", response_model=List[UserPublic])
async def search_users(
    skill: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).where(User.id != current_user.id, User.is_active == True)
    if skill:
        ids = select(Skill.offered_by_id).where(Skill.name.ilike(f"%{skill}%"), Skill.offered_by_id.is_not(None))
        q = q.where(User.id.in_(ids))
    if location:
        q = q.where(User.location.ilike(f"%{location}%"))
    result = await db.execute(q.offset((page - 1) * limit).limit(limit))
    return result.scalars().all()


@router.get("/notifications", response_model=List[NotifOut])
async def get_notifications(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        q = q.where(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc()).limit(50)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/notifications/count")
async def unread_count(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    return {"unread": result.scalar_one()}


@router.put("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id).values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


@router.put("/notifications/{notif_id}/read")
async def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id))
    n = result.scalar_one_or_none()
    if n:
        n.is_read = True
        await db.commit()
    return {"ok": True}


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/{user_id}/reviews", response_model=List[dict])
async def get_user_reviews(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Review).options(selectinload(Review.reviewer)).where(Review.reviewee_id == user_id).order_by(Review.created_at.desc()).limit(20)
    )
    reviews = result.scalars().all()
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "skill_name": r.skill_name,
            "created_at": r.created_at.isoformat(),
            "reviewer": {"id": r.reviewer.id, "username": r.reviewer.username, "full_name": r.reviewer.full_name, "avatar_url": r.reviewer.avatar_url},
        }
        for r in reviews
    ]


@router.post("/me/skills/offer", response_model=SkillOut, status_code=201)
async def add_offered_skill(data: SkillBase, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = Skill(name=data.name, category=data.category, level=data.level, offered_by_id=current_user.id)
    db.add(s); await db.commit(); await db.refresh(s)
    return s


@router.post("/me/skills/want", response_model=SkillOut, status_code=201)
async def add_wanted_skill(data: SkillBase, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = Skill(name=data.name, category=data.category, level=data.level, wanted_by_id=current_user.id)
    db.add(s); await db.commit(); await db.refresh(s)
    return s


@router.delete("/me/skills/{skill_id}", status_code=204)
async def delete_skill(skill_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id, or_(Skill.offered_by_id == current_user.id, Skill.wanted_by_id == current_user.id))
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Skill not found")
    await db.delete(s); await db.commit()
