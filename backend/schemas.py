from pydantic import BaseModel, Field, ConfigDict 
from datetime import datetime, date

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

class SearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int | None = None          # set only when the drama is already in our catalog
    tmdb_id: int
    title: str
    original_title: str | None
    poster_path: str | None