from sqlalchemy import select

from store.db import SessionLocal
from store.models import Drama
from services.tmdb import get_drama
from services.catalog import upsert_drama

def main():
    db = SessionLocal()
    try:
        dramas = db.scalars(select(Drama).where(Drama.overview.is_(None))).all()
        for i, drama in enumerate (dramas, 1):
            try: 
                upsert_drama(db, get_drama(drama.tmdb_id))
                print(f"{i}/{len(dramas)} {drama.title}")
            except Exception as e:
                db.rollback()
                print(f"Could not update {drama.title}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()