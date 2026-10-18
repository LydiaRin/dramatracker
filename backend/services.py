from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Drama, Platform, DramaPlatform
from tmdb import get_drama, get_watch_providers

def get_or_create_platform(db: Session, tmdb_provider_id: int, name: str, logo_path: str | None):
    existing = db.scalar(select(Platform).where(Platform.tmdb_provider_id == tmdb_provider_id))
    if existing:
        return existing
    platform = Platform(tmdb_provider_id=tmdb_provider_id, name=name, logo_path=logo_path)
    db.add(platform)
    db.commit()
    db.refresh(platform)
    return platform

def sync_providers(db: Session, drama: Drama, region="US"):
    results = get_watch_providers(drama.tmdb_id)
    country = results.get(region, {})

    for type in ["flatrate", "ads", "buy", "rent"]:
        for provider in country.get(type, []):
            platform = get_or_create_platform(db, provider["provider_id"], 
                                provider["provider_name"], provider.get("logo_path"))
            existing = db.scalar(select(DramaPlatform).where(
                                    DramaPlatform.drama_id == drama.id,
                                    DramaPlatform.platform_id == platform.id,
                                    DramaPlatform.region == region,
                                    DramaPlatform.type == type,
                                    ))
            if existing is None:
                db.add(DramaPlatform(drama_id=drama.id, platform_id=platform.id,
                                    region=region, type=type))
    db.commit()

def get_or_create_drama(tmdb_id: int, db: Session):
    existing = db.scalar(select(Drama).where(Drama.tmdb_id == tmdb_id))
    if existing: 
        return existing
    data = get_drama(tmdb_id)
    drama = Drama(tmdb_id = tmdb_id, title=data["name"],
                  original_title = data["original_name"],
                  total_episodes=data["number_of_episodes"],
                  poster_path = data.get("poster_path"))
    db.add(drama)
    db.commit()
    db.refresh(drama)
    sync_providers(db, drama)
    return drama
