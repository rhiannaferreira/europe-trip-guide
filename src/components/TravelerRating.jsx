// A place's Tripadvisor traveler rating, inside a place card the person has opened. Loaded fresh each
// time (Tripadvisor's terms forbid keeping it), shown as Tripadvisor gives it, set apart in its own box
// with their name, rating image and the links their terms require. When no listing matches the place
// with confidence, it says so rather than risk showing another place's rating.
import { useEffect, useState } from 'react'
import { getTravelerRating, ratingsEnabled } from '../services/live/ratings.js'
import { track } from '../lib/analytics.js'

const fmt = (n) => n.toLocaleString('en-GB')

function Bubbles({ rating }) {
  return (
    <span className="ta-bubbles" role="img" aria-label={`${rating} of 5 bubbles`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`ta-bubble${rating >= i ? ' full' : rating >= i - 0.5 ? ' half' : ''}`} />
      ))}
    </span>
  )
}

export default function TravelerRating({ place }) {
  const [state, setState] = useState({ status: 'idle' })
  const key = place ? `${place.id}|${place.lat},${place.lng}` : ''
  useEffect(() => {
    if (!place?.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return undefined
    let live = true
    ratingsEnabled()
      .then((on) => {
        if (!on || !live) return null
        setState({ status: 'loading' })
        return getTravelerRating(place).then((d) => {
          if (!live) return
          setState(d)
          track('traveler_rating', { outcome: d.status })
        })
      })
      .catch((e) => live && setState({ status: 'error', code: e?.code }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (state.status === 'idle' || state.status === 'error' || state.status === 'not_available') return null
  if (state.status === 'loading') return <p className="ta-box ta-loading">Checking Tripadvisor traveler ratings…</p>
  if (state.status !== 'rated') return <p className="ta-box ta-none">No traveler rating available for this place.</p>
  const r = state.rating
  return (
    <section className="ta-box" aria-label="Tripadvisor traveler rating">
      <div className="ta-row">
        {r.ratingImage ? (
          <a href={r.url} target="_blank" rel="noopener nofollow">
            <img className="ta-rating-img" src={r.ratingImage} alt={`${r.rating} of 5 bubbles on Tripadvisor`} height="20" />
          </a>
        ) : (
          <Bubbles rating={r.rating} />
        )}
        <strong className="ta-score">{r.rating.toFixed(1)}</strong>
        {r.reviewCount != null && (
          <a href={r.url} target="_blank" rel="noopener nofollow">
            {fmt(r.reviewCount)} review{r.reviewCount === 1 ? '' : 's'}
          </a>
        )}
      </div>
      {r.ranking && <p className="ta-line">{r.ranking}</p>}
      {r.status === 'temporarily_closed' && <p className="ta-line">Listed on Tripadvisor as temporarily closed.</p>}
      {r.status === 'closed' && <p className="ta-line">Listed on Tripadvisor as closed.</p>}
      <p className="ta-line ta-credit">
        Tripadvisor traveler rating for{' '}
        <a href={r.url} target="_blank" rel="noopener nofollow">
          {r.name || 'this place'}
        </a>
      </p>
      <p className="ta-links">
        {r.url && (
          <a href={r.url} target="_blank" rel="noopener nofollow">
            More on Tripadvisor
          </a>
        )}
        {r.photosUrl && r.photoCount > 0 && (
          <a href={r.photosUrl} target="_blank" rel="noopener nofollow">
            See all photos
          </a>
        )}
        {r.writeReviewUrl && (
          <a href={r.writeReviewUrl} target="_blank" rel="noopener nofollow">
            Write a review
          </a>
        )}
      </p>
    </section>
  )
}
