from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Drama(Base):
    __tablename__ = "dramas"
    id: Mapped[int] = mapped_column(primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True)
    title: Mapped[str] = mapped_column(String)
    original_title: Mapped[str | None] = mapped_column(String)
    total_episodes: Mapped[int | None]
    poster_path: Mapped[str | None]
    last_synced_at: Mapped[datetime] = mapped_column(
                    DateTime(timezone=True), 
                    default=lambda: datetime.now(timezone.utc))
    

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)

class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"
    __table_args__ = (UniqueConstraint("user_id", "drama_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    drama_id: Mapped[int] = mapped_column(ForeignKey("dramas.id"))
    status: Mapped[str] = mapped_column(default="watching")
    current_episode: Mapped[int] = mapped_column(default=0)