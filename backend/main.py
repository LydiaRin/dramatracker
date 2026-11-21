from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import discover, dramas, platforms, subscriptions, watchlist, recommendations

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health checkpoint
@app.get("/health")
def health():
    return {"status": "ok"}

# ----- Router -------------------------------------------------------------

app.include_router(discover.router)
app.include_router(dramas.router)
app.include_router(platforms.router)
app.include_router(subscriptions.router)
app.include_router(watchlist.router)
app.include_router(recommendations.router)

