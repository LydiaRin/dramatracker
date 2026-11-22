import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../api'
import SearchBox from './SearchBox'

function Layout() {
  // Pings GET /health so a stopped backend shows up as one clear message instead of errors everywhere
  const [online, setOnline] = useState(true)

  useEffect(() => {
    function check() {
      api
        .health()
        .then(() => setOnline(true))
        .catch(() => setOnline(false))
    }
    check()
    const timer = window.setInterval(check, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="page">
      {!online && (
        <p className="offline" role="status">
          Can't reach the server. Is uvicorn running on port 8000?
        </p>
      )}
      <header className="header">
        <div className="container header-row">
          <Link to="/" className="brand">
            <span className="seal">剧</span>
            <span className="brand-name">DramaTracker</span>
          </Link>
          <SearchBox />
          <nav className="nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/discover">What to watch</NavLink>
            <NavLink to="/watchlist">My list</NavLink>
            <NavLink to="/subscriptions">Subscriptions</NavLink>
          </nav>
          <span className="avatar" aria-hidden="true">
            丽
          </span>
        </div>
      </header>

      <Outlet />

      <footer className="footer">
        <div className="container footer-row">
          <span className="brush footer-zh">追剧愉快</span>
          <span>Data from TMDB. Streaming availability from JustWatch.</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
