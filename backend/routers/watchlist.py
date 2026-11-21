from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import WatchlistOut, WatchlistUpdate
from store.db import get_db

from controllers import watchlist_controller as wc

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

@router.get("",response_model=list[WatchlistOut])
def list_watchlist_dramas(db: Session = Depends(get_db)):
    return wc.get_dramas(db)

@router.post("/{tmdb_id}", response_model=WatchlistOut)
def add_to_watchlist(tmdb_id: int, db: Session = Depends(get_db)):
    return wc.add_drama(db, tmdb_id)

@router.delete("/{entry_id}", status_code=204)
def del_drama_from_watchlist(entry_id: int, db: Session = Depends(get_db)):
    wc.delete_drama(db, entry_id)
    return
    
@router.patch("/{entry_id}", response_model=WatchlistOut)
def update_watchlist_entry(entry_id: int, update: WatchlistUpdate, db: Session = Depends(get_db)):
    return wc.update_drama(db, entry_id, update)
