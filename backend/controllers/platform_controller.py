from sqlalchemy.orm import Session
from sqlalchemy import select
from store.models import Platform

def get_plateforms(db: Session):
    return db.scalars(select(Platform)).all()