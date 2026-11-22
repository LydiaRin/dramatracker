import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, backdropUrl, errorText, posterUrl } from '../api'
import type { Direction, Drama, Subscription, WatchlistEntry } from '../api'
import { accentStyle, zhNumber } from '../accent'
import DramaCard from '../components/DramaCard'
import Poster from '../components/Poster'
import { MOODS } from '../moods'

type Renewal = { sub: Subscription; daysLeft: number }

// The subscription that renews soonest (today or later), for the fortune slip
function nextRenewal(subs: Subscription[]): Renewal | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = subs
    .filter((s) => s.renewal_date)
    .map((s) => ({
      sub: s,
      daysLeft: Math.round((new Date(s.renewal_date + 'T00:00:00').getTime() - today.getTime()) / 86_400_000),
    }))
    .filter((r) => r.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
  return upcoming[0] ?? null
}

function progressLabel(entry: WatchlistEntry): string {
  const total = entry.drama.total_episodes
  return total ? `Episode ${entry.current_episode} of ${total}` : `Episode ${entry.current_episode}`
}

function percent(entry: WatchlistEntry): number {
  const total = entry.drama.total_episodes
  return total ? Math.min(100, Math.round((entry.current_episode / total) * 100)) : 0
}

function ProgressBar({ entry }: { entry: WatchlistEntry }) {
  const value = percent(entry)
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: `${value}%` }}></div>
    </div>
  )
}

function ContinueItem({ entry }: { entry: WatchlistEntry }) {
  return (
    <Link to={`/drama/${entry.drama.id}`} className="continue-item" style={accentStyle(entry.drama.accent)}>
      <Poster path={entry.drama.poster_path} title={entry.drama.title} fallback={entry.drama.original_title} className="mini-poster" />
      <div className="continue-text">
        <span className="continue-title">{entry.drama.title}</span>
        <span className="muted small">{progressLabel(entry)}</span>
        <ProgressBar entry={entry} />
      </div>
    </Link>
  )
}

