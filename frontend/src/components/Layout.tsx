import { Link, NavLink, Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div className="page">
      <header className="header">
        <div className="container header-row">
          <Link to="/" className="brand">
            <span className="seal">剧</span>
            <span className="brand-name">DramaTracker</span>
          </Link>
          {/* Search is not wired to the API yet, so the box is disabled rather than pretending to work */}
          <label className="search">
            <span className="visually-hidden">Search dramas</span>
            <input type="search" placeholder="Search is coming soon…" disabled />
          </label>
          <nav className="nav">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/discover">What to watch</NavLink>
            <NavLink to="/watchlist">My list</NavLink>
          </nav>
          <span className="avatar" aria-hidden="true">丽</span>
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
