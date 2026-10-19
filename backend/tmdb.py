import os
from dotenv import load_dotenv
import httpx

MAX_PAGES = 10

load_dotenv()
auth = "Bearer " + os.environ["TMDB_API_KEY"]

BASE_URL = "https://api.themoviedb.org/3"
HEADERS= {"Authorization": auth}

def search_tmdb(query):
    results = []
    page = 1
    while page <= MAX_PAGES:
        params = {"query": query, "page": page}
        response = httpx.get(f"{BASE_URL}/search/tv", 
                         params=params, 
                         headers=HEADERS)
        response.raise_for_status()
        response = response.json()
        search_results = response["results"]
        for r in search_results:
                if "CN" in r.get("origin_country", []) or r.get("original_language") == "zh":
                    results.append(r)
        if page >= response["total_pages"]: break
        page += 1
    results.sort(key=lambda show: show.get("popularity", 0), reverse=True)
    return results


def get_drama(tmdb_id):
    response = httpx.get(f"{BASE_URL}/tv/{tmdb_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()


def get_watch_providers(tmdb_id):
    response = httpx.get(f"{BASE_URL}/tv/{tmdb_id}/watch/providers", headers=HEADERS)
    response.raise_for_status()
    return response.json()["results"]

def discover_top_cdramas(page):
    params = {
        "with_origin_country": "CN",        # made in mainland China
        "with_original_language": "zh",
        "with_type": "4",                   # Scripted: no reality/talk/docs
        "without_genres": "16,10764,10767,10762,99",  # no animation, reality, talk, kids, documentary
        "with_runtime.gte": 30,             # cuts out 2–10 min micro-dramas
        "vote_count.gte": 30,               # ignore 10/10 from 3 votes
        "sort_by": "vote_average.desc",     # top rated, like MDL's so=rated
        "page": page,
    }
    response = httpx.get(f"{BASE_URL}/discover/tv", params=params, headers=HEADERS)
    response.raise_for_status()
    return response.json()["results"]