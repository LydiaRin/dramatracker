// API tests for the DramaTracker backend.
// Needs the backend running:  cd backend && uvicorn main:app --reload
// Run from frontend/:          npm run test:api
//
// These tests only change data they clean up again: the watchlist tests use a drama
// taken from the discover deck (so it is NOT already on your list) and delete it at the end.
// Subscriptions are only read, never written, so your real renewal dates stay untouched.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const API = process.env.API_URL ?? 'http://localhost:8000'

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

describe('health', () => {
  test('GET /health answers ok', async () => {
    const { status, data } = await call('GET', '/health')
    assert.equal(status, 200)
    assert.deepEqual(data, { status: 'ok' })
  })
})

describe('dramas', () => {
  test('GET /dramas/{id} returns a saved drama', async () => {
    // Borrow any id from the catalog through the deck
    const deck = await call('GET', '/discover?limit=1')
    assert.equal(deck.status, 200)
    assert.ok(deck.data.length > 0, 'catalog is empty: run python -m scripts.seed first')

    const { status, data } = await call('GET', `/dramas/${deck.data[0].id}`)
    assert.equal(status, 200)
    assert.equal(data.id, deck.data[0].id)
    assert.ok(data.title)
  })

  test('GET /dramas/{id} gives 404 for an unknown id', async () => {
    const { status } = await call('GET', '/dramas/999999999')
    assert.equal(status, 404)
  })

  test('GET /dramas/search finds catalog dramas first (they carry our id)', async () => {
    const deck = await call('GET', '/discover?limit=1')
    const title = deck.data[0].title
    const { status, data } = await call('GET', `/dramas/search?q=${encodeURIComponent(title)}`)
    assert.equal(status, 200)
    assert.ok(data.length > 0)
    assert.ok(data.every((d) => d.id !== null), 'local results should all have our id')
  })

  test('GET /dramas/search falls back to TMDB when the catalog has no match', { timeout: 60_000 }, async () => {
    // A rare title unlikely to be in the seeded catalog; TMDB results have no id of ours
    const { status, data } = await call('GET', '/dramas/search?q=Chen%20Qing%20Ling')
    assert.equal(status, 200)
    assert.ok(Array.isArray(data))
    for (const d of data) assert.ok(d.tmdb_id && d.title)
  })

  test('GET /dramas/search without q is rejected', async () => {
    const { status } = await call('GET', '/dramas/search')
    assert.equal(status, 422)
  })
})

describe('discover deck', () => {
  test('GET /discover respects the limit', async () => {
    const { status, data } = await call('GET', '/discover?limit=5')
    assert.equal(status, 200)
    assert.ok(data.length <= 5)
  })

  test('the deck never contains dramas already on the watchlist', async () => {
    const [deck, list] = await Promise.all([call('GET', '/discover?limit=50'), call('GET', '/watchlist')])
    const onList = new Set(list.data.map((e) => e.drama_id))
    assert.ok(deck.data.every((d) => !onList.has(d.id)))
  })

    test('POST /discover/{drama_id} classifies want / watched / rewatch', async () => {
    // Three different deck cards, one per choice; each lands on the watchlist and is removed after
    const deck = await call('GET', '/discover?limit=3')
    assert.ok(deck.data.length === 3, 'need at least 3 dramas in the deck')
    const cases = [
      { drama: deck.data[0], choice: 'want', status: 'planned', rewatch: false },
      { drama: deck.data[1], choice: 'watched', status: 'done', rewatch: false },
      { drama: deck.data[2], choice: 'rewatch', status: 'done', rewatch: true },
    ]
    const created = []
    try {
      for (const c of cases) {
        const res = await call('POST', `/discover/${c.drama.id}`, { choice: c.choice })
        assert.equal(res.status, 204, `${c.choice} should return 204`)
      }

      const list = await call('GET', '/watchlist')
      for (const c of cases) {
        const entry = list.data.find((e) => e.drama_id === c.drama.id)
        assert.ok(entry, `${c.choice}: drama should be on the watchlist`)
        created.push(entry.id)
        assert.equal(entry.status, c.status)
        // watched/rewatch mark the whole drama as seen
        if (c.status === 'done') assert.equal(entry.current_episode, c.drama.total_episodes ?? 0)
      }

      // Classifying the same card again must not create a duplicate
      const again = await call('POST', `/discover/${cases[0].drama.id}`, { choice: 'want' })
      assert.equal(again.status, 204)
      const listAgain = await call('GET', '/watchlist')
      assert.equal(listAgain.data.filter((e) => e.drama_id === cases[0].drama.id).length, 1)

      // Classified dramas leave the deck
      const deckNow = await call('GET', '/discover?limit=200')
      for (const c of cases) assert.ok(deckNow.data.every((d) => d.id !== c.drama.id))
    } finally {
      for (const id of created) await call('DELETE', `/watchlist/${id}`)
    }
  })

  test('POST /discover/{drama_id} rejects an unknown choice', async () => {
    const deck = await call('GET', '/discover?limit=1')
    const { status } = await call('POST', `/discover/${deck.data[0].id}`, { choice: 'maybe' })
    assert.equal(status, 422)
  })

  test('POST /discover/{drama_id} gives 404 for an unknown drama', async () => {
    const { status } = await call('POST', '/discover/999999999', { choice: 'want' })
    assert.equal(status, 404)
  })

  test('POST /discover/{drama_id} with "no" dismisses the drama', {
    skip: 'no API way to undo a dismissal yet, so running it would remove a real drama from your deck',
  })
})

