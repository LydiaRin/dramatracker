# Fills backdrop_path and accent for dramas saved before those columns existed.
# Lighter than a full upsert: one TMDB call and one tiny poster download per drama, no re-embedding.
# Run from backend/:  python -m scripts.backfill_art
import httpx
from sqlalchemy import or_, select

from services.accent import poster_accent
from services.tmdb import get_drama
from store.db import SessionLocal
from store.models import Drama


def main():
    db = SessionLocal()
    try:
        dramas = db.scalars(select(Drama).where(or_(Drama.accent.is_(None), Drama.backdrop_path.is_(None)))).all()
        for i, drama in enumerate(dramas, 1):
            try:
                data = get_drama(drama.tmdb_id)
                drama.backdrop_path = data.get("backdrop_path")
                drama.poster_path = data.get("poster_path") or drama.poster_path
                drama.accent = poster_accent(drama.poster_path)
                db.commit()
                print(f"{i}/{len(dramas)} {drama.title}: {drama.accent or 'no colour (grey poster)'}")
            except httpx.HTTPError as e:
                db.rollback()
                print(f"Could not update {drama.title}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
