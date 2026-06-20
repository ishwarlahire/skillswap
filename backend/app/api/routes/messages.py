from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update, func
from typing import List, Dict
import json
import logging
from datetime import datetime, timezone
from app.core.database import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models.message import Message
from app.models.user import User
from app.models.swap_request import SwapRequest, SwapStatus
from app.models.notification import Notification, NotifType
from app.services.notifications import create_notif
from app.schemas.swap import MessageCreate, MessageOut
from app.schemas.user import UserPublic          # ← was missing, caused 500

router = APIRouter(prefix="/messages", tags=["Messages"])
logger = logging.getLogger(__name__)


# ────────────────────────────────
#  WebSocket connection manager
# ────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_to(self, user_id: int, data: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections


manager = ConnectionManager()


# ────────────────────────────────
#  Helpers
# ────────────────────────────────
async def _get_accepted_swap(db: AsyncSession, user_a: int, user_b: int):
    """Return the accepted SwapRequest between two users, or None."""
    result = await db.execute(
        select(SwapRequest).where(
            SwapRequest.status == SwapStatus.ACCEPTED,
            or_(
                and_(SwapRequest.sender_id == user_a, SwapRequest.receiver_id == user_b),
                and_(SwapRequest.sender_id == user_b, SwapRequest.receiver_id == user_a),
            )
        ).limit(1)
    )
    return result.scalar_one_or_none()


async def _can_chat(db: AsyncSession, user_a: int, user_b: int) -> bool:
    return (await _get_accepted_swap(db, user_a, user_b)) is not None


def _serialize_user(user: User) -> dict:
    """Safely serialize a User to dict without Pydantic validation errors."""
    return {
        "id":                   user.id,
        "email":                user.email,
        "username":             user.username,
        "full_name":            user.full_name,
        "bio":                  user.bio,
        "location":             user.location,
        "avatar_url":           user.avatar_url,
        "mobile":               user.mobile,
        "linkedin_url":         user.linkedin_url,
        "github_url":           user.github_url,
        "portfolio_url":        user.portfolio_url,
        "experience_level":     user.experience_level,
        "years_of_experience":  user.years_of_experience,
        "education":            user.education,
        "availability":         user.availability,
        "is_admin":             user.is_admin,
        "rating":               float(user.rating or 0),
        "total_reviews":        user.total_reviews or 0,
        "sessions_completed":   user.sessions_completed or 0,
        "total_hours_taught":   float(user.total_hours_taught or 0),
        "total_hours_learned":  float(user.total_hours_learned or 0),
        "created_at":           user.created_at.isoformat() if user.created_at else None,
        "skills_offered":       [],
        "skills_wanted":        [],
    }


