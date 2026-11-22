import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorText } from '../api'
import type { Direction, Drama, Subscription, WatchlistEntry } from '../api'
import HeroArt from '../HeroArt'
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

function ProgressBar({ entry }: { entry: WatchlistEntry }) {
  const total = entry.drama.total_episodes
  const percent = total ? Math.min(100, Math.round((entry.current_episode / total) * 100)) : 0
  return (
  <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
    <div className="bar-fill" style={{ width: `${percent}%` }}></div>
  </div>
  )
}

function SideItem({ entry, showProgress }: { entry: WatchlistEntry; showProgress: boolean }) {
  return (
  <div className="continue-item">
    <Poster path={entry.drama.poster_path} title={entry.drama.title} fallback={entry.drama.original_title} className="mini-poster" />
    <div className="continue-text">
    <span className="continue-title">{entry.drama.title}</span>
    {showProgress ? (
      <>
      <span className="muted small">{progressLabel(entry)}</span>
      <ProgressBar entry={entry} />
      </>
    ) : (
      <span className="muted small">
      {entry.drama.total_episodes ? `${entry.drama.total_episodes} episodes` : 'In your queue'}
      </span>
    )}
    </div>
  </div>
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
    Promise.all([api.deck(10, 'top'), api.watchlist(), api.subscriptions()])
      .then(([top, list, subs]) => {
        setTopPicks(top)
        setWatchlist(list)
        setRenewal(nextRenewal(subs))
        setLoaded(true)
      })
      .catch((e) => setError(errorText(e)))

    // Kept apart from Promise.all so the rest of Home still loads if these fail
    api.deck(10, 'for_you').then(setForYou).catch(() => setForYou([]))
    api.direction().then(setDirection).catch(() => {})
  }, [])

  const watching = watchlist.filter((e) => e.status === 'watching')
  // "planned" entries are what the user picked as "Want to watch" in the deck
  const queue = watchlist.filter((e) => e.status === 'planned')
  const nextUp = watching[0] ?? queue[0] ?? null
  const nextUpTotal = nextUp?.drama.total_episodes ?? null
  const finished = nextUp !== null && nextUpTotal !== null && nextUp.current_episode >= nextUpTotal

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
    <>
      <section className="hero">
        <HeroArt />
        <div className="container hero-content">
          <div className="hero-text">
            <p className="brush hero-zh">欢迎回来</p>
            <h1 className="hero-title">Welcome back</h1>
            <p className="hero-sub">
              {nextUp ? `${nextUp.drama.title} is waiting for you.` : 'Nothing in progress yet. Find your next drama in the deck.'}
            </p>
          </div>

          {nextUp && (
            <article className="next-up">
              <span className="brush next-up-stamp">今晚</span>
              <Poster path={nextUp.drama.poster_path} title={nextUp.drama.title} fallback={nextUp.drama.original_title} className="next-up-poster" />
              <div className="next-up-text">
                <span className="next-up-label">{nextUp.status === 'planned' ? 'Start next' : 'Next up'}</span>
                <h2 className="next-up-title">{nextUp.drama.title}</h2>
                <span className="muted small">{progressLabel(nextUp)}</span>
                <ProgressBar entry={nextUp} />
                <div className="next-up-actions">
                  <button type="button" className="btn btn-dark" onClick={() => addEpisode(nextUp)} disabled={finished}>
                    {finished ? 'Finished' : '+1 episode'}
                  </button>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="moods">
        <div className="container moods-row">
          <span className="moods-label">Tonight I want…</span>
          {/* Each mood opens the deck already steered in that direction */}
          {MOODS.map((m) => (
            <Link key={m.label} to={`/discover?mood=${encodeURIComponent(m.prompt)}`} className="mood">
              <span className="brush mood-zh">{m.zh}</span>
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

      <div className="container layout">
        <main className="main">
          {showForYou && (
            <section className="main-section">
              <div className="section-head">
                <h2>For you</h2>
                <span className="brush red section-zh">推荐</span>
                <Link to="/discover" className="see-all">Open the deck →</Link>
              </div>
              {direction.direction && (
                <p className="muted small steered-by">
                  Steered by “{direction.direction}”. <Link to="/discover" className="red">Change it in the deck</Link>
                </p>
              )}
              <div className="grid">
                {forYou.map((d) => (
                  <DramaCard key={d.id} drama={d} />
                ))}
              </div>
            </section>
          )}

          <section className="main-section">
            <div className="section-head">
              <h2>Top rated, not on your list</h2>
              <span className="brush red section-zh">热播</span>
              <Link to="/discover" className="see-all">Sort them →</Link>
            </div>
            {!loaded && !error && <p className="muted">Unrolling the scroll…</p>}
            {loaded && topPicks.length === 0 && <p className="muted">You have classified every drama in the catalog.</p>}
            <div className="grid">
              {otherPicks.map((d, i) => (
                <DramaCard key={d.id} drama={d} rank={i + 1} />
              ))}
            </div>
          </section>
        </main>

        <aside className="sidebar">
          <section className="panel">
            <div className="panel-head">
              <h2>Keep watching</h2>
              <span className="brush red">追剧</span>
              <Link to="/watchlist?tab=watching" className="see-all">All →</Link>
            </div>
            {loaded && watching.length === 0 && <p className="muted small">Nothing in progress.</p>}
            <div className="stack">
              {watching.slice(0, 5).map((entry) => (
                <SideItem key={entry.id} entry={entry} showProgress />
              ))}
            </div>
          </section>

          {renewal && (
            <section className="fortune">
              <span className="brush fortune-bg" aria-hidden="true">签</span>
              <p className="brush fortune-label">Fortune slip</p>
              <p className="fortune-title">
                {renewal.sub.platform.name} {renewal.sub.tier}{' '}
                {renewal.daysLeft === 0 ? 'renews today' : `renews in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? '' : 's'}`}
              </p>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <h2>Your queue</h2>
              <span className="brush red">想看</span>
              <Link to="/watchlist?tab=planned" className="see-all">All →</Link>
            </div>
            {loaded && queue.length === 0 && (
              <p className="muted small">
                Empty for now. <Link to="/discover" className="red">Pick some in the deck</Link>
              </p>
            )}
            <div className="stack">
              {queue.slice(0, 5).map((entry) => (
                <SideItem key={entry.id} entry={entry} showProgress={false} />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

export default Home
