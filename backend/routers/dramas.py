from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import DramaOut, SearchResult
from services.catalog import get_or_create_drama
from store.db import get_db

from controllers import drama_controller as dc

router = APIRouter(prefix="/dramas", tags=["dramas"])

@router.get("/search", response_model=list[SearchResult]) 
def search_dramas(q: str, db: Session = Depends(get_db)):
    return dc.search_drama(db, q)

@router.get("/{drama_id}", response_model=DramaOut)
def read_drama(drama_id: int, db: Session = Depends(get_db)):
    return dc.get_drama_by_id(db, drama_id)

@router.post("/{tmdb_id}", response_model=DramaOut)
def add_drama(tmdb_id: int, db: Session = Depends(get_db)):
    return get_or_create_drama(tmdb_id, db)
