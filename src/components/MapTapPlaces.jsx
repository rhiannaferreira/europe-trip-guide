// Tap the map to see what's there: the shop, café or sight under your finger, from the live places service,
// with Save and Directions. Only when zoomed in to street level, and only when live places are switched on.
import { useState } from 'react'
import { Popup, useMapEvents } from 'react-leaflet'
import { track } from '../lib/analytics.js'
import { placesAt } from '../services/live/places.js'
import { useLiveEnabled } from './LiveBits.jsx'
import { useFame } from '../lib/fame.js'
import { MapPlaceItem, LiveFoot, TAP_MIN_ZOOM as MIN_ZOOM, directions, tidy } from '../map/MapPlaceItem.jsx'

export { MapPlaceItem, FameLine, LiveFoot } from '../map/MapPlaceItem.jsx'


export default function MapTapPlaces({ savedIds, onToggleSave }) {
  const on = useLiveEnabled('places')
  const [tap, setTap] = useState(null) // { lat, lng, status, places, spot }
  const fame = useFame(tap?.places || [])
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
          tidy(tap.places).map((p) => <MapPlaceItem key={p.id} place={p} saved={savedIds.has(p.id)} onToggleSave={onToggleSave} source="map_tap" fame={fame(p)} />)}
        {tap.status === 'ready' && (tap.places.length > 0 || tap.spot) && <LiveFoot />}
      </div>
    </Popup>
  )
}
