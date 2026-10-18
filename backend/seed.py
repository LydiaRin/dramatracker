from sqlalchemy import select

from db import SessionLocal
from models import Drama
from tmdb import discover_popular
from services import get_or_create_drama, sync_providers

PAGES = 5  # 20 dramas per page → ~100


def main():
    db = SessionLocal()
    try:
        # 1. Popular C-dramas (new ones get providers synced automatically)
        for page in range(1, PAGES + 1):
            for show in discover_popular(page):
                try:
                    drama = get_or_create_drama(show["id"], db)
                    print(f"✓ {drama.title}")
                except Exception as e:
                    db.rollback()
                    print(f"✗ {show.get('name')}: {e}")

        # 2. Backfill providers for dramas added before today
        for drama in db.scalars(select(Drama)).all():
            try:
                sync_providers(db, drama)
            except Exception as e:
                db.rollback()
                print(f"✗ providers for {drama.title}: {e}")

        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()