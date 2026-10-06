// What a live place looks like inside a map card: photo or icon, name, what it is, hours, and
// Save / Directions / Website. Shared by the MapLibre map and (until it's removed) the Leaflet one.
import { registerPlaces } from '../lib/extraPlacesCore.js'
import { track } from '../lib/analytics.js'
import { LivePlaceFacts, SourceLabel } from '../components/LiveBits.jsx'
import Thumb from '../components/Thumb.jsx'
import { interestById } from '../data/interests.js'
import { placeIcon } from '../lib/placeIcons.js'
import { WELL_KNOWN } from '../lib/fame.js'

// One entry per thing: "Giordano Bruno" and "Giordano Bruno monument" a few metres apart are the same statue.
export function tidy(list) {
  const out = []
  const fold = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  for (const p of list) {
    const n = fold(p.name)
    if (
      out.some((q) => {
        const m = fold(q.name)
        return (m.includes(n) || n.includes(m)) && Math.abs((q.distanceKm ?? 0) - (p.distanceKm ?? 0)) < 0.05
      })
    )
      continue
    out.push(p)
  }
  return out.slice(0, 3)
}

export const TAP_MIN_ZOOM = 16

export const directions = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`

// One live place in a map popup: photo or icon, name, what it is, hours, and Save / Directions / Website.
export function MapPlaceItem({ place: p, saved, onToggleSave, source, fame = 0 }) {
  const interest = interestById[p.category]
  // Hotels, stations and the like can't go on a trip board; they get directions only.
  const canSave = Boolean(interest)
  return (
    <article className="map-tap-item">
      <Thumb
        id={p.id}
        emoji={placeIcon(p)}
        alt={p.name}
        color={interest ? `var(--${p.category})` : 'var(--muted)'}
        className="map-tap-thumb"
        kind="place"
        item={p}
        width={160}
        credit="title"
      />
      <div className="map-tap-main">
        <strong>{p.name}</strong>
        <span className="map-tap-type">{p.description || interest?.label || 'Place'}</span>
        {fame > 0 && <FameLine languages={fame} />}
        <LivePlaceFacts place={p} compact />
      </div>
      <div className="map-tap-actions">
        {canSave && (
          <button
            type="button"
            className={`map-tap-btn primary${saved ? ' saved' : ''}`}
            onClick={() => {
              // Pins on the map aren't in the app's places until someone saves one.
              registerPlaces([p])
              onToggleSave(p.id)
              if (!saved) track('live_place_saved', { kind: source })
            }}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
        )}
        <a className="map-tap-btn" href={directions(p)} target="_blank" rel="noopener noreferrer">
          🧭 Directions
        </a>
        {p.website && (
          <a className="map-tap-btn" href={p.website} target="_blank" rel="noopener noreferrer">
            Website
          </a>
        )}
      </div>
    </article>
  )
}

// How well known a place is, said as what it is: Wikipedia coverage, not a review score.
export function FameLine({ languages }) {
  return (
    <span className={`map-tap-fame${languages >= WELL_KNOWN ? ' top' : ''}`}>
      {languages >= WELL_KNOWN ? '⭐ Well known · ' : ''}on Wikipedia in {languages} language{languages === 1 ? '' : 's'}
    </span>
  )
}

export function LiveFoot() {
  return (
    <small className="map-tap-foot">
      <SourceLabel kind="live" /> Powered by Geoapify · © OpenStreetMap contributors
    </small>
  )
}
