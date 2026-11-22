import httpx
import numpy as np
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from controllers import drama_controller as dc, watchlist_controller as wc
from dependencies import CURRENT_USER_ID
from schemas import ClassifyIn
from services.llm import embed, explain
from store.models import DismissedDrama, Drama, User, WatchlistEntry

# How much a "no" pushes the deck away from that kind of drama
DISLIKE_WEIGHT = 0.3
# How strongly the typed direction overrides the taste learned from the list (0 = ignore, 1 = only direction)
DIRECTION_WEIGHT = 0.6


# ---- Helpers ---------------------------------------------------------------

def on_list_ids():
    return select(WatchlistEntry.drama_id).where(WatchlistEntry.user_id == CURRENT_USER_ID)


def dismissed_ids():
    return select(DismissedDrama.drama_id).where(DismissedDrama.user_id == CURRENT_USER_ID)


def unit(v: np.ndarray) -> np.ndarray:
    # Scale to length 1 so vectors mix by direction, not by size
    norm = np.linalg.norm(v)
    return v / norm if norm > 0 else v


def get_user(db: Session) -> User:
    user = db.get(User, CURRENT_USER_ID)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def ask_llm(prompt: str) -> str:
    # Ollama runs locally; if it is off, say so instead of a bare 500
    try:
        return explain(prompt)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="The local AI is not reachable. Is Ollama running?")


def embed_or_503(text: str) -> list[float]:
    try:
        return embed(text)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="The local AI is not reachable. Is Ollama running?")


# ---- Taste -----------------------------------------------------------------

def taste_vector(db: Session) -> list[float] | None:
    """Where the deck aims: what she liked, minus what she refused, steered by her direction."""
    entries = db.scalars(
        select(WatchlistEntry)
        .join(WatchlistEntry.drama)
        .where(WatchlistEntry.user_id == CURRENT_USER_ID, Drama.embedding.is_not(None))
    ).all()
    liked = []
    for entry in entries:
        liked.append(entry.drama.embedding)
        if entry.rewatch:
            # A drama worth rewatching is the strongest signal, so it weighs double
            liked.append(entry.drama.embedding)

    disliked = db.scalars(
        select(Drama.embedding).where(Drama.id.in_(dismissed_ids()), Drama.embedding.is_not(None))
    ).all()

    user = db.get(User, CURRENT_USER_ID)
    direction = user.direction_embedding if user is not None else None

    if not liked and direction is None:
        return None  # cold start: nothing to aim at yet, the deck falls back to top rated

    taste = unit(np.mean(liked, axis=0)) if liked else None
    if taste is not None and disliked:
        taste = unit(taste - DISLIKE_WEIGHT * unit(np.mean(disliked, axis=0)))

    if direction is not None:
        direction = unit(np.asarray(direction))
        taste = direction if taste is None else (1 - DIRECTION_WEIGHT) * taste + DIRECTION_WEIGHT * direction

    return unit(taste).tolist()


# ---- Deck ------------------------------------------------------------------

def load_deck(db: Session, limit: int, order: str = "for_you") -> list[Drama]:
    query = select(Drama).where(Drama.id.not_in(on_list_ids()), Drama.id.not_in(dismissed_ids()))
    taste = taste_vector(db) if order == "for_you" else None
    if taste is None:
        # Top rated: the seed inserted dramas best-rated first, so id order is rating order
        query = query.order_by(Drama.id)
    else:
        # Closest to her taste first; dramas without a synopsis (no embedding) go last
        query = query.order_by(Drama.embedding.cosine_distance(taste).nulls_last(), Drama.id)
    return db.scalars(query.limit(limit)).all()


