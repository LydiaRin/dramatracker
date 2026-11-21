import httpx

OLLAMA_URL="http://localhost:11434"
EMBED_MODEL = "bge-m3"
CHAT_MODEL = "qwen2.5:7b"

def embed(text: str) -> list[float]:
    payload = {"model": EMBED_MODEL, "input": text}
    resp = httpx.post(f"{OLLAMA_URL}/api/embed", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["embeddings"][0]

def explain(prompt: str) -> str:
    payload = {"model": CHAT_MODEL, "messages": [{"role": "user", "content": prompt}], "stream": False}
    resp = httpx.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["message"]["content"]

