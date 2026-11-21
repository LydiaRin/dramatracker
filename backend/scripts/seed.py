from sqlalchemy import select

from store.db import SessionLocal
from store.models import Drama
from services.tmdb import discover_top_cdramas, get_drama
from services.catalog import upsert_drama, sync_providers

PAGES = 100          # 20 dramas per page → up to ~100
MIN_EPISODES = 12  # skip specials and very short series


def main():
    db = SessionLocal()
    try:
        # 1. Top-rated C-dramas (new ones get providers synced automatically)
        for page in range(1, PAGES + 1):
            try:
                shows = discover_top_cdramas(page)
            except Exception as e:
                print(f"✗ page {page}: {e}")
                continue
            for show in shows:
                try:
                    details = get_drama(show["id"])
                    if (details.get("number_of_episodes") or 0) < MIN_EPISODES:
                        print(f"– skipped {show.get('name')} (too short)")
                        continue
                    drama = upsert_drama(db, details)
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