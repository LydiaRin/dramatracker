
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from store.models import WatchlistEntry, Platform
from schemas import WatchlistOut, WatchlistUpdate
from services import catalog

from dependencies import CURRENT_USER_ID

def get_entry(entry_id: int, db: Session):
    entry = db.scalar(select(WatchlistEntry).where(
                        WatchlistEntry.id == entry_id,
                        WatchlistEntry.user_id == CURRENT_USER_ID,
                        ))
    if entry is None:
        raise HTTPException(status_code=404, detail="Drama not in Watchlist")
    return entry


def get_dramas(db: Session) -> WatchlistOut:
    return db.scalars(select(WatchlistEntry).
                      where(WatchlistEntry.user_id == CURRENT_USER_ID)).all()

def add_drama(db: Session, tmdb_id: int) -> WatchlistOut:
    drama = catalog.get_or_create_drama(tmdb_id, db)
    existing = db.scalar(select(WatchlistEntry).where(
                            WatchlistEntry.user_id == CURRENT_USER_ID,
                            WatchlistEntry.drama_id == drama.id,
                        ))#change CURRENT_USER_ID to user_id later 
    if existing: return existing
    entry = WatchlistEntry(user_id = CURRENT_USER_ID, 
                           drama_id=drama.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def delete_drama( db: Session, entry_id: int):
    entry = get_entry(entry_id, db)
    db.delete(entry)
    db.commit()
    return

def update_drama( db: Session, entry_id: int, update: WatchlistUpdate) -> WatchlistEntry:
    entry = get_entry(entry_id, db)
    if update.current_episode is not None:
        total = entry.drama.total_episodes
        if total is not None and update.current_episode > total:
            raise HTTPException(status_code=400,
                                detail=f"Episode must be between 0 and {total}")
        entry.current_episode = update.current_episode
    if update.status is not None:
        entry.status = update.status
    if update.platform_id is not None:
        if db.get(Platform, update.platform_id) is None:
            raise HTTPException(status_code=404, detail="Platform not found")
        entry.platform_id = update.platform_id
    db.commit()
    db.refresh(entry)
    return entry