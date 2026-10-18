from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, Field, ConfigDict 
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, date

# from user import create_user, authenticate_user, create_session, end_session, get_user_email
from db import get_db
from models import Drama, WatchlistEntry, Platform, Subscription
from tmdb import search_tmdb
from services import get_or_create_drama


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

class PlatformOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str

class WatchlistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    drama_id: int
    status: str
    current_episode: int
    drama: DramaOut
    platform: PlatformOut | None

class WatchlistUpdate(BaseModel):
    current_episode: int | None = Field(default=None, ge=0)
    status: str | None = None
    platform_id: int | None = None

class SubscriptionIn(BaseModel):
    tier: str = "free"
    renewal_date: date | None = None

class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tier: str
    renewal_date: date | None
    platform: PlatformOut

# ----- 2. Helper functions ---------------------------------------------------

def get_entry(entry_id: int, db: Session):
    entry = db.scalar(select(WatchlistEntry).where(
                        WatchlistEntry.id == entry_id,
                        WatchlistEntry.user_id == CURRENT_USER_ID,
                        ))
    if entry is None:
        raise HTTPException(status_code=404, detail="Drama not in Watchlist")
    return entry

# ----- 3. Endpoints ----------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/dramas",response_model=list[DramaOut])
def list_dramas(db: Session = Depends(get_db)):
    return db.scalars(select(Drama)).all()

@app.get("/platforms",response_model=list[PlatformOut])
def list_platforms(db: Session = Depends(get_db)):
    return db.scalars(select(Platform)).all()

@app.put("/subscriptions/{platform_id}", response_model=SubscriptionOut)
def set_subscription(platform_id: int, body: SubscriptionIn, db: Session = Depends(get_db)):
    platform = db.scalar(select(Platform).where(Platform.id == platform_id))
    if platform is None:
        raise HTTPException(status_code=404, detail="Platform not found.")
    sub = db.scalar(select(Subscription).where(Subscription.user_id == CURRENT_USER_ID,
                                               Subscription.platform_id == platform_id))
    if sub is None: 
        sub = Subscription(user_id = CURRENT_USER_ID,
                           platform_id = platform_id)
        db.add(sub)
    sub.tier = body.tier
    sub.renewal_date = body.renewal_date
    db.commit()
    db.refresh(sub)
    return sub
    
@app.get("/subscriptions",response_model=list[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db)):
    return db.scalars(select(Subscription).
                      where(Subscription.user_id == CURRENT_USER_ID)).all()
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
    return db.scalars(select(WatchlistEntry).
                      where(WatchlistEntry.user_id == CURRENT_USER_ID)).all()

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

@app.delete("/watchlist/{entry_id}", status_code=204)
def del_drama_from_watchlist(entry_id: int, db: Session = Depends(get_db)):
    entry = get_entry(entry_id, db)
    db.delete(entry)
    db.commit()
    return
    
@app.patch("/watchlist/{entry_id}", response_model=WatchlistOut)
def update_watchlist_entry(entry_id: int, update: WatchlistUpdate, db: Session = Depends(get_db)):
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