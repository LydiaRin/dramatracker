import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorText } from '../api'
import type { Platform, Subscription, WatchlistEntry } from '../api'
import './Subscriptions.css'

function daysUntil(date: string | null): number | null {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(date + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
}

function renewLabel(days: number | null): string {
  if (days === null) return 'No renewal date'
  if (days < 0) return `Renewed ${-days} day${days === -1 ? '' : 's'} ago, update the date`
  if (days === 0) return 'Renews today'
  return `Renews in ${days} day${days === 1 ? '' : 's'}`
}

// One subscription: the PUT endpoint both creates and updates, so the same form does both
function SubForm({
  platforms,
  initial,
  onSave,
  onCancel,
}: {
  platforms: Platform[]
  initial?: Subscription
  onSave: (platformId: number, tier: string, renewal: string | null) => Promise<void>
  onCancel?: () => void
}) {
  const [platformId, setPlatformId] = useState<number | ''>(initial?.platform.id ?? '')
  const [tier, setTier] = useState(initial?.tier ?? 'VIP')
  const [renewal, setRenewal] = useState(initial?.renewal_date ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (platformId === '') return
    setSaving(true)
    try {
      await onSave(platformId, tier.trim() || 'free', renewal || null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="sub-form" onSubmit={submit}>
      <label>
        <span className="caps">Platform</span>
        <select className="wl-select" value={platformId} onChange={(e) => setPlatformId(Number(e.target.value))} disabled={!!initial}>
          <option value="" disabled>
            Choose…
          </option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="caps">Tier</span>
        <input className="text-input" value={tier} onChange={(e) => setTier(e.target.value)} placeholder="VIP, free, premium…" maxLength={40} />
      </label>
      <label>
        <span className="caps">Renews on</span>
        <input className="text-input" type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} />
      </label>
      <div className="sub-form-actions">
        <button type="submit" className="btn btn-accent" disabled={saving || platformId === ''}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" className="link-btn muted-link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function Subscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([api.subscriptions(), api.platforms(), api.watchlist()])
      .then(([s, p, w]) => {
        setSubs(s)
        setPlatforms([...p].sort((a, b) => a.name.localeCompare(b.name)))
        setWatchlist(w)
        setLoaded(true)
      })
      .catch((e) => setError(errorText(e)))
  }, [])

  async function save(platformId: number, tier: string, renewal: string | null) {
    setError(null)
    try {
      const saved = await api.setSubscription(platformId, { tier, renewal_date: renewal })
      setSubs((list) => [...list.filter((s) => s.platform.id !== saved.platform.id), saved])
      setEditing(null)
      setAdding(false)
    } catch (e) {
      setError(errorText(e))
    }
  }

  // Episodes still to watch on each platform, from the dramas she watches there
  function episodesLeft(platformId: number): number {
    return watchlist
      .filter((e) => e.platform?.id === platformId && e.status !== 'done')
      .reduce((sum, e) => sum + Math.max(0, (e.drama.total_episodes ?? 0) - e.current_episode), 0)
  }

  const sorted = [...subs].sort((a, b) => (daysUntil(a.renewal_date) ?? 9999) - (daysUntil(b.renewal_date) ?? 9999))
  const free = platforms.filter((p) => !subs.some((s) => s.platform.id === p.id))

  return (
    <div className="container subs">
      <div className="wl-head">
        <span className="brush wl-head-zh">会员</span>
        <h1>Subscriptions</h1>
      </div>
      <p className="muted subs-intro">
        When each platform renews, and how many episodes you still have to watch there. Pick the platform for a drama on its page or in My list.
      </p>

      {error && <p className="error-banner">{error}</p>}
      {!loaded && !error && <p className="muted thinking">Loading…</p>}
      {loaded && platforms.length === 0 && (
        <p className="muted">No platforms yet. They appear as dramas are saved from TMDB with their streaming providers.</p>
      )}

      <ul className="subs-list">
        {sorted.map((s) => {
          const days = daysUntil(s.renewal_date)
          const left = episodesLeft(s.platform.id)
          return (
            <li key={s.id} className={days !== null && days >= 0 && days <= 7 ? 'sub-row soon' : 'sub-row'}>
              {editing === s.id ? (
                <SubForm platforms={platforms} initial={s} onSave={save} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="sub-name">
                    <span className="sub-platform">{s.platform.name}</span>
                    <span className="caps muted">{s.tier}</span>
                  </div>
                  <div className="sub-when">
                    <span className="sub-days">{days !== null && days >= 0 ? days : '–'}</span>
                    <span className="muted small">{renewLabel(days)}</span>
                  </div>
                  <div className="sub-left muted small">{left > 0 ? `${left} episodes left to watch here` : 'Nothing in progress here'}</div>
                  <button type="button" className="link-btn" onClick={() => setEditing(s.id)}>
                    Edit
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <div className="sub-row sub-new">
          <SubForm platforms={free} onSave={save} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        free.length > 0 && (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            + Add a subscription
          </button>
        )
      )}
    </div>
  )
}

export default Subscriptions
