from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import DramaOut
from store.db import get_db

from controllers import discover_controller as dc

router = APIRouter(prefix="/discover", tags=["discover"])

@router.get("", response_model=list[DramaOut])
def discover_deck(limit: int = 20, db: Session = Depends(get_db)):
    return dc.load_deck(db, limit)