// The drama she is watching, shown like its own film poster
function Hero({ entry, onEpisode }: { entry: WatchlistEntry; onEpisode: () => void }) {
  const d = entry.drama
  const total = d.total_episodes
  const finished = total !== null && entry.current_episode >= total
  const backdrop = backdropUrl(d.backdrop_path)
  const art = backdrop ?? posterUrl(d.poster_path)
  const planned = entry.status === 'planned'

  return (
    <section className="hero" style={accentStyle(d.accent)}>
      {art && <img className={backdrop ? 'hero-art' : 'hero-art is-poster'} src={art} alt="" />}
      <div className="container hero-content">
        <div className="hero-text">
          <div className="hero-kicker">
            <span className="seal">今晚</span>
            <span className="caps">{planned ? 'Tonight · start something new' : 'Tonight · continue where you left off'}</span>
          </div>
          <h1 className="hero-title">{d.title}</h1>
          {d.overview && <p className="hero-sub">{d.overview}</p>}
          <div className="hero-progress">
            <span className="hero-count">
              {entry.current_episode}
              {total && <small> / {total} episodes</small>}
            </span>
            <ProgressBar entry={entry} />
          </div>
          <div className="hero-actions">
            <button type="button" className="btn btn-accent" onClick={onEpisode} disabled={finished}>
              {finished ? 'Finished' : '+1 episode'}
            </button>
            <Link to={`/drama/${d.id}`} className="btn">
              Details
            </Link>
          </div>
        </div>

        {d.original_title && (
          <div className="hero-vertical" aria-hidden="true">
            <span className="hero-meta">
              第{zhNumber(Math.max(entry.current_episode, 1))}集{total ? ` · 共${zhNumber(total)}集` : ''}
              <span className="seal">追</span>
            </span>
            <p className="brush glow hero-zh">{d.original_title}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function EmptyHero() {
  return (
    <section className="hero" style={accentStyle(null)}>
      <div className="container hero-content hero-empty">
        <div className="hero-text">
          <div className="hero-kicker">
            <span className="seal">欢迎</span>
            <span className="caps">Welcome to DramaTracker</span>
          </div>
          <h1 className="hero-title">Find your next drama</h1>
          <p className="hero-sub">Sort a few dramas in the deck and this page fills up with what you are watching and what fits your taste.</p>
          <div className="hero-actions">
            <Link to="/discover" className="btn btn-accent">
              Open the deck
            </Link>
          </div>
        </div>
        <div className="hero-vertical" aria-hidden="true">
          <p className="brush glow hero-zh">追剧</p>
        </div>
      </div>
    </section>
  )
}

function Home() {
  const [topPicks, setTopPicks] = useState<Drama[]>([])
  const [forYou, setForYou] = useState<Drama[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [direction, setDirection] = useState<Direction>({ direction: null, description: null })
  const [renewal, setRenewal] = useState<Renewal | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.deck(12, 'top'), api.watchlist(), api.subscriptions()])
      .then(([top, list, subs]) => {
        setTopPicks(top)
        setWatchlist(list)
        setRenewal(nextRenewal(subs))
        setLoaded(true)
      })
      .catch((e) => setError(errorText(e)))

    // Kept apart from Promise.all so the rest of Home still loads if these fail
    api.deck(12, 'for_you').then(setForYou).catch(() => setForYou([]))
    api.direction().then(setDirection).catch(() => {})
  }, [])

  const watching = watchlist.filter((e) => e.status === 'watching')
  // "planned" entries are what she picked as "Want to watch" in the deck
  const queue = watchlist.filter((e) => e.status === 'planned')
  const nextUp = watching[0] ?? queue[0] ?? null

  // With nothing on the list and no direction, "for you" is just top rated: don't show it twice
  const hasTaste = watchlist.length > 0 || direction.direction !== null
  const showForYou = hasTaste && forYou.length > 0
  const forYouIds = new Set(showForYou ? forYou.map((d) => d.id) : [])
  const otherPicks = topPicks.filter((d) => !forYouIds.has(d.id))

  async function addEpisode(entry: WatchlistEntry) {
    try {
      // Watching an episode of a queued drama also moves it to "watching"
      const updated = await api.updateEntry(entry.id, { current_episode: entry.current_episode + 1, status: 'watching' })
      setWatchlist((list) => list.map((e) => (e.id === updated.id ? updated : e)))
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div style={accentStyle(nextUp?.drama.accent)}>
      {nextUp ? <Hero entry={nextUp} onEpisode={() => addEpisode(nextUp)} /> : <EmptyHero />}

      <section className="moods">
        <div className="container moods-row">
          <span className="moods-label caps">Tonight I want</span>
          {/* Each mood opens the deck already steered in that direction */}
          {MOODS.map((m) => (
            <Link key={m.label} to={`/discover?mood=${encodeURIComponent(m.prompt)}`} className="mood">
              <span className="mood-zh">{m.zh}</span>
              {m.label}
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div className="container">
          <p className="error-banner">Could not reach the server: {error}</p>
        </div>
      )}

      <div className="container rows">
        {showForYou && (
          <section>
            <div className="section-head">
              <h2>For you</h2>
              <span className="section-zh">推荐</span>
              <Link to="/discover" className="see-all caps">
                Open the deck →
              </Link>
            </div>
            {direction.direction && <p className="muted small">Steered by “{direction.direction}”.</p>}
            <div className="grid">
              {forYou.slice(0, 6).map((d) => (
                <DramaCard key={d.id} drama={d} />
              ))}
            </div>
          </section>
        )}

        {(watching.length > 0 || renewal) && (
          <section>
            <div className="section-head">
              <h2>Keep watching</h2>
              <span className="section-zh">追剧</span>
              <Link to="/watchlist?tab=watching" className="see-all caps">
                My list →
              </Link>
            </div>
            <div className="strip">
              {watching.slice(0, 5).map((entry) => (
                <ContinueItem key={entry.id} entry={entry} />
              ))}
              {renewal && (
                <div className="fortune">
                  <span className="seal" aria-hidden="true">签</span>
                  <div>
                    <p className="fortune-label caps">Fortune slip</p>
                    <p className="fortune-title">
                      {renewal.sub.platform.name} {renewal.sub.tier}{' '}
                      {renewal.daysLeft === 0 ? 'renews today' : `renews in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {queue.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Your queue</h2>
              <span className="section-zh">想看</span>
              <Link to="/watchlist?tab=planned" className="see-all caps">
                All →
              </Link>
            </div>
            <div className="grid">
              {queue.slice(0, 6).map((entry) => (
                <DramaCard key={entry.id} drama={entry.drama} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>Top rated</h2>
            <span className="section-zh">热播</span>
            <Link to="/discover" className="see-all caps">
              Sort them →
            </Link>
          </div>
          {!loaded && !error && <p className="muted">Loading…</p>}
          {loaded && topPicks.length === 0 && <p className="muted">You have classified every drama in the catalog.</p>}
          <div className="grid">
            {otherPicks.slice(0, 6).map((d, i) => (
              <DramaCard key={d.id} drama={d} rank={i + 1} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
