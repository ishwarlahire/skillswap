from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.swap_request import SwapRequest, SwapStatus
from app.models.session import Session, SessionStatus
from app.models.review import Review
from app.models.notification import NotifType
from app.services.notifications import create_notif
from app.schemas.swap import (
    SwapRequestCreate, SwapRequestOut, SwapRequestUpdate,
    SessionCreate, SessionUpdate, SessionOut,
    ReviewCreate, ReviewOut,
)

router = APIRouter(prefix="/swaps", tags=["Swaps"])


def _swap_q():
    return select(SwapRequest).options(
        selectinload(SwapRequest.sender).selectinload(User.skills_offered),
        selectinload(SwapRequest.sender).selectinload(User.skills_wanted),
        selectinload(SwapRequest.receiver).selectinload(User.skills_offered),
        selectinload(SwapRequest.receiver).selectinload(User.skills_wanted),
    )


# ════════════════════════════════
#  SWAP REQUESTS
# ════════════════════════════════

@router.post("/", response_model=SwapRequestOut, status_code=201)
async def create_swap(
    data: SwapRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.receiver_id == current_user.id:
        raise HTTPException(400, "Cannot send swap request to yourself")
    existing = await db.execute(
        select(SwapRequest).where(
            SwapRequest.sender_id == current_user.id,
            SwapRequest.receiver_id == data.receiver_id,
            SwapRequest.status == SwapStatus.PENDING,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "You already have a pending request with this user")

    swap = SwapRequest(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        offered_skill_id=data.offered_skill_id,
        wanted_skill_id=data.wanted_skill_id,
        message=data.message,
    )
    db.add(swap)
    await create_notif(
        db, data.receiver_id, NotifType.NEW_REQUEST,
        f"New swap request from {current_user.full_name or current_user.username}",
        data.message or "Wants to swap skills with you",
        "/swaps",
    )
    await db.commit()
    result = await db.execute(_swap_q().where(SwapRequest.id == swap.id))
    return result.scalar_one()


@router.get("/incoming", response_model=List[SwapRequestOut])
async def incoming_requests(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = _swap_q().where(SwapRequest.receiver_id == current_user.id)
    q = q.where(SwapRequest.status == (status or SwapStatus.PENDING))
    result = await db.execute(q.order_by(SwapRequest.created_at.desc()))
    return result.scalars().all()


@router.get("/sent", response_model=List[SwapRequestOut])
async def sent_requests(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = _swap_q().where(SwapRequest.sender_id == current_user.id)
    if status:
        q = q.where(SwapRequest.status == status)
    result = await db.execute(q.order_by(SwapRequest.created_at.desc()))
    return result.scalars().all()


@router.get("/", response_model=List[SwapRequestOut])
async def get_my_swaps(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = _swap_q().where(
        or_(SwapRequest.sender_id == current_user.id, SwapRequest.receiver_id == current_user.id)
    )
    if status:
        q = q.where(SwapRequest.status == status)
    result = await db.execute(q.order_by(SwapRequest.created_at.desc()))
    return result.scalars().all()


@router.get("/{swap_id}", response_model=SwapRequestOut)
async def get_swap(
    swap_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(_swap_q().where(SwapRequest.id == swap_id))
    swap = result.scalar_one_or_none()
    if not swap:
        raise HTTPException(404, "Swap not found")
    if swap.sender_id != current_user.id and swap.receiver_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    return swap


@router.put("/{swap_id}", response_model=SwapRequestOut)
async def update_swap(
    swap_id: int,
    data: SwapRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SwapRequest).where(SwapRequest.id == swap_id))
    swap = result.scalar_one_or_none()
    if not swap:
        raise HTTPException(404, "Swap not found")
    if swap.receiver_id != current_user.id and swap.sender_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    valid = {
        "pending":  ["accepted", "rejected", "cancelled"],
        "accepted": ["completed", "cancelled"],
    }
    if data.status not in valid.get(swap.status.value, []):
        raise HTTPException(400, f"Cannot change from '{swap.status}' to '{data.status}'")

    swap.status = data.status

    notif_map = {
        "accepted":  (swap.sender_id,   NotifType.REQ_ACCEPTED,  "Swap accepted!",       f"{current_user.full_name or current_user.username} accepted your swap", "/swaps"),
        "rejected":  (swap.sender_id,   NotifType.REQ_REJECTED,  "Swap declined",        f"{current_user.full_name or current_user.username} declined your swap", "/swaps"),
        "cancelled": (swap.receiver_id if swap.sender_id == current_user.id else swap.sender_id,
                      NotifType.REQ_CANCELLED, "Swap cancelled", f"{current_user.full_name or current_user.username} cancelled the swap", "/swaps"),
        "completed": (swap.sender_id if swap.receiver_id == current_user.id else swap.receiver_id,
                      NotifType.REQ_COMPLETED, "Swap completed!", f"{current_user.full_name or current_user.username} marked swap as completed", "/swaps"),
    }
    if data.status in notif_map:
        uid, ntype, title, body, link = notif_map[data.status]
        await create_notif(db, uid, ntype, title, body, link)

    await db.commit()
    result = await db.execute(_swap_q().where(SwapRequest.id == swap_id))
    return result.scalar_one()


# ════════════════════════════════
#  SESSIONS — /sessions/my MUST be before /sessions/{id}
# ════════════════════════════════

@router.post("/sessions", response_model=SessionOut, status_code=201)
async def create_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SwapRequest).where(SwapRequest.id == data.swap_request_id))
    swap = result.scalar_one_or_none()
    if not swap or swap.status != SwapStatus.ACCEPTED:
        raise HTTPException(400, "Swap must be accepted before scheduling a session")
    if swap.sender_id != current_user.id and swap.receiver_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    guest_id = swap.receiver_id if swap.sender_id == current_user.id else swap.sender_id
    session = Session(
        swap_request_id=data.swap_request_id,
        host_id=current_user.id,
        guest_id=guest_id,
        title=data.title,
        description=data.description,
        scheduled_at=data.scheduled_at,
        end_at=data.end_at,
        duration_minutes=data.duration_minutes,
        timezone=data.timezone,
        meeting_type=data.meeting_type,
        meeting_url=data.meeting_url,
        notes=data.notes,
    )
    db.add(session)
    await create_notif(
        db, guest_id, NotifType.SESSION_SCHED,
        f"Session scheduled: {data.title}",
        f"On {data.scheduled_at.strftime('%d %b %Y %H:%M')} ({data.timezone})",
        "/sessions",
    )
    await db.commit()
    result = await db.execute(
        select(Session).options(
            selectinload(Session.host), selectinload(Session.guest)
        ).where(Session.id == session.id)
    )
    return result.scalar_one()


# IMPORTANT: /sessions/my BEFORE /sessions/{session_id}
@router.get("/sessions/my", response_model=List[SessionOut])
async def my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).options(
            selectinload(Session.host), selectinload(Session.guest)
        ).where(
            or_(Session.host_id == current_user.id, Session.guest_id == current_user.id)
        ).order_by(Session.scheduled_at)
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).options(
            selectinload(Session.host), selectinload(Session.guest)
        ).where(Session.id == session_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.host_id != current_user.id and s.guest_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    return s


@router.put("/sessions/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: int,
    data: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.host_id != current_user.id and session.guest_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(session, k, v)
    await db.commit()
    result = await db.execute(
        select(Session).options(selectinload(Session.host), selectinload(Session.guest)).where(Session.id == session_id)
    )
    return result.scalar_one()


@router.post("/sessions/{session_id}/complete")
async def mark_complete(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.host_id != current_user.id and session.guest_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    now = datetime.now(timezone.utc)
    if session.host_id == current_user.id:
        session.host_completed = now
    else:
        session.guest_completed = now

    both = bool(session.host_completed and session.guest_completed)
    if both:
        session.status = SessionStatus.COMPLETED
        hours = session.duration_minutes / 60
        r = await db.execute(select(User).where(User.id.in_([session.host_id, session.guest_id])))
        for u in r.scalars().all():
            if u.id == session.host_id:
                u.total_hours_taught += hours
            else:
                u.total_hours_learned += hours
            u.sessions_completed += 1

    await db.commit()
    return {"ok": True, "both_completed": both, "status": session.status}


# ════════════════════════════════
#  REVIEWS
# ════════════════════════════════

@router.post("/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Review).where(
            Review.session_id == data.session_id,
            Review.reviewer_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already reviewed this session")

    review = Review(
        session_id=data.session_id,
        reviewer_id=current_user.id,
        reviewee_id=data.reviewee_id,
        rating=data.rating,
        comment=data.comment,
        skill_name=data.skill_name,
    )
    db.add(review)

    r = await db.execute(select(User).where(User.id == data.reviewee_id))
    reviewee = r.scalar_one_or_none()
    if reviewee:
        total = reviewee.total_reviews + 1
        reviewee.rating = round(((reviewee.rating * reviewee.total_reviews) + data.rating) / total, 2)
        reviewee.total_reviews = total

    await create_notif(
        db, data.reviewee_id, NotifType.REVIEW_RECV,
        f"New {data.rating}★ review from {current_user.full_name or current_user.username}",
        data.comment[:100] if data.comment else "",
        "/profile",
    )
    await db.commit()
    result = await db.execute(
        select(Review).options(selectinload(Review.reviewer)).where(Review.id == review.id)
    )
    return result.scalar_one()


@router.get("/sessions/{session_id}/reviews", response_model=List[ReviewOut])
async def session_reviews(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review).options(selectinload(Review.reviewer)).where(Review.session_id == session_id)
    )
    return result.scalars().all()
