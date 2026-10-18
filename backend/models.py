from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime
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
    
