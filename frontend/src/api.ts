// Every call to the FastAPI backend goes through this file, so pages never build URLs themselves.
// If an endpoint changes in the backend, this is the only frontend file to update.

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280'

// Shapes mirror the backend's schemas.py (DramaOut, WatchlistOut, SubscriptionOut)
export type Drama = {
  id: number
  tmdb_id: number
  title: string
  original_title: string | null
  total_episodes: number | null
  poster_path: string | null
  overview?: string | null
  genres?: string | null
  backdrop_path?: string | null   // wide TMDB image, used behind the Home hero
  accent?: string | null          // the poster's main colour as "#RRGGBB", computed by the backend
  last_synced_at: string
}

export type Platform = { id: number; name: string }

export type WatchlistEntry = {
  id: number
  drama_id: number
  status: string
  current_episode: number
  drama: Drama
  platform: Platform | null
}

export type Subscription = {
  id: number
  tier: string
  renewal_date: string | null
  platform: Platform
}

// The four answers a deck card can get (ClassifyIn in the backend)
export type Choice = 'want' | 'no' | 'watched' | 'rewatch'

// "for_you" ranks by her taste (list + dismissals + typed direction); "top" is top rated
export type DeckOrder = 'for_you' | 'top'

// What she typed to steer the deck, and qwen's rewrite of it (DirectionOut)
export type Direction = { direction: string | null; description: string | null }

// TMDB stores only the end of the image path; the size (w342) is chosen here
export function posterUrl(path: string | null): string | null {
  return path ? POSTER_BASE + path : null
}

export function backdropUrl(path: string | null | undefined): string | null {
  return path ? BACKDROP_BASE + path : null
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    // FastAPI puts its message in "detail" (e.g. "Drama not found")
    let detail = `Server answered ${res.status}`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
    } catch {
      // body was not JSON; keep the status message
    }
    throw new Error(detail)
  }
  // 204 endpoints (classify, delete) have no body
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  deck: (limit = 20, order: DeckOrder = 'for_you') => request<Drama[]>('GET', `/discover?limit=${limit}&order=${order}`),
  classify: (dramaId: number, choice: Choice) => request<void>('POST', `/discover/${dramaId}`, { choice }),
  undoDismissal: (dramaId: number) => request<void>('DELETE', `/discover/${dramaId}`),

  // These three go through the local LLM: expect 10-30 s on CPU
  direction: () => request<Direction>('GET', '/discover/direction'),
  setDirection: (text: string) => request<Direction>('PUT', '/discover/direction', { text }),
  clearDirection: () => request<void>('DELETE', '/discover/direction'),
  ask: (dramaId: number, question: string) =>
    request<{ text: string }>('POST', `/discover/${dramaId}/ask`, { question }).then((r) => r.text),
  reason: (dramaId: number) => request<{ text: string }>('GET', `/discover/${dramaId}/reason`).then((r) => r.text),

  watchlist: () => request<WatchlistEntry[]>('GET', '/watchlist'),
  updateEntry: (entryId: number, changes: { current_episode?: number; status?: string; platform_id?: number }) =>
    request<WatchlistEntry>('PATCH', `/watchlist/${entryId}`, changes),
  removeEntry: (entryId: number) => request<void>('DELETE', `/watchlist/${entryId}`),

  subscriptions: () => request<Subscription[]>('GET', '/subscriptions'),
}
