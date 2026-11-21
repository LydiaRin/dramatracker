from datetime import datetime, timezone, date
from sqlalchemy import Integer, String, DateTime, ForeignKey, UniqueConstraint, Date, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

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
    platform_id: Mapped[int | None] = mapped_column(ForeignKey("platforms.id"))
    rewatch: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    platform: Mapped["Platform | None"] = relationship()
    drama: Mapped["Drama"] = relationship()

class DismissedDramas(Base):
    __tablename__ = "dismissed_dramas"
    __table_args__ = (UniqueConstraint("user_id", "drama_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    drama_id: Mapped[int] = mapped_column(ForeignKey("dramas.id"))
    

class Platform(Base):
    __tablename__ = "platforms"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    tmdb_provider_id: Mapped[int | None] = mapped_column(unique=True)
    logo_path: Mapped[str | None]

class DramaPlatform(Base):
    __tablename__ = "drama_platforms"
    __table_args__ = (UniqueConstraint("drama_id", "platform_id", "region", "type"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    drama_id: Mapped[int] = mapped_column(ForeignKey("dramas.id"))
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"))
    region: Mapped[str] = mapped_column(default="US")
    type: Mapped[str]            # "flatrate", "ads", "buy", "rent"
    platform: Mapped["Platform"] = relationship()

class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (UniqueConstraint("user_id", "platform_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"))
    tier: Mapped[str] = mapped_column(default="free")
    renewal_date: Mapped[date | None] = mapped_column(Date)
    platform: Mapped["Platform"] = relationship()