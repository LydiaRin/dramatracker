import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, backdropUrl, errorText, posterUrl } from '../api'
import type { Choice, Drama, Platform, WatchlistEntry } from '../api'
import { accentStyle, zhNumber } from '../accent'
import Poster from '../components/Poster'
import './DramaPage.css'

const STATUSES = [
  { status: 'watching', label: 'Watching' },
  { status: 'planned', label: 'Queue' },
  { status: 'done', label: 'Done' },
]

// Same answers as the deck, so adding from here teaches the recommender exactly like a swipe
const ADD: { choice: Choice; label: string; zh: string }[] = [
  { choice: 'want', label: 'Want to watch', zh: '想看' },
  { choice: 'watched', label: 'Already watched', zh: '看过' },
  { choice: 'rewatch', label: 'Would rewatch', zh: '重温' },
]

type QA = { q: string; a: string | null; error?: string }

function DramaPage({ id }: { id: number }) {
  const [drama, setDrama] = useState<Drama | null>(null)
  const [entry, setEntry] = useState<WatchlistEntry | null>(null)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [reason, setReason] = useState<string | null>(null)
  const [reasonState, setReasonState] = useState<'idle' | 'thinking' | 'error'>('idle')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [qa, setQa] = useState<QA[]>([])
  const [question, setQuestion] = useState('')

  useEffect(() => {
    Promise.all([api.drama(id), api.watchlist()])
      .then(([d, list]) => {
        setDrama(d)
        setEntry(list.find((e) => e.drama_id === id) ?? null)
      })
      .catch((e) => setError(errorText(e)))
    api
      .platforms()
      .then((list) => setPlatforms([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setPlatforms([]))
  }, [id])

  // After any change, read the entry back from the list so the page shows what the server saved
  async function refreshEntry() {
    const list = await api.watchlist()
    setEntry(list.find((e) => e.drama_id === id) ?? null)
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await refreshEntry()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const startWatching = () => run(() => api.addToList(drama!.tmdb_id)) // POST /watchlist starts as "watching"
  const classify = (choice: Choice) => run(() => api.classify(id, choice))
  const update = (changes: { current_episode?: number; status?: string; platform_id?: number }) =>
    run(() => api.updateEntry(entry!.id, changes))
  const remove = () => run(() => api.removeEntry(entry!.id))

  async function whyMe() {
    setReasonState('thinking')
    setReasonError(null)
    try {
      setReason(await api.reason(id))
      setReasonState('idle')
    } catch (e) {
      setReasonError(errorText(e))
      setReasonState('error')
    }
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    setQuestion('')
    const index = qa.length
    setQa((list) => [...list, { q, a: null }])
    try {
      const a = await api.ask(id, q)
      setQa((list) => list.map((x, i) => (i === index ? { ...x, a } : x)))
    } catch (err) {
      setQa((list) => list.map((x, i) => (i === index ? { ...x, a: '', error: errorText(err) } : x)))
    }
  }

  if (error && !drama) {
    return (
      <div className="container drama-page">
        <p className="error-banner">{error}</p>
        <Link to="/" className="link-btn">
          ← Home
        </Link>
      </div>
    )
  }
  if (!drama) {
    return (
      <div className="container drama-page">
        <p className="muted thinking">Loading…</p>
      </div>
    )
  }

  const backdrop = backdropUrl(drama.backdrop_path)
  const art = backdrop ?? posterUrl(drama.poster_path)
  const total = drama.total_episodes
  const genres = drama.genres?.split(', ').filter(Boolean) ?? []

  return (
    <div style={accentStyle(drama.accent)}>
      <section className="hero drama-hero">
        {art && <img className={backdrop ? 'hero-art' : 'hero-art is-poster'} src={art} alt="" />}
        <div className="container hero-content drama-hero-content">
          <Poster path={drama.poster_path} title={drama.title} fallback={drama.original_title} className="drama-poster" />
          <div className="hero-text">
            <div className="drama-tags">
              {genres.map((g) => (
                <span key={g} className="drama-tag caps">
                  {g}
                </span>
              ))}
              {total && <span className="drama-tag caps">{total} episodes</span>}
            </div>
            <h1 className="hero-title">{drama.title}</h1>
            {drama.overview ? <p className="drama-overview">{drama.overview}</p> : <p className="muted">TMDB has no synopsis for this drama yet.</p>}
          </div>
          {drama.original_title && (
            <div className="hero-vertical" aria-hidden="true">
              {total && <span className="hero-meta">共{zhNumber(total)}集</span>}
              <p className="brush glow hero-zh">{drama.original_title}</p>
            </div>
          )}
        </div>
      </section>

      <div className="container drama-body">
        {error && <p className="error-banner">{error}</p>}

        {/* On my list: progress, status, platform; not on it: the deck's answers */}
        <section className="drama-panel">
          <div className="section-head">
            <h2>My list</h2>
            <span className="section-zh">片单</span>
          </div>

          {entry ? (
            <div className="drama-entry">
              <div className="drama-progress">
                <span className="hero-count">
                  {entry.current_episode}
                  {total && <small> / {total}</small>}
                </span>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${total ? Math.min(100, (entry.current_episode / total) * 100) : 0}%` }}></div>
                </div>
              </div>
              <div className="drama-controls">
                <div className="wl-stepper">
                  <button
                    type="button"
                    aria-label="One episode back"
                    disabled={busy || entry.current_episode === 0}
                    onClick={() => update({ current_episode: entry.current_episode - 1 })}
                  >
                    −
                  </button>
                  <span>{entry.current_episode}</span>
                  <button
                    type="button"
                    aria-label="One more episode"
                    disabled={busy || (total !== null && entry.current_episode >= total)}
                    onClick={() => {
                      const next = entry.current_episode + 1
                      // The last episode finishes it; any episode of a queued drama starts it
                      update(total !== null && next === total ? { current_episode: next, status: 'done' } : { current_episode: next, status: 'watching' })
                    }}
                  >
                    +
                  </button>
                </div>
                <select className="wl-select" value={entry.status} disabled={busy} aria-label="Status" onChange={(e) => update({ status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s.status} value={s.status}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  className="wl-select"
                  value={entry.platform?.id ?? ''}
                  disabled={busy || platforms.length === 0}
                  aria-label="Platform"
                  onChange={(e) => e.target.value && update({ platform_id: Number(e.target.value) })}
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
                <button type="button" className="link-btn wl-remove" onClick={remove} disabled={busy}>
                  Remove from list
                </button>
              </div>
            </div>
          ) : (
            <div className="drama-add">
              <button type="button" className="btn btn-accent" onClick={startWatching} disabled={busy}>
                Start watching
              </button>
              {ADD.map((a) => (
                <button key={a.choice} type="button" className="btn" onClick={() => classify(a.choice)} disabled={busy}>
                  <span className="brush drama-add-zh">{a.zh}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="drama-panel talk">
          <div className="talk-head">
            <h3>Ask about this drama</h3>
            <span className="brush">聊</span>
          </div>
          {reason ? (
            <p className="talk-answer">
              <span className="talk-who brush">答</span>
              {reason}
            </p>
          ) : reasonState === 'thinking' ? (
            <p className="talk-answer thinking">Thinking about why it fits you…</p>
          ) : (
            <button type="button" className="link-btn" onClick={whyMe}>
              Why would I like it?
            </button>
          )}
          {reasonError && <p className="talk-error">{reasonError}</p>}

          {qa.map((x, i) => (
            <div key={i} className="talk-pair">
              <p className="talk-question">{x.q}</p>
              {x.a === null ? (
                <p className="talk-answer thinking">Thinking…</p>
              ) : x.error ? (
                <p className="talk-error">{x.error}</p>
              ) : (
                <p className="talk-answer">
                  <span className="talk-who brush">答</span>
                  {x.a}
                </p>
              )}
            </div>
          ))}
          <form className="talk-form" onSubmit={onAsk}>
            <label className="visually-hidden" htmlFor="drama-ask">
              Ask a question about {drama.title}
            </label>
            <input
              id="drama-ask"
              className="text-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Is it sad? Is it a slow burn?"
              maxLength={500}
            />
            <button type="submit" className="btn" disabled={!question.trim()}>
              Ask
            </button>
          </form>
          <p className="muted small">Answers come from the synopsis only, so no spoilers. Takes a few seconds.</p>
        </section>
      </div>
    </div>
  )
}

export default DramaPage
