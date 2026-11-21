from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import PlatformOut
from store.db import get_db

from controllers import platform_controller as pc

router = APIRouter(prefix="/platforms", tags=["plateforms"])

@router.get("",response_model=list[PlatformOut])
def list_platforms(db: Session = Depends(get_db)):
    return pc.get_plateforms(db)
