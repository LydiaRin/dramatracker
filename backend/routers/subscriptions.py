from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from schemas import SubscriptionOut, SubscriptionIn
from store.models import Subscription
from store.db import get_db

from controllers import subscriptions_controller as sc 

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])
CURRENT_USER_ID = 1

@router.put("/{platform_id}", response_model=SubscriptionOut)
def add_subscription(platform_id: int, body: SubscriptionIn, db: Session = Depends(get_db)):
    return sc.set_subscription(db, body, platform_id)
    
@router.get("",response_model=list[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db)):
    return sc.get_subscriptions(db)

