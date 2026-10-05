// Small shared pieces for live data: the source label, live place facts, loading and fallback notes.
import { useEffect, useState } from 'react'
import { SOURCES } from '../services/live/models.js'
import { openNow } from '../services/live/openingHours.js'
import { cityZoneOf } from '../services/live/places.js'
import { agoText } from '../services/live/time.js'
import { LIVE_ERROR_TEXT } from '../services/live/http.js'
import { formatDistance } from '../utils/distance.js'

// LIVE / EUROWANDER PICK / SCHEDULED / REAL-TIME / ESTIMATE, small and quiet.
export function SourceLabel({ kind, className = '', children }) {
  const s = SOURCES[kind]
  if (!s) return null
  return (
    <span className={`src-label src-${s.tone} ${className}`} title={s.title}>
      {kind === 'live' || kind === 'realtime' ? <span className="src-dot" aria-hidden="true" /> : null}
      {children || s.label}
    </span>
  )
}

// "Updated 3 min ago", refreshed every half minute while shown.
export function Freshness({ at, verb = 'Updated', className = 'freshness' }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!at) return undefined
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [at])
  if (!at) return null
  return <span className={className}>{agoText(at, { verb })}</span>
}

// The facts a live place has, and only those: what it is, open now (by listed hours), distance, address.
export function LivePlaceFacts({ place, distanceKm = null, compact = false }) {
  const hours = place.openingHours ? openNow(place.openingHours, cityZoneOf(place.cityId)) : { state: null, text: '' }
  const bits = []
  if (hours.text) bits.push(<span key="h" className={hours.state?.open ? 'open-now' : 'closed-now'}>{hours.text}</span>)
  if (distanceKm != null) bits.push(<span key="d">{formatDistance(distanceKm)} away</span>)
  return (
    <>
      {bits.length > 0 && (
        <p className="live-facts">
          {bits.map((b, i) => (
            <span key={i}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              {b}
            </span>
          ))}
          {hours.text && <span className="live-hint"> (listed hours)</span>}
        </p>
      )}
      {!compact && place.address && <p className="live-address">{place.address}</p>}
      {!compact && place.openingHours && !hours.text && <p className="live-address">Listed hours: {place.openingHours}</p>}
    </>
  )
}

// Links a live place has: directions, website, phone. Directions open the device's maps app.
export function LivePlaceLinks({ place }) {
  const dest = `${place.lat},${place.lng}`
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 0
  const directions = apple ? `https://maps.apple.com/?daddr=${dest}&dirflg=w` : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`
  return (
    <p className="place-source">
      <a href={directions} target="_blank" rel="noopener noreferrer">
        Directions<span className="visually-hidden"> to {place.name}</span>
      </a>
      {place.website && (
        <a href={place.website} target="_blank" rel="noopener noreferrer">
          Website<span className="visually-hidden"> of {place.name}</span>
        </a>
      )}
      {place.phone && <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>Call</a>}
      {place.osmUrl && (
        <a href={place.osmUrl} target="_blank" rel="noopener noreferrer">
          Details<span className="visually-hidden"> for {place.name} on OpenStreetMap</span>
        </a>
      )}
    </p>
  )
}

// The attribution Geoapify and OpenStreetMap require near their data.
export function PlacesAttribution() {
  return (
    <p className="live-attrib">
      Live places{' '}
      <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">
        Powered by Geoapify
      </a>{' '}
      ·{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        © OpenStreetMap contributors
      </a>
      . Hours and details are listed by volunteers and may be out of date.
    </p>
  )
}

export function RailAttribution() {
  return (
    <p className="live-attrib">
      Timetables via{' '}
      <a href="https://transitous.org/sources/" target="_blank" rel="noopener noreferrer">
        Transitous and its open data sources
      </a>
      . Check times with the operator before you travel.
    </p>
  )
}

export function LiveLoading({ text }) {
  return (
    <p className="live-loading" role="status">
      <span className="spinner small" aria-hidden="true" /> {text}
    </p>
  )
}

// "Live places are temporarily unavailable." plus what's shown instead, and a retry.
export function LiveUnavailable({ error, what = 'Live places', fallback = 'EuroWander’s own suggestions are shown instead.', onRetry }) {
  const code = error?.code || 'unavailable'
  const head = code === 'not_configured' ? `${what} aren’t switched on yet.` : code === 'offline' ? `You’re offline, so ${what.toLowerCase()} can’t load.` : code === 'rate_limited' || code === 'cap_reached' ? LIVE_ERROR_TEXT[code] : `${what} are temporarily unavailable.`
  return (
    <div className="notice live-unavailable" role="status">
      <span>
        {head} {fallback}
      </span>
      {onRetry && code !== 'not_configured' && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
