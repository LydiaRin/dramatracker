from sqlalchemy.orm import Session
from sqlalchemy import select
from schemas import DramaOut
from store.models import WatchlistEntry, DismissedDramas, Drama

from dependencies import CURRENT_USER_ID

def load_deck( db: Session, limit: int) -> list[DramaOut]:
    on_list = select(WatchlistEntry.drama_id).where(
        WatchlistEntry.user_id == CURRENT_USER_ID)
    dismissed = select(DismissedDramas.drama_id).where(
        DismissedDramas.user_id == CURRENT_USER_ID)
    return db.scalars(select(Drama)
        .where(Drama.id.not_in(on_list), Drama.id.not_in(dismissed))
        .order_by(Drama.id).limit(limit)).all()

