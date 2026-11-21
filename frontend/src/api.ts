// Every call to the FastAPI backend goes through this file, so pages never build URLs themselves.
// If an endpoint changes in the backend, this is the only frontend file to update.

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'

// Shapes mirror the backend's schemas.py (DramaOut, WatchlistOut, SubscriptionOut)
export type Drama = {
  id: number
  tmdb_id: number
  title: string
  original_title: string | null
  total_episodes: number | null
  poster_path: string | null
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

// TMDB stores only the end of the image path; the size (w342) is chosen here
export function posterUrl(path: string | null): string | null {
  return path ? POSTER_BASE + path : null
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
  deck: (limit = 20) => request<Drama[]>('GET', `/discover?limit=${limit}`),
  recommendations: (limit = 10) => request<Drama[]>('GET', `/recommendations?limit=${limit}`),
  classify: (dramaId: number, choice: Choice) => request<void>('POST', `/discover/${dramaId}`, { choice }),
  undoDismissal: (dramaId: number) => request<void>('DELETE', `/discover/${dramaId}`),

  watchlist: () => request<WatchlistEntry[]>('GET', '/watchlist'),
  updateEntry: (entryId: number, changes: { current_episode?: number; status?: string; platform_id?: number }) =>
    request<WatchlistEntry>('PATCH', `/watchlist/${entryId}`, changes),
  removeEntry: (entryId: number) => request<void>('DELETE', `/watchlist/${entryId}`),

  subscriptions: () => request<Subscription[]>('GET', '/subscriptions'),
}
