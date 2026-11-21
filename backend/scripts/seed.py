from sqlalchemy import select

from db import SessionLocal
from models import Drama
from tmdb import discover_top_cdramas, get_drama
from services import get_or_create_drama, sync_providers

PAGES = 10          # 20 dramas per page → up to ~100
MIN_EPISODES = 12  # skip specials and very short series


def main():
    db = SessionLocal()
    try:
        # 1. Top-rated C-dramas (new ones get providers synced automatically)
        for page in range(1, PAGES + 1):
            for show in discover_top_cdramas(page):
                try:
                    details = get_drama(show["id"])
                    if (details.get("number_of_episodes") or 0) < MIN_EPISODES:
                        print(f"– skipped {show.get('name')} (too short)")
                        continue
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