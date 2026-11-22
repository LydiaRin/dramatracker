from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from controllers import discover_controller as dc
from schemas import AskIn, ClassifyIn, DirectionIn, DirectionOut, DramaOut, TextOut
from store.db import get_db

router = APIRouter(prefix="/discover", tags=["discover"])

@router.get("", response_model=list[DramaOut])
def discover_deck(limit: int = 20, order: Literal["for_you", "top"] = "for_you",
                  db: Session = Depends(get_db)):
    return dc.load_deck(db, limit, order)

# The fixed /direction routes must come before /{drama_id}, or "direction" would be read as an id
@router.get("/direction", response_model=DirectionOut)
def get_direction(db: Session = Depends(get_db)):
    return dc.get_direction(db)

@router.put("/direction", response_model=DirectionOut)
def set_direction(body: DirectionIn, db: Session = Depends(get_db)):
    return dc.set_direction(db, body.text)

@router.delete("/direction", status_code=204)
def clear_direction(db: Session = Depends(get_db)):
    dc.clear_direction(db)

@router.post("/{drama_id}", status_code=204)
def classify_drama(drama_id: int, body: ClassifyIn, db: Session = Depends(get_db)):
    dc.classify_drama(drama_id, body, db)

@router.delete("/{drama_id}", status_code=204)
def undo_dismissal(drama_id: int, db: Session = Depends(get_db)):
    dc.undo_dismissal(db, drama_id)

@router.post("/{drama_id}/ask", response_model=TextOut)
def ask_about(drama_id: int, body: AskIn, db: Session = Depends(get_db)):
    return dc.ask_about(db, drama_id, body.question)

@router.get("/{drama_id}/reason", response_model=TextOut)
def get_reason(drama_id: int, db: Session = Depends(get_db)):
    return dc.get_reason(db, drama_id)
