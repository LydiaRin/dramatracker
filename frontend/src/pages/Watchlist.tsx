import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorText } from '../api'
import type { Platform, WatchlistEntry } from '../api'
import Poster from '../components/Poster'
import { accentStyle } from '../accent'
import './Watchlist.css'

// The statuses the backend uses: "planned" comes from "Want to watch" in the deck,
// "done" from "Already watched" / "Would rewatch"
const TABS = [
  { status: 'watching', label: 'Watching', zh: '追剧' },
  { status: 'planned', label: 'Queue', zh: '想看' },
  { status: 'done', label: 'Done', zh: '看过' },
] as const

type Status = (typeof TABS)[number]['status']

function isStatus(value: string | null): value is Status {
  return TABS.some((t) => t.status === value)
}

type Changes = { current_episode?: number; status?: string; platform_id?: number }

function Row({
  entry,
  platforms,
  busy,
  onChange,
  onRemove,
}: {
  entry: WatchlistEntry
  platforms: Platform[]
  busy: boolean
  onChange: (changes: Changes) => void
  onRemove: () => void
}) {
  const total = entry.drama.total_episodes
  const percent = total ? Math.min(100, Math.round((entry.current_episode / total) * 100)) : 0
  const atEnd = total !== null && entry.current_episode >= total

  function step(delta: number) {
    const next = entry.current_episode + delta
    if (next < 0 || (total !== null && next > total)) return
    // Reaching the last episode finishes the drama; starting a queued one moves it to "watching"
    if (total !== null && next === total) onChange({ current_episode: next, status: 'done' })
    else if (entry.status !== 'watching' && delta > 0) onChange({ current_episode: next, status: 'watching' })
    else onChange({ current_episode: next })
  }

  return (
    <li className="wl-row" style={accentStyle(entry.drama.accent)}>
      <Poster path={entry.drama.poster_path} title={entry.drama.title} fallback={entry.drama.original_title} className="wl-poster" />

      <div className="wl-info">
        <Link to={`/drama/${entry.drama.id}`} className="wl-title">
          {entry.drama.title}
        </Link>
        {entry.drama.original_title && <span className="brush wl-zh">{entry.drama.original_title}</span>}
        <span className="muted small">
          {total ? `Episode ${entry.current_episode} of ${total}` : `Episode ${entry.current_episode}`}
          {entry.platform && ` · ${entry.platform.name}`}
        </span>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${percent}%` }}></div>
        </div>
      </div>

      <div className="wl-controls">
        <div className="wl-stepper">
          <button type="button" onClick={() => step(-1)} disabled={busy || entry.current_episode === 0} aria-label="One episode back">
            −
          </button>
          <span>{entry.current_episode}</span>
          <button type="button" onClick={() => step(1)} disabled={busy || atEnd} aria-label="One more episode">
            +
          </button>
        </div>

        <select
          className="wl-select"
          value={entry.status}
          onChange={(e) => onChange({ status: e.target.value })}
          disabled={busy}
          aria-label="Status"
        >
          {TABS.map((t) => (
            <option key={t.status} value={t.status}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Where she watches it; the platform list comes from the providers TMDB reported */}
        <select
          className="wl-select"
          value={entry.platform?.id ?? ''}
          onChange={(e) => e.target.value && onChange({ platform_id: Number(e.target.value) })}
          disabled={busy || platforms.length === 0}
          aria-label="Platform"
        >
          <option value="" disabled>
            Watching on…
          </option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button type="button" className="link-btn wl-remove" onClick={onRemove} disabled={busy}>
          Remove
        </button>
      </div>
    </li>
  )
}

function Watchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  // The tab lives in the URL (?tab=planned) so Home can link straight to the queue
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Status = isStatus(tabParam) ? tabParam : 'watching'

  useEffect(() => {
    api
      .watchlist()
      .then((list) => {
        setEntries(list)
        setLoaded(true)
      })
      .catch((e) => setError(errorText(e)))
    api
      .platforms()
      .then((list) => setPlatforms([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setPlatforms([]))
  }, [])

  async function update(entry: WatchlistEntry, changes: Changes) {
    setBusyId(entry.id)
    setError(null)
    try {
      const updated = await api.updateEntry(entry.id, changes)
      setEntries((list) => list.map((e) => (e.id === updated.id ? updated : e)))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(entry: WatchlistEntry) {
    setBusyId(entry.id)
    setError(null)
    try {
      await api.removeEntry(entry.id)
      setEntries((list) => list.filter((e) => e.id !== entry.id))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusyId(null)
    }
  }

  const shown = entries.filter((e) => e.status === tab)

  return (
    <div className="container watchlist">
      <div className="wl-head">
        <span className="brush wl-head-zh">片单</span>
        <h1>My list</h1>
      </div>

      <div className="wl-tabs" role="tablist">
        {TABS.map((t) => {
          const count = entries.filter((e) => e.status === t.status).length
          return (
            <button
              key={t.status}
              type="button"
              role="tab"
              aria-selected={tab === t.status}
              className={tab === t.status ? 'wl-tab active' : 'wl-tab'}
              onClick={() => setParams({ tab: t.status })}
            >
              <span className="brush">{t.zh}</span> {t.label} <span className="wl-count">{count}</span>
            </button>
          )
        })}
      </div>

      {error && <p className="error-banner">{error}</p>}
      {!loaded && !error && <p className="muted">Unrolling the scroll…</p>}

      {loaded && shown.length === 0 && (
        <p className="muted">
          Nothing here yet. <Link to="/discover" className="red">Find dramas in the deck</Link>
        </p>
      )}

      <ul className="wl-list">
        {shown.map((entry) => (
          <Row
            key={entry.id}
            entry={entry}
            platforms={platforms}
            busy={busyId === entry.id}
            onChange={(changes) => update(entry, changes)}
            onRemove={() => remove(entry)}
          />
        ))}
      </ul>
    </div>
  )
}

export default Watchlist
