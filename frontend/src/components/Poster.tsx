import { posterUrl } from '../api'

type Props = {
  path: string | null
  title: string
  fallback: string | null
  className?: string
}

function Poster({ path, title, fallback, className = '' }: Props) {
  const url = posterUrl(path)
  if (url) {
    return <img src={url} alt={`${title} poster`} className={`poster ${className}`} loading="lazy" />
  }
  // No TMDB poster: show the Chinese title vertically, like a book spine
  return (
    <div className={`poster poster-empty ${className}`} role="img" aria-label={`${title} poster`}>
      <span className="poster-zh">{fallback ?? title}</span>
    </div>
  )
}

export default Poster
