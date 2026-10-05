// Tap the map to see what's there: the shop, café or sight under your finger, from the live places service,
// with Save and Directions. Only when zoomed in to street level, and only when live places are switched on.
import { useState } from 'react'
import { Popup, useMapEvents } from 'react-leaflet'
import { registerPlaces } from '../lib/extraPlacesCore.js'
import { track } from '../lib/analytics.js'
import { placesAt } from '../services/live/places.js'
import { LivePlaceFacts, SourceLabel, useLiveEnabled } from './LiveBits.jsx'
import Thumb from './Thumb.jsx'
import { interestById } from '../data/interests.js'
import { placeIcon } from '../lib/placeIcons.js'


// One entry per thing: "Giordano Bruno" and "Giordano Bruno monument" a few metres apart are the same statue.
function tidy(list) {
  const out = []
  const fold = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  for (const p of list) {
    const n = fold(p.name)
    if (out.some((q) => { const m = fold(q.name); return (m.includes(n) || n.includes(m)) && Math.abs((q.distanceKm ?? 0) - (p.distanceKm ?? 0)) < 0.05 })) continue
    out.push(p)
  }
  return out.slice(0, 3)
}

const MIN_ZOOM = 16

const directions = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`

// One live place in a map popup: photo or icon, name, what it is, hours, and Save / Directions / Website.
export function MapPlaceItem({ place: p, saved, onToggleSave, source }) {
  const interest = interestById[p.category]
  // Hotels, stations and the like can't go on a trip board; they get directions only.
  const canSave = Boolean(interest)
  return (
    <article className="map-tap-item">
      <Thumb id={p.id} emoji={placeIcon(p)} alt={p.name} color={interest ? `var(--${p.category})` : 'var(--muted)'} className="map-tap-thumb" kind="place" item={p} width={160} credit="title" />
      <div className="map-tap-main">
        <strong>{p.name}</strong>
        <span className="map-tap-type">{p.description || interest?.label || 'Place'}</span>
        <LivePlaceFacts place={p} compact />
      </div>
      <div className="map-tap-actions">
        {canSave && (
          <button
            type="button"
            className={`map-tap-btn primary${saved ? ' saved' : ''}`}
            onClick={() => {
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

export function LiveFoot() {
  return (
    <small className="map-tap-foot">
      <SourceLabel kind="live" /> Powered by Geoapify · © OpenStreetMap contributors
    </small>
  )
}

export default function MapTapPlaces({ savedIds, onToggleSave }) {
  const on = useLiveEnabled('places')
  const [tap, setTap] = useState(null) // { lat, lng, status, places, spot }
  const map = useMapEvents({
    click(e) {
      if (!on) return
      // Zoomed right out, a click is just moving around the map; at city level, a hint to zoom in.
      if (map.getZoom() < 13) return
      if (map.getZoom() < MIN_ZOOM) {
        setTap({ lat: e.latlng.lat, lng: e.latlng.lng, status: 'zoom' })
        return
      }
      const at = { lat: e.latlng.lat, lng: e.latlng.lng }
      setTap({ ...at, status: 'loading' })
      placesAt(at.lat, at.lng).then(
        ({ places, spot }) => {
          registerPlaces(places)
          setTap((t) => (t && t.lat === at.lat ? { ...at, status: 'ready', places, spot } : t))
          track('live_places_searched', { kind: 'map_tap', anchor: 'map', results: places.length })
        },
        (error) => setTap((t) => (t && t.lat === at.lat ? { ...at, status: 'error', error } : t)),
      )
    },
  })
  if (!tap) return null
  return (
    <Popup position={[tap.lat, tap.lng]} eventHandlers={{ remove: () => setTap(null) }}>
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
          tidy(tap.places).map((p) => <MapPlaceItem key={p.id} place={p} saved={savedIds.has(p.id)} onToggleSave={onToggleSave} source="map_tap" />)}
        {tap.status === 'ready' && (tap.places.length > 0 || tap.spot) && <LiveFoot />}
      </div>
    </Popup>
  )
}