# ────────────────────────────────
#  WebSocket endpoint
# ────────────────────────────────
@router.websocket("/ws/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return

    user_id = int(payload.get("sub", 0))
    await manager.connect(user_id, websocket)

    try:
        while True:
            raw  = await websocket.receive_text()
            data = json.loads(raw)

            receiver_id = int(data.get("receiver_id", 0))
            content     = data.get("content", "").strip()
            if not content or not receiver_id:
                continue

            async with AsyncSessionLocal() as db:
                swap = await _get_accepted_swap(db, user_id, receiver_id)
                if not swap:
                    await manager.send_to(user_id, {
                        "error": "No accepted swap with this user."
                    })
                    continue

                msg = Message(
                    sender_id       = user_id,
                    receiver_id     = receiver_id,
                    content         = content,
                    swap_request_id = swap.id,
                )
                db.add(msg)

                # Push notification if receiver is offline
                if not manager.is_online(receiver_id):
                    r = await db.execute(select(User).where(User.id == user_id))
                    sender = r.scalar_one_or_none()
                    name   = (sender.full_name or sender.username) if sender else "Someone"
                    await create_notif(
                        db, receiver_id, NotifType.NEW_MESSAGE,
                        f"New message from {name}",
                        content[:100],
                        "/chat",
                    )

                await db.commit()
                await db.refresh(msg)

                out = {
                    "id":              msg.id,
                    "sender_id":       msg.sender_id,
                    "receiver_id":     msg.receiver_id,
                    "content":         msg.content,
                    "is_read":         msg.is_read,
                    "swap_request_id": msg.swap_request_id,
                    "created_at":      msg.created_at.isoformat(),
                }
                await manager.send_to(receiver_id, out)
                await manager.send_to(user_id, out)

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WS error for user {user_id}: {e}")
        manager.disconnect(user_id)


# ────────────────────────────────
#  GET /messages/conversations
# ────────────────────────────────
@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """
    Returns all users the current user can chat with
    (i.e. has an ACCEPTED swap request with them).
    Shows conversation even with zero messages — shows "Say hello!".
    """
    try:
        # Fetch all accepted swaps involving this user
        swaps_result = await db.execute(
            select(SwapRequest).where(
                SwapRequest.status == SwapStatus.ACCEPTED,
                or_(
                    SwapRequest.sender_id   == current_user.id,
                    SwapRequest.receiver_id == current_user.id,
                )
            ).order_by(SwapRequest.created_at.desc())
        )
        accepted_swaps = swaps_result.scalars().all()

        if not accepted_swaps:
            return []

        convs = []
        seen  = set()

        for swap in accepted_swaps:
            partner_id = (
                swap.receiver_id
                if swap.sender_id == current_user.id
                else swap.sender_id
            )
            if partner_id in seen:
                continue
            seen.add(partner_id)

            # Fetch partner
            r = await db.execute(select(User).where(User.id == partner_id))
            other = r.scalar_one_or_none()
            if not other:
                continue

            # Last message
            lm_q = await db.execute(
                select(Message).where(
                    or_(
                        and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
                        and_(Message.sender_id == partner_id,       Message.receiver_id == current_user.id),
                    )
                ).order_by(Message.created_at.desc()).limit(1)
            )
            last = lm_q.scalar_one_or_none()

            # Unread count
            unread_q = await db.execute(
                select(func.count()).where(
                    Message.sender_id   == partner_id,
                    Message.receiver_id == current_user.id,
                    Message.is_read     == False,
                )
            )
            unread = unread_q.scalar_one() or 0

            convs.append({
                "other_user":       _serialize_user(other),
                "last_message":     last.content if last else None,
                "last_message_at":  last.created_at.isoformat() if last else None,
                "unread_count":     unread,
                "swap_request_id":  swap.id,
                "is_online":        manager.is_online(partner_id),
            })

        # Sort: conversations with messages first, then others
        convs.sort(key=lambda x: (
            x["last_message_at"] is None,   # no-message ones go last
            -(ord(x["last_message_at"][0]) if x["last_message_at"] else 0),
        ))

        return convs

    except Exception as e:
        logger.error(f"conversations error for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(500, f"Could not load conversations: {str(e)}")


# ────────────────────────────────
#  GET /messages/  — message history
# ────────────────────────────────
@router.get("/", response_model=List[MessageOut])
async def get_messages(
    other_user_id: int = Query(..., description="The other user's ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    if not await _can_chat(db, current_user.id, other_user_id):
        raise HTTPException(403, "You need an accepted swap with this user to chat.")

    result = await db.execute(
        select(Message).where(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id,   Message.receiver_id == current_user.id),
            )
        ).order_by(Message.created_at.asc())
    )
    msgs = result.scalars().all()

    # Mark as read
    await db.execute(
        update(Message)
        .where(
            Message.sender_id   == other_user_id,
            Message.receiver_id == current_user.id,
            Message.is_read     == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    return msgs


# ────────────────────────────────
#  POST /messages/  — REST send (WS fallback)
# ────────────────────────────────
@router.post("/", response_model=MessageOut, status_code=201)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    if not await _can_chat(db, current_user.id, data.receiver_id):
        raise HTTPException(403, "You need an accepted swap with this user to send messages.")

    swap = await _get_accepted_swap(db, current_user.id, data.receiver_id)
    msg  = Message(
        sender_id       = current_user.id,
        receiver_id     = data.receiver_id,
        content         = data.content,
        swap_request_id = swap.id if swap else data.swap_request_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ────────────────────────────────
#  Debug endpoint — check accepted swaps
# ────────────────────────────────
@router.get("/debug/my-swaps")
async def debug_swaps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Debug: shows your accepted swaps. Helps diagnose chat issues."""
    all_swaps = await db.execute(
        select(SwapRequest).where(
            or_(
                SwapRequest.sender_id   == current_user.id,
                SwapRequest.receiver_id == current_user.id,
            )
        )
    )
    swaps = all_swaps.scalars().all()
    return {
        "your_user_id": current_user.id,
        "all_swaps": [
            {"id": s.id, "sender_id": s.sender_id, "receiver_id": s.receiver_id, "status": s.status.value}
            for s in swaps
        ],
        "accepted_only": [
            {"id": s.id, "sender_id": s.sender_id, "receiver_id": s.receiver_id}
            for s in swaps if s.status == SwapStatus.ACCEPTED
        ],
    }
