import type { CSSProperties } from 'react'
import type { Drama } from '../api'
import Poster from './Poster'

function DramaCard({ drama, rank }: { drama: Drama; rank?: number }) {
  // Each card glows in its own drama's colour on hover
  const style = drama.accent ? ({ '--card-accent': drama.accent } as CSSProperties) : undefined
  return (
    <div className="drama-card" style={style}>
      <div className="poster-wrap">
        <Poster path={drama.poster_path} title={drama.title} fallback={drama.original_title} />
        {rank !== undefined && <span className="rank">{rank}</span>}
      </div>
      <div className={rank !== undefined ? 'card-text with-rank' : 'card-text'}>
        <div className="card-title">{drama.title}</div>
        {drama.original_title && <div className="card-zh">{drama.original_title}</div>}
      </div>
    </div>
  )
}

export default DramaCard
