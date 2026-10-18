from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, ConfigDict 
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

# from user import create_user, authenticate_user, create_session, end_session, get_user_email
from db import get_db
from models import Drama
from tmdb import search_tmdb, get_drama


app = FastAPI()
bearer = HTTPBearer()


# ---- 1. Class using Pydantic BaseModel --------------------------------------

# --- User ---
class UserCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


# ----- 2. DB ops class -------------------------------------------------------

class DramaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tmdb_id: int
    title: str
    original_title: str | None
    total_episodes: int | None
    poster_path: str | None
    last_synced_at: datetime

# ----- 2. Helper functions ---------------------------------------------------

# def get_current_user(credentials: HTTPAuthorizationCredentials=Depends(bearer)):
#     email = get_user_email(credentials.credentials)
#     if email is None:
#         raise HTTPException(status_code=401, detail="Invalid token")
#     return email


# ----- 3. Endpoints ----------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/dramas")
def list_dramas(db: Session = Depends(get_db)):
    return db.scalars(select(Drama)).all()

@app.get("/dramas/search")
def search_dramas(q: str):
    results = search_tmdb(q)
    drama_list=[]
    for row in results:
        drama_list.append({"tmdb_id": row["id"], "title": row["name"], 
                           "original_title": row["original_name"], 
                           "poster_path": row.get("poster_path")})
    return drama_list

@app.post("/dramas/{tmdb_id}", response_model=DramaOut)
def add_drama(tmdb_id: int, db: Session = Depends(get_db)):
    existing = db.scalar(select(Drama).where(Drama.tmdb_id == tmdb_id))
    if existing: 
        return existing
    data = get_drama(tmdb_id)
    drama = Drama(tmdb_id = tmdb_id, title=data["name"],
                  original_title = data["original_name"],
                  total_episodes=data["number_of_episodes"],
                  poster_path = data.get("poster_path"))
    db.add(drama)
    db.commit()
    db.refresh(drama)
    return drama

# GET /dramas/search?q=...
# def search_dramas(q: str):
#     results = search_tv(q)
#     return a trimmed list: for each show, keep only
#         tmdb_id, title, original_title, poster_path

# @app.post("/auth/register")
# def register_user(user: UserCredentials):
#     if not create_user(user.email, user.password):
#         raise HTTPException(status_code=409, detail="Email already registered")
#     return{"message" : "User registered"}

# @app.post("/auth/login")
# def user_login(user: UserCredentials):
#     if not authenticate_user(user.email, user.password):
#         raise HTTPException(status_code=401, detail="Invalid email or password")
#     token = create_session(user.email)
#     return {"token": token,"email" : user.email}

# @app.post("/auth/logout")
# def user_logout(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
#     if end_session(credentials.credentials) is None:
#         raise HTTPException(status_code=401, detail="Invalid token")
#     return {"message": "Logged out"}

# @app.get("/auth/me")
# def valid_token(current_user: str = Depends(get_current_user)):
#     return {"email": current_user}
