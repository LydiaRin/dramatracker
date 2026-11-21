from sqlalchemy.orm import Session
from sqlalchemy import select
from schemas import DramaOut, ClassifyIn
from store.models import WatchlistEntry, DismissedDrama, Drama
from controllers import drama_controller as dc, watchlist_controller as wc


from dependencies import CURRENT_USER_ID

def load_deck( db: Session, limit: int) -> list[DramaOut]:
    on_list = select(WatchlistEntry.drama_id).where(
        WatchlistEntry.user_id == CURRENT_USER_ID)
    dismissed = select(DismissedDrama.drama_id).where(
        DismissedDrama.user_id == CURRENT_USER_ID)
    return db.scalars(select(Drama)
        .where(Drama.id.not_in(on_list), Drama.id.not_in(dismissed))
        .order_by(Drama.id).limit(limit)).all()


def classify_drama(drama_id: int, body: ClassifyIn, db: Session):
    drama = dc.get_drama_by_id(db, drama_id)
    if body.choice == "no":
        existing = db.scalar(select(DismissedDrama).where(
        DismissedDrama.user_id == CURRENT_USER_ID,
        DismissedDrama.drama_id == drama_id))
        if existing: return
        entry = DismissedDrama(user_id = CURRENT_USER_ID, 
                                    drama_id=drama_id)
        db.add(entry)
        db.commit()
        return
    else:
        entry = wc.add_drama(db, drama.tmdb_id)
        if body.choice == "want":
            entry.status = "planned"
        else:
            entry.status = "done"
            entry.current_episode = drama.total_episodes or 0
            entry.rewatch = body.choice == "rewatch"
        db.commit()

    
def undo_dismissal(db: Session, drama_id: int):
    dc.get_drama_by_id(db, drama_id)
    entry = db.scalar(select(DismissedDrama).where(
        DismissedDrama.user_id == CURRENT_USER_ID,
        DismissedDrama.drama_id == drama_id))
    if not entry: return
    
    db.delete(entry)
    db.commit()
