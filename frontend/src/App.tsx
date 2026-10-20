import HeroArt from './HeroArt'
import './App.css'

// ---- Types: the shape of the data each part of the page needs ----
type Drama = {
  zh: string
  title: string
  meta: string
  bg: string
  rank?: number
  tag?: string
}

type InProgress = {
  char: string
  title: string
  episode: number
  total: number
  bg: string
}

// ---- Sample data (replaced by API calls later) ----
const moods = [
  { zh: '泪', label: 'A good cry' },
  { zh: '谋', label: 'Court scheming' },
  { zh: '甜', label: 'Something sweet' },
  { zh: '仙', label: 'Immortals & magic' },
  { zh: '笑', label: 'Make me laugh' },
]

const popular: Drama[] = [
  { rank: 1, zh: '庆余年', tag: '新季', title: 'Joy of Life', meta: '46 eps · Historical', bg: '#3B3836' },
  { rank: 2, zh: '偷偷藏不住', title: 'Hidden Love', meta: '25 eps · Romance', bg: '#C94F5C' },
  { rank: 3, zh: '星汉灿烂', title: 'Love Like the Galaxy', meta: '56 eps · Historical', bg: '#5E5A55' },
  { rank: 4, zh: '琅琊榜', tag: '经典', title: 'Nirvana in Fire', meta: '54 eps · Court intrigue', bg: '#2B2826' },
  { rank: 5, zh: '苍兰诀', title: 'Love Between Fairy and Devil', meta: '36 eps · Xianxia', bg: '#8E3A33' },
  { rank: 6, zh: '知否', title: 'The Story of Ming Lan', meta: '78 eps · Family', bg: '#6F665D' },
  { rank: 7, zh: '长相思', title: 'Lost You Forever', meta: '39 eps · Xianxia', bg: '#4A4542' },
  { rank: 8, zh: '去有风的地方', tag: '治愈', title: 'Meet Yourself', meta: '40 eps · Slice of life', bg: '#B3282D' },
]

const continuing: InProgress[] = [
  { char: '凤', title: 'The Legend of ShenLi', episode: 1, total: 39, bg: '#3B3836' },
  { char: '庆', title: 'Joy of Life Season 2', episode: 14, total: 36, bg: '#8E3A33' },
  { char: '棠', title: 'Blossom', episode: 30, total: 34, bg: '#C94F5C' },
]

// ---- Small components ----
function DramaCard({ drama }: { drama: Drama }) {
  return (
    <a href="#" className="drama-card">
      <div className="poster-wrap">
        <div className="poster" style={{ background: drama.bg }}>
          <span className="poster-zh">{drama.zh}</span>
        </div>
        {drama.rank && <span className="rank">{drama.rank}</span>}
        {drama.tag && <span className="stamp">{drama.tag}</span>}
      </div>
      <div className="card-text">
        <div className="card-title">{drama.title}</div>
        <div className="muted small">{drama.meta}</div>
      </div>
    </a>
  )
}

function ContinueItem({ item }: { item: InProgress }) {
  const percent = Math.round((item.episode / item.total) * 100)
  return (
    <a href="#" className="continue-item">
      <div className="mini-poster" style={{ background: item.bg }}>{item.char}</div>
      <div className="continue-text">
        <span className="continue-title">{item.title}</span>
        <span className="muted small">Episode {item.episode} of {item.total}</span>
        <div className="bar"><div className="bar-fill" style={{ width: `${percent}%` }}></div></div>
      </div>
    </a>
  )
}

// ---- The page ----
function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="container header-row">
          <a href="#" className="brand">
            <span className="seal">剧</span>
            <span className="brand-name">DramaTracker</span>
          </a>
          <label className="search">
            <span className="visually-hidden">Search dramas</span>
            <input type="search" placeholder="Find your next obsession…" />
          </label>
          <nav className="nav">
            <a href="#" className="active">Home</a>
            <a href="#">Browse</a>
            <a href="#">My Watchlist</a>
            <a href="#">Airing</a>
          </nav>
          <a href="#" className="avatar" aria-label="Your profile">丽</a>
        </div>
      </header>

      <section className="hero">
        <HeroArt />
        <div className="container hero-content">
          <p className="brush hero-zh">欢迎回来</p>
          <h1 className="hero-title">Welcome back, Lydia</h1>
          <p className="hero-sub">Shen Li is still waiting for you. Episode 2 tonight?</p>
        </div>
      </section>

      <section className="moods">
        <div className="container moods-row">
          <span className="moods-label">Tonight I want…</span>
          {moods.map((m) => (
            <button key={m.label} type="button" className="mood">
              <span className="brush mood-zh">{m.zh}</span>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <div className="container layout">
        <main className="main">
          <div className="section-head">
            <h2>Everyone's watching</h2>
            <span className="brush red section-zh">热播</span>
            <a href="#" className="see-all">See all →</a>
          </div>
          <div className="grid">
            {popular.map((d) => (
              <DramaCard key={d.title} drama={d} />
            ))}
          </div>
        </main>

        <aside className="sidebar">
          <section className="panel">
            <div className="panel-head">
              <h2>Keep watching</h2>
              <span className="brush red">追剧</span>
            </div>
            <div className="stack">
              {continuing.map((item) => (
                <ContinueItem key={item.title} item={item} />
              ))}
            </div>
          </section>

          <section className="fortune">
            <span className="brush fortune-bg" aria-hidden="true">签</span>
            <p className="brush fortune-label">Fortune slip</p>
            <p className="fortune-title">WeTV VIP ends in 12 days</p>
            <p className="fortune-text">Watch 6 episodes a week and you finish ShenLi before it renews.</p>
          </section>
        </aside>
      </div>

      <footer className="footer">
        <div className="container footer-row">
          <span className="brush footer-zh">追剧愉快</span>
          <span>Data from TMDB. Streaming availability from JustWatch.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
