import type { Drama } from '../api'
import Poster from './Poster'

function DramaCard({ drama, rank }: { drama: Drama; rank?: number }) {
  return (
    <div className="drama-card">
      <div className="poster-wrap">
        <Poster path={drama.poster_path} title={drama.title} fallback={drama.original_title} />
        {rank !== undefined && <span className="rank">{rank}</span>}
      </div>
      <div className={rank !== undefined ? 'card-text with-rank' : 'card-text'}>
        <div className="card-title">{drama.title}</div>
        <div className="muted small">
          {drama.total_episodes ? `${drama.total_episodes} episodes` : drama.original_title}
        </div>
      </div>
    </div>
  )
}

export default DramaCard