def classify_drama(drama_id: int, body: ClassifyIn, db: Session):
    drama = dc.get_drama_by_id(db, drama_id)
    if body.choice == "no":
        existing = db.scalar(select(DismissedDrama).where(
            DismissedDrama.user_id == CURRENT_USER_ID,
            DismissedDrama.drama_id == drama_id))
        if existing:
            return
        db.add(DismissedDrama(user_id=CURRENT_USER_ID, drama_id=drama_id))
        db.commit()
        return
    entry = wc.add_drama(db, drama.tmdb_id)
    if body.choice == "want":
        entry.status = "planned"
    else:
        entry.status = "done"
        entry.current_episode = drama.total_episodes or 0
        entry.rewatch = body.choice == "rewatch"
    db.commit()


def undo_dismissal(db: Session, drama_id: int):
    dc.get_drama_by_id(db, drama_id)
    entry = db.scalar(select(DismissedDrama).where(
        DismissedDrama.user_id == CURRENT_USER_ID,
        DismissedDrama.drama_id == drama_id))
    if not entry:
        return
    db.delete(entry)
    db.commit()


# ---- Direction -------------------------------------------------------------

def direction_out(user: User) -> dict:
    return {"direction": user.direction, "description": user.direction_description}


def get_direction(db: Session) -> dict:
    return direction_out(get_user(db))


def set_direction(db: Session, text: str) -> dict:
    user = get_user(db)
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Tell me what you are in the mood for")

    # Embeddings do not understand "no" or "not": embedding "no tragedy" as-is would pull
    # the deck TOWARD tragedy. So qwen first rewrites the wish as a positive description.
    prompt = f"""Someone describes the Chinese drama they want to watch next: "{text}"

Rewrite their wish as a short description of that drama (genre, mood, setting, themes),
written like a synopsis blurb. Describe only what they DO want; turn anything they don't
want into its opposite (for example "no tragedy" becomes "warm, hopeful, happy ending").
Answer with the description only, in 2 or 3 sentences, in English."""
    description = ask_llm(prompt)

    user.direction = text
    user.direction_description = description
    user.direction_embedding = embed_or_503(description)
    db.commit()
    return direction_out(user)


def clear_direction(db: Session):
    user = get_user(db)
    user.direction = None
    user.direction_description = None
    user.direction_embedding = None
    db.commit()


# ---- Talking about one drama -----------------------------------------------

def ask_about(db: Session, drama_id: int, question: str) -> dict:
    drama = dc.get_drama_by_id(db, drama_id)
    question = question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Ask a question")
    if not drama.overview:
        raise HTTPException(status_code=400, detail="TMDB has no synopsis for this drama, so I can't tell")

    prompt = f"""Drama: {drama.title} ({drama.original_title or ""}). Genres: {drama.genres}.
Synopsis: {drama.overview}

A viewer deciding whether to start this drama asks: "{question}"

Answer in 2 or 3 sentences, using only the synopsis and genres above.
Do not reveal plot twists or the ending. If the synopsis does not say, answer
that you are not sure and say what the synopsis does suggest. Answer in English."""
    return {"text": ask_llm(prompt)}


def get_reason(db: Session, drama_id: int) -> dict:
    drama = dc.get_drama_by_id(db, drama_id)
    if drama.reason:
        return {"text": drama.reason}  # cached
    if drama.embedding is None or not drama.overview:
        raise HTTPException(status_code=400, detail="TMDB has no synopsis for this drama yet")

    # The 3 dramas on her list that are most similar to this one ground the explanation
    closest = db.scalars(
        select(Drama)
        .where(Drama.id.in_(on_list_ids()), Drama.embedding.is_not(None))
        .order_by(Drama.embedding.cosine_distance(drama.embedding))
        .limit(3)
    ).all()
    if not closest:
        raise HTTPException(status_code=400, detail="Add a few dramas to your list first")

    titles = ", ".join(d.title for d in closest)
    prompt = f"""She enjoyed these Chinese dramas: {titles}.

In two short sentences, tell her why she might enjoy "{drama.title}".
Its genres: {drama.genres}. Its synopsis: {drama.overview}

Connect it to the dramas she enjoyed by name. Do not spoil the plot. Speak to her directly
("you"). Answer in English."""
    drama.reason = ask_llm(prompt)
    db.commit()
    return {"text": drama.reason}
