import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from dependencies import CURRENT_USER_ID
from store.models import DismissedDrama, Drama, WatchlistEntry


def recommend(db: Session, limit: int) -> list[Drama]:
    # Everything on the list counts as a signal of taste: watched, watching and "want to watch"
    entries = db.scalars(
        select(WatchlistEntry)
        .join(WatchlistEntry.drama)
        .where(WatchlistEntry.user_id == CURRENT_USER_ID, Drama.embedding.is_not(None))
    ).all()
    if not entries:
        return []

    vectors = []
    for entry in entries:
        vectors.append(entry.drama.embedding)
        if entry.rewatch:
            # A drama worth rewatching is the strongest signal, so it weighs double
            vectors.append(entry.drama.embedding)

    # The taste vector sits at the centre of everything she liked
    taste = np.mean(vectors, axis=0).tolist()

    # Same exclusions as the Discover deck: nothing already on the list or dismissed
    on_list = select(WatchlistEntry.drama_id).where(WatchlistEntry.user_id == CURRENT_USER_ID)
    dismissed = select(DismissedDrama.drama_id).where(DismissedDrama.user_id == CURRENT_USER_ID)

    return db.scalars(
        select(Drama)
        .where(
            Drama.id.not_in(on_list),
            Drama.id.not_in(dismissed),
            Drama.embedding.is_not(None),
        )
        # Smallest cosine distance = closest to her taste
        .order_by(Drama.embedding.cosine_distance(taste))
        .limit(limit)
    ).all()