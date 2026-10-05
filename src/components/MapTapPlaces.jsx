// Tap the map to see what's there: the shop, café or sight under your finger, from the live places service,
// with Save and Directions. Only when zoomed in to street level, and only when live places are switched on.
import { useState } from 'react'
import { Popup, useMapEvents } from 'react-leaflet'
import { registerPlaces } from '../lib/extraPlacesCore.js'
import { track } from '../lib/analytics.js'
import { placesAt } from '../services/live/places.js'
import { LivePlaceFacts, SourceLabel, useLiveEnabled } from './LiveBits.jsx'

const MIN_ZOOM = 16

export default function MapTapPlaces({ savedIds, onToggleSave }) {
  const on = useLiveEnabled('places')
  const [tap, setTap] = useState(null) // { lat, lng, status, places }
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
        (places) => {
          registerPlaces(places)
          setTap((t) => (t && t.lat === at.lat ? { ...at, status: 'ready', places } : t))
          track('live_places_searched', { kind: 'map_tap', anchor: 'map', results: places.length })
        },
        (error) => setTap((t) => (t && t.lat === at.lat ? { ...at, status: 'error', error } : t)),
      )
    },
  })
  if (!tap) return null
  const directions = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`
  return (
    <Popup position={[tap.lat, tap.lng]} eventHandlers={{ remove: () => setTap(null) }}>
      <div className="popup map-tap">
        {tap.status === 'zoom' && <span>Zoom in to street level, then tap a name on the map to see what it is.</span>}
        {tap.status === 'loading' && <span>Looking up what’s here…</span>}
        {tap.status === 'error' && <span>Couldn’t look this spot up right now.</span>}
        {tap.status === 'ready' && tap.places.length === 0 && <span>Nothing listed right here. Try tapping closer to a name or icon.</span>}
        {tap.status === 'ready' &&
          tap.places.map((p) => {
            const saved = savedIds.has(p.id)
            return (
              <div key={p.id} className="map-tap-item">
                <strong>{p.name}</strong> <SourceLabel kind="live" />
                <small>{p.description}</small>
                <LivePlaceFacts place={p} compact />
                <div className="map-tap-actions">
                  <button
                    type="button"
                    className={`popup-btn${saved ? ' saved' : ''}`}
                    onClick={() => {
                      onToggleSave(p.id)
                      if (!saved) track('live_place_saved', { kind: 'map_tap' })
                    }}
                  >
                    {saved ? '♥ Saved' : '♡ Save to trip'}
                  </button>
                  <a className="popup-btn" href={directions(p)} target="_blank" rel="noopener noreferrer">
                    Directions
                  </a>
                  {p.website && (
                    <a className="popup-btn" href={p.website} target="_blank" rel="noopener noreferrer">
                      Website
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        {tap.status === 'ready' && tap.places.length > 0 && <small className="live-attrib small">Powered by Geoapify · © OpenStreetMap contributors</small>}
      </div>
    </Popup>
  )
}
