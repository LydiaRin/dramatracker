import { useEffect, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorText, posterUrl } from '../api'
import { accentStyle, zhNumber } from '../accent'
import type { Choice, DeckOrder, Direction, Drama } from '../api'
import Poster from '../components/Poster'
import { MOODS } from '../moods'
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

type LastAction = { drama: Drama; choice: Choice }

// What the AI said about one drama: the cached "why", and her questions with their answers
type Talk = { reason?: string; reasonError?: string; qa: { q: string; a: string | null; error?: string }[] }

// The four answers, by swipe direction
const SWIPES: Record<'left' | 'right' | 'up' | 'down', Choice> = {
  left: 'no',
  right: 'want',
  up: 'rewatch',
  down: 'watched',
}
const SWIPE_DISTANCE = 90 // px of drag before letting go counts as an answer

// Front: the poster. Back: the synopsis. Both sides are the same size, so flipping never moves the page.
// The front can be dragged (finger or mouse) in the four directions to answer, like the arrow keys.
function SwipeCard({ drama, onSwipe, disabled }: { drama: Drama; onSwipe: (c: Choice) => void; disabled: boolean }) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [turning, setTurning] = useState(false)
  const [flippedOnce, setFlippedOnce] = useState(false)
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false, leaving: false })
  const start = useRef<{ x: number; y: number; id: number } | null>(null)

  function flip() {
    if (turning) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setSide((s) => (s === 'front' ? 'back' : 'front'))
      return
    }
    // Turn the card edge-on, swap sides while it is invisible, then turn it back
    setTurning(true)
    window.setTimeout(() => {
      setSide((s) => (s === 'front' ? 'back' : 'front'))
      setTurning(false)
      setFlippedOnce(true)
    }, 220)
  }

  // Which answer the current drag points to, once it is far enough
  function dragChoice(x: number, y: number): Choice | null {
    if (Math.max(Math.abs(x), Math.abs(y)) < SWIPE_DISTANCE) return null
    if (Math.abs(x) >= Math.abs(y)) return x > 0 ? SWIPES.right : SWIPES.left
    return y < 0 ? SWIPES.up : SWIPES.down
  }

  function onPointerDown(e: ReactPointerEvent) {
    // Only the poster side drags; buttons inside the card keep working as buttons
    if (disabled || side !== 'front' || turning || (e.target as HTMLElement).closest('button')) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ x: 0, y: 0, active: true, leaving: false })
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!start.current || start.current.id !== e.pointerId) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true, leaving: false })
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (!start.current || start.current.id !== e.pointerId) return
    start.current = null
    const choice = dragChoice(drag.x, drag.y)
    if (!choice) {
      setDrag({ x: 0, y: 0, active: false, leaving: false }) // not far enough: spring back
      return
    }
    // Throw the card off in the direction it was going, then answer
    const scale = 1400 / Math.max(1, Math.hypot(drag.x, drag.y))
    setDrag({ x: drag.x * scale, y: drag.y * scale, active: false, leaving: true })
    window.setTimeout(() => onSwipe(choice), 200)
  }

  const meta = [drama.total_episodes ? `${drama.total_episodes} episodes` : null, drama.genres].filter(Boolean).join(' · ')
  const pointing = drag.active || drag.leaving ? dragChoice(drag.x, drag.y) : null
  const stamp = pointing ? CHOICES.find((c) => c.choice === pointing) : null
  const moved = drag.active || drag.leaving || drag.x !== 0 || drag.y !== 0

  return (
    <article
      className={[
        'swipe-card',
        side === 'back' ? 'is-back' : flippedOnce ? 'is-returned' : '',
        turning ? 'is-turning' : '',
        side === 'front' ? 'is-draggable' : '',
        drag.active ? 'is-dragging' : '',
      ].join(' ')}
      style={moved ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {stamp && (
        <span className={`brush swipe-stamp swipe-stamp-${stamp.choice}`} aria-hidden="true">
          {stamp.zh}
        </span>
      )}
      {side === 'front' ? (
        <>
          <Poster path={drama.poster_path} title={drama.title} fallback={drama.original_title} className="swipe-poster" />
          <div className="swipe-info">
            <h2>{drama.title}</h2>
            {drama.original_title && <p className="brush swipe-zh">{drama.original_title}</p>}
            {meta && <p className="muted small">{meta}</p>}
            {drama.overview && (
              <button type="button" className="link-btn flip-btn" onClick={flip}>
                Synopsis →
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="swipe-back">
          <div className="swipe-back-head">
            <h2>{drama.title}</h2>
            {drama.original_title && <span className="brush swipe-zh">{drama.original_title}</span>}
          </div>
          {meta && <p className="muted small">{meta}</p>}
          <p className="swipe-overview">{drama.overview}</p>
          <button type="button" className="link-btn flip-btn" onClick={flip}>
            ← Poster
          </button>
        </div>
      )}
    </article>
  )
}

function Discover() {
  const [params, setParams] = useSearchParams()
  // A mood picked on Home arrives as ?mood=..., and becomes the deck's direction
  const moodFromHome = params.get('mood')

  const [order, setOrder] = useState<DeckOrder>('for_you')
  const [deck, setDeck] = useState<Drama[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
  const [added, setAdded] = useState(0)

  const [direction, setDirection] = useState<Direction>({ direction: null, description: null })
  const [draft, setDraft] = useState('')
  const [steering, setSteering] = useState(moodFromHome !== null)
  const [editingDirection, setEditingDirection] = useState(false)

  const [talks, setTalks] = useState<Record<number, Talk>>({})
  const [question, setQuestion] = useState('')

  // Ids answered this session: a deck fetched before their POST landed could bring them back
  const answered = useRef(new Set<number>())
  // Only the newest deck request may write to the deck (answers can trigger several in a row)
  const deckRequest = useRef(0)

  function fetchDeck(which: DeckOrder, keepFront: boolean) {
    const id = ++deckRequest.current
    return api.deck(BATCH, which).then((fresh) => {
      if (id !== deckRequest.current) return
      setDeck((current) => {
        // Keep the card she is looking at; re-rank everything behind it with the new taste
        const front = keepFront ? current[0] : undefined
        const rest = fresh.filter((f) => !answered.current.has(f.id) && f.id !== front?.id)
        return front ? [front, ...rest] : rest
      })
    })
  }

  // First load, and again whenever the order toggle changes
  useEffect(() => {
    fetchDeck(order, false)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false))
  }, [order])

  // Current direction; or, when coming from a Home mood, set that mood as the direction
  useEffect(() => {
    if (moodFromHome) {
      api
        .setDirection(moodFromHome)
        .then((d) => {
          setDirection(d)
          setParams({}, { replace: true })
          return fetchDeck('for_you', false)
        })
        .catch((e) => setError(errorText(e)))
        .finally(() => setSteering(false))
    } else {
      api
        .direction()
        .then(setDirection)
        .catch(() => {})
    }
    // Runs once on arrival; the mood param is cleared right after it is used
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeOrder(next: DeckOrder) {
    if (next === order) return
    setLoading(true)
    setDeck([])
    setOrder(next)
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
      // Every answer moves her taste, so the cards behind the current one are re-ranked
      fetchDeck(order, true).catch((e) => setError(errorText(e)))
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
      fetchDeck(order, true).catch((e) => setError(errorText(e)))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  async function steer(text: string) {
    const wish = text.trim()
    if (!wish || steering) return
    setSteering(true)
    setError(null)
    try {
      setDirection(await api.setDirection(wish))
      setDraft('')
      setEditingDirection(false)
      // A new direction changes which card should come first, so the whole deck is replaced
      if (order !== 'for_you') changeOrder('for_you')
      else await fetchDeck('for_you', false)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSteering(false)
    }
  }

  function onSteer(e: FormEvent) {
    e.preventDefault()
    steer(draft)
  }

  async function clearSteer() {
    setSteering(true)
    setError(null)
    try {
      await api.clearDirection()
      setDirection({ direction: null, description: null })
      await fetchDeck(order, false)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSteering(false)
    }
  }

  function updateTalk(dramaId: number, change: (t: Talk) => Talk) {
    setTalks((all) => ({ ...all, [dramaId]: change(all[dramaId] ?? { qa: [] }) }))
  }

  async function whyMe(drama: Drama) {
    if (talks[drama.id]?.reason === '') return // already asking
    updateTalk(drama.id, (t) => ({ ...t, reason: '', reasonError: undefined }))
    try {
      const reason = await api.reason(drama.id)
      updateTalk(drama.id, (t) => ({ ...t, reason }))
    } catch (e) {
      updateTalk(drama.id, (t) => ({ ...t, reason: undefined, reasonError: errorText(e) }))
    }
  }

  async function onAsk(e: FormEvent, drama: Drama) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    setQuestion('')
    const index = talks[drama.id]?.qa.length ?? 0
    updateTalk(drama.id, (t) => ({ ...t, qa: [...t.qa, { q, a: null }] }))
    try {
      const a = await api.ask(drama.id, q)
      updateTalk(drama.id, (t) => ({ ...t, qa: t.qa.map((x, i) => (i === index ? { ...x, a } : x)) }))
    } catch (err) {
      updateTalk(drama.id, (t) => ({
        ...t,
        qa: t.qa.map((x, i) => (i === index ? { ...x, a: '', error: errorText(err) } : x)),
      }))
    }
  }

  // Arrow keys answer, Ctrl+Z undoes; typing in a text box never triggers them
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
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
  const talk = card ? talks[card.id] : undefined
  const showDirectionForm = !direction.direction || editingDirection

  const glow = card ? posterUrl(card.poster_path) : null

  return (
    // The whole page takes the colour of the drama on the card
    <div className="discover-page" style={accentStyle(card?.accent)}>
      {glow && <div className="discover-glow" style={{ backgroundImage: `url(${glow})` }} aria-hidden="true" />}
      <div className="container discover">
      <div className="discover-head">
        <span className="brush discover-zh">选剧</span>
        <h1>What should I watch?</h1>
        <div className="order-toggle" role="group" aria-label="Order the deck">
          <button
            type="button"
            className={order === 'for_you' ? 'order-btn active' : 'order-btn'}
            onClick={() => changeOrder('for_you')}
            aria-pressed={order === 'for_you'}
          >
            <span className="brush">推荐</span> For you
          </button>
          <button
            type="button"
            className={order === 'top' ? 'order-btn active' : 'order-btn'}
            onClick={() => changeOrder('top')}
            aria-pressed={order === 'top'}
          >
            <span className="brush">热播</span> Top rated
          </button>
        </div>
        <span className="muted small discover-count">
          {added} added to <Link to="/watchlist?tab=planned" className="red">your queue</Link>
        </span>
      </div>

      {/* The deck talks: it asks what she is in the mood for, and shows what it is aiming at */}
      <section className="steer" aria-live="polite">
        <span className="brush steer-seal" aria-hidden="true">问</span>
        <div className="steer-body">
          {steering ? (
            <p className="steer-line thinking">Thinking about what you asked for…</p>
          ) : direction.direction && !editingDirection ? (
            <>
              <p className="steer-line">
                You asked for <strong>“{direction.direction}”</strong>. I'm looking for:
              </p>
              {direction.description && <p className="steer-description">{direction.description}</p>}
              <div className="steer-actions">
                <button type="button" className="link-btn" onClick={() => setEditingDirection(true)}>
                  Change direction
                </button>
                <button type="button" className="link-btn muted-link" onClick={clearSteer}>
                  Clear, go back to my taste
                </button>
              </div>
            </>
          ) : (
            <p className="steer-line">
              {order === 'top'
                ? 'Browsing top rated. Tell me what you are in the mood for and I will pick for you.'
                : 'What are you in the mood for tonight? Tell me here, or simply sort the dramas below with the four buttons: every answer teaches me your taste.'}
            </p>
          )}

          {showDirectionForm && !steering && (
            <>
              <form className="steer-form" onSubmit={onSteer}>
                <label className="visually-hidden" htmlFor="steer-input">
                  What are you in the mood for?
                </label>
                <input
                  id="steer-input"
                  className="text-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. something funny and modern, no tragedy"
                  maxLength={500}
                />
                <button type="submit" className="btn btn-dark" disabled={!draft.trim()}>
                  Steer the deck
                </button>
                {editingDirection && (
                  <button type="button" className="link-btn muted-link" onClick={() => setEditingDirection(false)}>
                    Cancel
                  </button>
                )}
              </form>
              <div className="steer-moods">
                {MOODS.map((m) => (
                  <button key={m.label} type="button" className="mood mood-small" onClick={() => steer(m.prompt)}>
                    <span className="brush mood-zh">{m.zh}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {error && <p className="error-banner">{error}</p>}

      {!card && loading && <p className="muted">Shuffling the deck…</p>}
      {!card && !loading && <p className="muted">You have classified every drama in the catalog.</p>}

      {card && (
        <div className="discover-body">
          {/* key gives every drama a fresh card: the entrance animation replays and it starts poster side up */}
          {/* Poster-style title column: English in spaced capitals, details, then the calligraphy */}
          <div className="card-titles" aria-hidden="true">
            <span className="card-titles-en">{card.title}</span>
            <span className="card-titles-meta">
              {card.total_episodes ? `共${zhNumber(card.total_episodes)}集` : ''}
            </span>
            {card.original_title && <span className="brush glow card-titles-zh">{card.original_title}</span>}
          </div>

          <div className="card-stage">
            <i className="corner c1" />
            <i className="corner c2" />
            <i className="corner c3" />
            <i className="corner c4" />
            <SwipeCard key={card.id} drama={card} onSwipe={choose} disabled={saving} />
          </div>

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

            <Link to={`/drama/${card.id}`} className="link-btn details-link">
              Full details →
            </Link>

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

            {/* Talking about this one card with the local AI */}
            <section className="talk" aria-live="polite">
              <div className="talk-head">
                <h3>Ask about this drama</h3>
                <span className="brush red">聊</span>
              </div>

              {order === 'for_you' && (
                <div className="talk-why">
                  {talk?.reason ? (
                    <p className="talk-answer">
                      <span className="talk-who brush">答</span>
                      {talk.reason}
                    </p>
                  ) : talk?.reason === '' ? (
                    <p className="talk-answer thinking">Thinking about why it fits you…</p>
                  ) : (
                    <button type="button" className="link-btn" onClick={() => whyMe(card)}>
                      Why would I like it?
                    </button>
                  )}
                  {talk?.reasonError && <p className="talk-error">{talk.reasonError}</p>}
                </div>
              )}

              {talk?.qa.map((x, i) => (
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

              <form className="talk-form" onSubmit={(e) => onAsk(e, card)}>
                <label className="visually-hidden" htmlFor="ask-input">
                  Ask a question about {card.title}
                </label>
                <input
                  id="ask-input"
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
              <p className="muted small talk-note">Answers come from the synopsis only, so no spoilers. Takes a few seconds.</p>
            </section>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default Discover
