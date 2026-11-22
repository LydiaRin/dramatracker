import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorText, posterUrl } from '../api'
import type { SearchResult } from '../api'

// Header search. The backend looks in our catalog first and only asks TMDB when nothing matches,
// so results either carry our id (open the drama page) or only a TMDB id (save it first, then open).
function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [opening, setOpening] = useState<number | null>(null)
  const latest = useRef(0)
  const box = useRef<HTMLDivElement>(null)

  // Wait until she stops typing; a TMDB fallback search can take a few seconds
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = ++latest.current
    const timer = window.setTimeout(() => {
      setStatus('searching')
      api
        .search(q)
        .then((found) => {
          if (id !== latest.current) return
          setResults(found.slice(0, 8))
          setActive(0)
          setStatus('done')
        })
        .catch((e) => {
          if (id !== latest.current) return
          setError(errorText(e))
          setStatus('error')
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [query])

  // Click outside closes the dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function choose(result: SearchResult) {
    setOpening(result.tmdb_id)
    try {
      // A TMDB-only result is saved to the catalog first, so it gets a page of its own
      const id = result.id ?? (await api.addToCatalog(result.tmdb_id)).id
      setOpen(false)
      setQuery('')
      setResults([])
      setStatus('idle')
      navigate(`/drama/${id}`)
    } catch (e) {
      setError(errorText(e))
      setStatus('error')
    } finally {
      setOpening(null)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && query.trim().length >= 2

  return (
    <div className="search" ref={box}>
      <label className="visually-hidden" htmlFor="search-input">
        Search dramas
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search dramas, 剧名…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setError(null)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls="search-results"
      />
      {showList && (
        <div className="search-drop" id="search-results" role="listbox">
          {status === 'searching' && results.length === 0 && <p className="search-note thinking">Searching…</p>}
          {status === 'error' && <p className="search-note">{error}</p>}
          {status === 'done' && results.length === 0 && <p className="search-note">No drama found.</p>}
          {results.map((r, i) => {
            const url = posterUrl(r.poster_path)
            return (
              <button
                key={r.tmdb_id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? 'search-item active' : 'search-item'}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                disabled={opening !== null}
              >
                {url ? <img src={url} alt="" /> : <span className="search-thumb brush">{(r.original_title ?? r.title).slice(0, 1)}</span>}
                <span className="search-text">
                  <span className="search-title">{r.title}</span>
                  {r.original_title && <span className="brush search-zh">{r.original_title}</span>}
                </span>
                <span className="search-tag caps">{opening === r.tmdb_id ? 'Saving…' : r.id ? 'In catalog' : 'From TMDB'}</span>
              </button>
            )
          })}
          {status === 'searching' && results.length > 0 && <p className="search-note thinking">Updating…</p>}
        </div>
      )}
    </div>
  )
}

export default SearchBox
