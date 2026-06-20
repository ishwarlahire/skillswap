from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotifType

async def create_notif(
    db: AsyncSession,
    user_id: int,
    notif_type: NotifType,
    title: str,
    body: str = None,
    link: str = None,
):
    n = Notification(user_id=user_id, type=notif_type, title=title, body=body, link=link)
    db.add(n)
    # caller must commit
    return n
