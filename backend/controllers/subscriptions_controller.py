from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from store.models import Subscription, Platform
from schemas import SubscriptionIn, SubscriptionOut

from dependencies import CURRENT_USER_ID

def set_subscription(db: Session, body: SubscriptionIn, platform_id: int) -> Subscription:
    platform = db.scalar(select(Platform).where(Platform.id == platform_id))
    if platform is None:
        raise HTTPException(status_code=404, detail="Platform not found.")
    sub = db.scalar(select(Subscription).where(Subscription.user_id == CURRENT_USER_ID,
                                               Subscription.platform_id == platform_id))
    if sub is None: 
        sub = Subscription(user_id = CURRENT_USER_ID,
                           platform_id = platform_id)
        db.add(sub)
    sub.tier = body.tier
    sub.renewal_date = body.renewal_date
    db.commit()
    db.refresh(sub)
    return sub

def get_subscriptions(db: Session) -> SubscriptionOut:
    return db.scalars(select(Subscription).
                      where(Subscription.user_id == CURRENT_USER_ID)).all()