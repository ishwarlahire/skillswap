from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.swap_request import SwapRequest
from app.models.session import Session
from app.schemas.user import UserPublic

router = APIRouter(prefix="/admin", tags=["Admin"])


async def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Admin access required")
    return current_user


@router.get("/stats")
async def admin_stats(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    users    = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    swaps    = (await db.execute(select(func.count()).select_from(SwapRequest))).scalar_one()
    sessions = (await db.execute(select(func.count()).select_from(Session))).scalar_one()
    active   = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar_one()
    return {"total_users": users, "active_users": active, "total_swaps": swaps, "total_sessions": sessions}


@router.get("/users", response_model=List[UserPublic])
async def list_users(page: int = 1, limit: int = 50, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).offset((page-1)*limit).limit(limit))
    return result.scalars().all()


@router.put("/users/{user_id}/suspend")
async def suspend_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    await db.commit()
    return {"ok": True, "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    await db.delete(user); await db.commit()
    return {"ok": True}
