from pydantic import BaseModel, Field, ConfigDict 
from datetime import datetime, date
from typing import Literal

# ---- Class using Pydantic BaseModel --------------------------------------

class DramaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tmdb_id: int
    title: str
    original_title: str | None
    total_episodes: int | None
    poster_path: str | None
    overview: str | None = None    # shown on the deck card so she can decide
    genres: str | None = None
    backdrop_path: str | None = None
    accent: str | None = None
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


class ClassifyIn(BaseModel):
    choice: Literal["want", "no", "watched", "rewatch"]

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

# ---- Discover deck: direction and talking with the local AI ----------------

class DirectionIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)

class DirectionOut(BaseModel):
    direction: str | None          # what she typed
    description: str | None        # qwen's rewrite, which is what gets embedded

class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)

class TextOut(BaseModel):
    text: str
