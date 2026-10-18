from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, Field, ConfigDict 
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

# from user import create_user, authenticate_user, create_session, end_session, get_user_email
from db import get_db
from models import Drama, WatchlistEntry
from tmdb import search_tmdb, get_drama


app = FastAPI()
bearer = HTTPBearer()

CURRENT_USER_ID = 1

# ---- 1. Class using Pydantic BaseModel --------------------------------------

# --- User ---

# --- DB ops class ---

class DramaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tmdb_id: int
    title: str
    original_title: str | None
    total_episodes: int | None
    poster_path: str | None
    last_synced_at: datetime

class WatchlistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    drama_id: int
    status: str
    current_episode: int

# ----- 2. Helper functions ---------------------------------------------------

def get_or_create_drama(tmdb_id: int, db: Session):
    existing = db.scalar(select(Drama).where(Drama.tmdb_id == tmdb_id))
    if existing: 
        return existing
    data = get_drama(tmdb_id)
    drama = Drama(tmdb_id = tmdb_id, title=data["name"],
                  original_title = data["original_name"],
                  total_episodes=data["number_of_episodes"],
                  poster_path = data.get("poster_path"))
    db.add(drama)
    db.commit()
    db.refresh(drama)
    return drama

# ----- 3. Endpoints ----------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/dramas",response_model=list[DramaOut])
def list_dramas(db: Session = Depends(get_db)):
    return db.scalars(select(Drama)).all()

@app.get("/dramas/search")
def search_dramas(q: str):
    results = search_tmdb(q)
    drama_list=[]
    for row in results:
        drama_list.append({"tmdb_id": row["id"], "title": row["name"], 
                           "original_title": row["original_name"], 
                           "poster_path": row.get("poster_path")})
    return drama_list

@app.post("/dramas/{tmdb_id}", response_model=DramaOut)
def add_drama(tmdb_id: int, db: Session = Depends(get_db)):
    return get_or_create_drama(tmdb_id, db)

@app.get("/watchlist",response_model=list[WatchlistOut])
def list_watchlist_dramas(db: Session = Depends(get_db)):
    return db.scalars(select(WatchlistEntry)).all()

@app.post("/watchlist/{tmdb_id}", response_model=WatchlistOut)
def add_drama_to_watchlist(tmdb_id: int, db: Session = Depends(get_db)):
    drama = get_or_create_drama(tmdb_id, db)
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

