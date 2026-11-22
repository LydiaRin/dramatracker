import httpx

OLLAMA_URL = "http://localhost:11434"
EMBED_MODEL = "bge-m3"
CHAT_MODEL = "qwen2.5:7b"


def embed(text: str) -> list[float]:
    payload = {"model": EMBED_MODEL, "input": text}
    resp = httpx.post(f"{OLLAMA_URL}/api/embed", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["embeddings"][0]


def explain(prompt: str) -> str:
    payload = {
        "model": CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        # Lower temperature keeps qwen close to the synopsis instead of inventing plot
        "options": {"temperature": 0.4},
    }
    # The 7B model runs on CPU here, so a long answer can take a while
    resp = httpx.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=180)
    resp.raise_for_status()
    return resp.json()["message"]["content"].strip()


def embedding_text(drama) -> str:
    return f"{drama.title}. Genres: {drama.genres}. {drama.overview}"
