// The way into Travel Mode from planning: prominent while the trip is happening, a quiet preview before it,
// a look back after it. Travel Mode never opens on its own.
import { useEffect, useMemo } from 'react'
import { Link } from '../lib/router.jsx'
import { tripStatus } from './travelModel.js'

export default function TravelEntry({ trip, variant = 'panel' }) {
  const status = useMemo(() => tripStatus(trip), [trip])
  // While the trip is close or happening, fetch Travel Mode's code in the background, so it opens offline later.
  const soon = status.status === 'active' || (status.status === 'upcoming' && status.daysUntil <= 7)
  useEffect(() => {
    if (!soon) return
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000))
    idle(() => import('./TravelPage.jsx').catch(() => {}))
  }, [soon])
  if (status.status === 'active') {
    return (
      <div className={`tm-entry tm-entry-${variant}`} role="region" aria-label="Your trip is happening now">
        <p>
          <strong>Your trip is happening now.</strong> Day {status.today.number} of {status.days.length}.
        </p>
        <Link to="/travel" className="btn btn-primary tm-entry-btn">
          🧭 Enter Travel Mode
        </Link>
      </div>
    )
  }
  if (variant !== 'panel') return null
  if (status.status === 'upcoming') {
    return (
      <p className="tm-entry-quiet">
        <Link to="/travel" className="btn tm-entry-btn-sm">
          👀 Preview Travel Mode
        </Link>{' '}
        <span className="tm-muted">See how each day will look while you travel.</span>
      </p>
    )
  }
  if (status.status === 'completed') {
    return (
      <p className="tm-entry-quiet">
        <Link to="/travel" className="btn tm-entry-btn-sm">
          Look back in Travel Mode
        </Link>
      </p>
    )
  }
  return null
}
