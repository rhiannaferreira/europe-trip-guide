// The card that opens at the bottom of the map when something on it is picked: a place, a live place,
// what's under a tap, or a leg of the trip. It replaces map popups, so it never hides under the map's
// edges or a phone's bottom sheet, and it's ordinary page content (keyboard and screen reader friendly).
import { useEffect, useRef } from 'react'
import { cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { costLabel, formatDuration } from '../lib/format.js'
import { nearbyPlaces } from '../utils/nearby.js'
import { formatDistance } from '../utils/distance.js'
import { requestAsk } from '../assistant/bridge.js'
import { clock, durationText } from '../services/live/time.js'
import { stationName } from '../services/live/trains.js'
import { MapPlaceItem, LiveFoot, directions, tidy } from './MapPlaceItem.jsx'
import { SourceLabel } from '../components/LiveBits.jsx'
import { placeIcon } from '../lib/placeIcons.js'

export function CardShell({ title, onClose, children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <section ref={ref} className={`ew-card ${className}`} aria-label={title}>
      <button type="button" className="ew-card-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {children}
    </section>
  )
}

const ask = (prompt) => requestAsk(prompt, { source: 'map', kind: 'ask' })

// One of EuroWander's own places (guide picks and OpenStreetMap additions).
export function PlaceCardBody({ place: p, saved, onToggleSave, onFocusPlace }) {
  const interest = interestById[p.category]
  const city = cityById[p.cityId]
  const nearby = nearbyPlaces(p, { limit: 3 })
  return (
    <>
      <div className="ew-card-head">
        <span className="ew-card-icon" aria-hidden="true">
          {placeIcon(p)}
        </span>
        <div>
          <h3 className="ew-card-title">{p.name}</h3>
          <p className="ew-card-meta">{[city?.name, interest?.label, p.rating != null && `★ ${p.rating.toFixed(1)}`, costLabel(p.costLevel)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {p.description && <p className="ew-card-text">{p.description}</p>}
      <div className="ew-card-actions">
        <button type="button" className={`map-tap-btn primary${saved ? ' saved' : ''}`} onClick={() => onToggleSave(p.id)} aria-pressed={saved}>
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
        <a className="map-tap-btn" href={directions(p)} target="_blank" rel="noopener noreferrer">
          🧭 Directions<span className="visually-hidden"> to {p.name} (opens your maps app)</span>
        </a>
        <button type="button" className="map-tap-btn" onClick={() => ask(`Tell me about ${p.name} in ${city?.name || 'this city'}`)}>
          ✨ Ask Copilot
        </button>
      </div>
      {nearby.length > 0 && (
        <div className="ew-card-nearby">
          <small>Nearby</small>
          {nearby.map(({ place: n, km }) => (
            <button key={n.id} type="button" className="link-btn" onClick={() => onFocusPlace(n.id)}>
              {n.name} <em>{formatDistance(km)}</em>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export function LiveCardBody({ place, saved, onToggleSave, fame }) {
  return (
    <div className="map-tap">
      <MapPlaceItem place={place} saved={saved} onToggleSave={onToggleSave} source="map_layer" fame={fame} />
      <LiveFoot />
    </div>
  )
}

// What's under a tap at street level (looked up from the live places service).
export function TapCardBody({ tap, savedIds, onToggleSave, fame }) {
  return (
    <div className="map-tap">
      {tap.status === 'zoom' && <span>Zoom in to street level, then tap a name on the map to see what it is.</span>}
      {tap.status === 'loading' && <span>Looking up what’s here…</span>}
      {tap.status === 'error' && <span>Couldn’t look this spot up right now.</span>}
      {tap.status === 'ready' && tap.places.length === 0 && tap.spot && (
        <article className="map-tap-item">
          <div className="thumb thumb-illustrated map-tap-thumb map-tap-spot" aria-hidden="true">
            <span>📍</span>
          </div>
          <div className="map-tap-main">
            <strong>{tap.spot.name}</strong>
            {tap.spot.address && <span className="map-tap-type">{tap.spot.address}</span>}
          </div>
          <div className="map-tap-actions">
            <a className="map-tap-btn" href={directions(tap.spot)} target="_blank" rel="noopener noreferrer">
              🧭 Directions
            </a>
          </div>
        </article>
      )}
      {tap.status === 'ready' && tap.places.length === 0 && !tap.spot && <span>Nothing listed right here. Try tapping closer to a name or icon.</span>}
      {tap.status === 'ready' &&
        tidy(tap.places).map((p) => <MapPlaceItem key={p.id} place={p} saved={savedIds.has(p.id)} onToggleSave={onToggleSave} source="map_tap" fame={fame(p)} />)}
      {tap.status === 'ready' && (tap.places.length > 0 || tap.spot) && <LiveFoot />}
    </div>
  )
}

const MODE = { train: '🚆 Train', bus: '🚌 Bus', 'rail + ferry': '⛴️ Rail + ferry', flight: '✈️ Flight' }

// One hop of the trip: how you get there, and the real train when one is saved for it.
export function LegCardBody({ from, to, leg, journey }) {
  return (
    <>
      <div className="ew-card-head">
        <span className="ew-card-icon" aria-hidden="true">
          {journey || leg?.mode === 'train' ? '🚆' : leg?.mode === 'bus' ? '🚌' : '⛴️'}
        </span>
        <div>
          <h3 className="ew-card-title">
            {from.name} → {to.name}
          </h3>
          {journey ? (
            <p className="ew-card-meta">
              {clock(journey.departure.scheduled, journey.origin.tz)} {stationName(journey.origin.name)} → {clock(journey.arrival.scheduled, journey.destination.tz)}{' '}
              {stationName(journey.destination.name)}
              {journey.durationMin ? ` · ${durationText(journey.durationMin)}` : ''}
              {journey.transfers ? ` · ${journey.transfers} change${journey.transfers === 1 ? '' : 's'}` : ' · direct'}
            </p>
          ) : (
            leg && (
              <p className="ew-card-meta">
                {MODE[leg.mode] || '🚆 Train'} · about {formatDuration(leg.minutes)}
              </p>
            )
          )}
        </div>
      </div>
      <p className="ew-card-text">
        {journey ? (
          <>
            <SourceLabel kind="scheduled" /> Your saved train. Times are from the timetable; live updates show in your trip and Travel Mode.
          </>
        ) : (
          <>
            <SourceLabel kind="estimate" /> {leg?.estimated ? 'Rough estimate from the distance.' : 'Typical journey time from EuroWander’s sample timetable.'}
            {leg?.note ? ` ${leg.note}` : ''}
          </>
        )}
      </p>
      {journey?.changes?.length > 0 && <p className="ew-card-meta">Change at {journey.changes.map(stationName).join(', ')}</p>}
      <div className="ew-card-actions">
        <button type="button" className="map-tap-btn" onClick={() => ask(`What are the train options from ${from.name} to ${to.name}?`)}>
          ✨ Ask Copilot
        </button>
      </div>
      {journey && <small className="map-tap-foot">Trains: Transitous</small>}
    </>
  )
}
