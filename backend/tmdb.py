import os
from dotenv import load_dotenv
import httpx

load_dotenv()
auth = "Bearer " + os.environ["TMDB_API_KEY"]

BASE_URL = "https://api.themoviedb.org/3"
HEADERS= {"Authorization": auth}

def search_drama(query):
    params = {"query": query}
    response = httpx.get(f"{BASE_URL}/search/tv", 
                         params=params, 
                         headers=HEADERS)
    response.raise_for_status()     # ← that's it
    return response.json()["results"]


def get_drama(tmdb_id):
    response = httpx.get(f"{BASE_URL}/tv/{tmdb_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()
