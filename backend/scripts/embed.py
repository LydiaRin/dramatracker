from sqlalchemy import select
from services.llm import embed 
from store.db import SessionLocal
from store.models import Drama

def main():
    db = SessionLocal()
    try:
        dramas = db.scalars(select(Drama).where(Drama.embedding.is_(None),
                                                Drama.overview.is_not(None))).all()
        for i, drama in enumerate (dramas, 1):
            try:
                text = f"{drama.title}. Genres: {drama.genres}. {drama.overview}"
                drama.embedding = embed(text)
                print(f"{i}/{len(dramas)} {drama.title}")
                if i % 20 == 0:
                    db.commit()
            except Exception as e:
                db.rollback()
                print(f"Could not update {drama.title}: {e}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()