describe('platforms and subscriptions', () => {
  test('GET /platforms lists platforms', async () => {
    const { status, data } = await call('GET', '/platforms')
    assert.equal(status, 200)
    assert.ok(Array.isArray(data))
  })

  test('GET /subscriptions lists my subscriptions with their platform', async () => {
    const { status, data } = await call('GET', '/subscriptions')
    assert.equal(status, 200)
    for (const s of data) assert.ok(s.platform && s.platform.name)
  })

  test('PUT /subscriptions/{id} gives 404 for an unknown platform', async () => {
    const { status } = await call('PUT', '/subscriptions/999999999', { tier: 'VIP' })
    assert.equal(status, 404)
  })
})

describe('watchlist lifecycle (cleans up after itself)', () => {
  test('add → no duplicate → update → validation → delete', async () => {
    // A deck drama is guaranteed not to be on the list yet
    const deck = await call('GET', '/discover?limit=20')
    const drama = deck.data.find((d) => d.total_episodes) ?? deck.data[0]
    assert.ok(drama, 'deck is empty')

    // Add
    const added = await call('POST', `/watchlist/${drama.tmdb_id}`)
    assert.equal(added.status, 200)
    assert.equal(added.data.drama_id, drama.id)
    assert.equal(added.data.current_episode, 0)
    const entryId = added.data.id

    try {
      // Adding twice returns the same entry instead of a duplicate
      const again = await call('POST', `/watchlist/${drama.tmdb_id}`)
      assert.equal(again.data.id, entryId)

      // Progress update
      const updated = await call('PATCH', `/watchlist/${entryId}`, { current_episode: 1, status: 'watching' })
      assert.equal(updated.status, 200)
      assert.equal(updated.data.current_episode, 1)

      // An episode past the drama's total is refused
      if (drama.total_episodes) {
        const tooFar = await call('PATCH', `/watchlist/${entryId}`, { current_episode: drama.total_episodes + 1 })
        assert.equal(tooFar.status, 400)
      }

      // Negative episodes are refused by the schema (ge=0)
      const negative = await call('PATCH', `/watchlist/${entryId}`, { current_episode: -1 })
      assert.equal(negative.status, 422)

      // Unknown platform is refused
      const badPlatform = await call('PATCH', `/watchlist/${entryId}`, { platform_id: 999999999 })
      assert.equal(badPlatform.status, 404)

      // The deck no longer offers a drama that is on the list
      const deckNow = await call('GET', '/discover?limit=200')
      assert.ok(deckNow.data.every((d) => d.id !== drama.id))
    } finally {
      // Delete, even if an assertion above failed, so your real list is left as it was
      const deleted = await call('DELETE', `/watchlist/${entryId}`)
      assert.equal(deleted.status, 204)
    }

    const gone = await call('DELETE', `/watchlist/${entryId}`)
    assert.equal(gone.status, 404)
  })
})