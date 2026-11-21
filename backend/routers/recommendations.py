from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from controllers import recommendation_controller as rc
from schemas import DramaOut
from store.db import get_db

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[DramaOut])
def recommendations(limit: int = 10, db: Session = Depends(get_db)):
    return rc.recommend(db, limit)