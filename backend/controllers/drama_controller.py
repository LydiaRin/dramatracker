from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from store.models import Drama
from schemas import SearchResult
from services.tmdb import search_tmdb

def get_drama_by_id(db: Session, drama_id: int) -> Drama:
    drama = db.get(Drama, drama_id)
    if drama is None:
        raise HTTPException(status_code=404, detail="Drama not found")
    return drama

def search_drama(db: Session, q: str) -> list[SearchResult]:
    db_results = db.scalars(select(Drama).where(or_(
        Drama.title.ilike(f"%{q}%"),
        Drama.original_title.ilike(f"%{q}%"),
    ))).all()
    if len(db_results) != 0:
        return db_results
    results = search_tmdb(q)
    drama_list=[]
    for row in results:
        drama_list.append({"tmdb_id": row["id"], "title": row["name"], 
                        "original_title": row["original_name"], 
                        "poster_path": row.get("poster_path")})
    return drama_list
