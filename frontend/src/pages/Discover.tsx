import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorText } from '../api'
import type { Choice, Drama } from '../api'
import Poster from '../components/Poster'
import './Discover.css'

// The four answers, their arrow key, and the stamp shown on the card
const CHOICES: { choice: Choice; label: string; key: string; arrow: string; zh: string }[] = [
  { choice: 'no', label: 'Not for me', key: 'ArrowLeft', arrow: '←', zh: '否' },
  { choice: 'watched', label: 'Already watched', key: 'ArrowDown', arrow: '↓', zh: '看过' },
  { choice: 'rewatch', label: 'Watched, would rewatch', key: 'ArrowUp', arrow: '↑', zh: '重温' },
  { choice: 'want', label: 'Want to watch', key: 'ArrowRight', arrow: '→', zh: '想看' },
]

const LABEL: Record<Choice, string> = {
  no: 'Not for me',
  watched: 'Already watched',
  rewatch: 'Would rewatch',
  want: 'Want to watch',
}

const BATCH = 30
const REFILL_AT = 5 // fetch the next batch before the deck runs dry

type LastAction = { drama: Drama; choice: Choice }

function Discover() {
  const [deck, setDeck] = useState<Drama[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
  const [added, setAdded] = useState(0)
  // Ids already answered this session: a refill fetched before their POST landed
  // could otherwise bring them back into the deck
  const answered = useRef(new Set<number>())

  useEffect(() => {
    api
      .deck(BATCH)
      .then(setDeck)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false))
  }, [])

  function refill() {
    api
      .deck(BATCH)
      .then((fresh) =>
        setDeck((current) => [
          ...current,
          ...fresh.filter((f) => !answered.current.has(f.id) && !current.some((c) => c.id === f.id)),
        ]),
      )
      .catch((e) => setError(errorText(e)))
  }

  async function choose(choice: Choice) {
    const card = deck[0]
    if (!card || saving || answered.current.has(card.id)) return
    answered.current.add(card.id)
    setDeck((d) => d.slice(1)) // next card shows right away
    setSaving(true)
    setError(null)
    try {
      await api.classify(card.id, choice)
      setLastAction({ drama: card, choice })
      if (choice === 'want') setAdded((n) => n + 1)
      if (deck.length - 1 <= REFILL_AT) refill()
    } catch (e) {
      // Put the card back so the answer can be given again
      answered.current.delete(card.id)
      setDeck((d) => [card, ...d])
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  async function undo() {
    if (!lastAction || saving) return
    const { drama, choice } = lastAction
    setSaving(true)
    setError(null)
    try {
      if (choice === 'no') {
        await api.undoDismissal(drama.id)
      } else {
        // want / watched / rewatch created a watchlist entry; the deck only shows dramas
        // that were not on the list, so deleting that entry restores the previous state
        const list = await api.watchlist()
        const entry = list.find((e) => e.drama_id === drama.id)
        if (entry) await api.removeEntry(entry.id)
      }
      answered.current.delete(drama.id)
      setDeck((d) => [drama, ...d.filter((x) => x.id !== drama.id)])
      if (choice === 'want') setAdded((n) => Math.max(0, n - 1))
      setLastAction(null)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  // Arrow keys answer, Ctrl+Z undoes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        undo()
        return
      }
      const match = CHOICES.find((c) => c.key === e.key)
      if (match) {
        e.preventDefault()
        choose(match.choice)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const card = deck[0]

  return (
    <div className="container discover">
      <div className="discover-head">
        <h1>What should I watch?</h1>
        <span className="brush red discover-zh">选剧</span>
        <span className="muted small discover-count">
          {added} added to <Link to="/" className="red">your queue</Link>
        </span>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {!card && loading && <p className="muted">Shuffling the deck…</p>}
      {!card && !loading && <p className="muted">You have classified every drama in the catalog.</p>}

      {card && (
        <div className="discover-body">
          {/* key forces a fresh element per card so the entrance animation replays */}
          <article className="swipe-card" key={card.id}>
            <Poster path={card.poster_path} title={card.title} fallback={card.original_title} className="swipe-poster" />
            <div className="swipe-info">
              <h2>{card.title}</h2>
              {card.original_title && <p className="brush swipe-zh">{card.original_title}</p>}
              {card.total_episodes && <p className="muted small">{card.total_episodes} episodes</p>}
            </div>
          </article>

          <div className="swipe-side">
            <div className="swipe-buttons">
              {CHOICES.map((c) => (
                <button
                  key={c.choice}
                  type="button"
                  className={`swipe-btn swipe-${c.choice}`}
                  onClick={() => choose(c.choice)}
                  disabled={saving}
                >
                  <span className="brush swipe-btn-zh">{c.zh}</span>
                  <span>{c.label}</span>
                  <kbd>{c.arrow}</kbd>
                </button>
              ))}
            </div>

            {lastAction && (
              <p className="swipe-last">
                <span className="muted">
                  {lastAction.drama.title}: {LABEL[lastAction.choice]}
                </span>
                <button type="button" className="link-btn" onClick={undo} disabled={saving}>
                  Undo <kbd>Ctrl Z</kbd>
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Discover
