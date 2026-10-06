import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, Marker, Pane, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { placeById } from '../data/places.js'
import { cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { costLabel } from '../lib/format.js'
import RouteView from './RouteView.jsx'
import { nearbyPlaces } from '../utils/nearby.js'
import { formatDistance } from '../utils/distance.js'
import DayRoute from './DayRoute.jsx'
import MapTapPlaces from './MapTapPlaces.jsx'
import { motion } from '../lib/motion.js'
import LiveMapLayer, { LIVE_MIN_ZOOM } from './LiveMapLayer.jsx'
import MapLegend from './MapLegend.jsx'
import { interestColors, pinIcon } from './mapPins.js'
import { useLiveEnabled } from './LiveBits.jsx'
import { pinKind } from '../lib/pinKinds.js'

// Marker colours per interest (Leaflet needs real colours, not CSS variables).
export { interestColors }

function ZoomWatch({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

// Leaflet drops a view change that arrives mid zoom animation, so hold it until the animation ends.
// Only the latest request is kept, so quick successive clicks end on the last one.
const pendingView = new WeakMap()
function whenIdle(map, fn) {
  if (!map._animatingZoom) return fn()
  if (!pendingView.has(map)) {
    map.once('zoomend', () => {
      const next = pendingView.get(map)
      pendingView.delete(map)
      whenIdle(map, next)
    })
  }
  pendingView.set(map, fn)
}

// Leaflet's map box takes keyboard focus (arrow keys pan, + and - zoom); give it a name and a hint.
// Every place on the map is also in the Places list, which is the keyboard-friendly way to pick one.
function MapLabel() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('role', 'application')
    el.setAttribute('aria-label', 'Map of Europe. Arrow keys move the map, plus and minus zoom. Pick places from the Places list to show them here. Zoomed in, tap the map to see what’s there.')
  }, [map])
  return null
}

// Fits the map to whatever places are visible, or to the chosen cities when there are no places.
// Live places picked up from the map itself (tapped, or saved from a pin) never move it: the map is
// already where they are, and refitting would yank someone who is zoomed in back out.
function FitToView({ places: all, cities }) {
  const map = useMap()
  const places = all.filter((p) => p.source !== 'live')
  const points = places.length > 0 ? places : cities
  const key = points.map((p) => p.id).join(',')
  useEffect(() => {
    if (points.length === 0) return
    const bounds = points.map((p) => [p.lat, p.lng])
    whenIdle(map, () => map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

// Fits to the whole trip whenever the "view trip" request counter changes.
function FitToTrip({ routeCities, request }) {
  const map = useMap()
  useEffect(() => {
    if (!request || routeCities.length === 0) return
    whenIdle(map, () => {
      if (routeCities.length === 1) map.flyTo([routeCities[0].lat, routeCities[0].lng], 11, motion({ duration: 0.6 }))
      else map.flyToBounds(routeCities.map((c) => [c.lat, c.lng]), motion({ padding: [50, 50], duration: 0.6 }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])
  return null
}

function FlyToFocused({ place, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    if (!place) return
    whenIdle(map, () => map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), motion({ duration: 0.6 })))
    // Wait for the marker to exist (it may have just been filtered in) before opening its popup.
    const t = setTimeout(() => markerRefs.current[place.id]?.openPopup(), 650)
    return () => clearTimeout(t)
  }, [place, map, markerRefs])
  return null
}

// The three closest sample places, shown in the open popup. Clicking one moves to it.
function PopupNearby({ place, onFocusPlace }) {
  const nearby = nearbyPlaces(place, { limit: 3 })
  if (nearby.length === 0) return null
  return (
    <div className="popup-nearby">
      <small>Nearby places</small>
      {nearby.map(({ place: n, km }) => (
        <button key={n.id} type="button" className="link-btn" onClick={() => onFocusPlace(n.id)}>
          {n.name} <em>{formatDistance(km)}</em>
        </button>
      ))}
    </div>
  )
}

export default function MapView({ places, cities, fitCities, savedIds, routeCities, legs, focusedId, fitTripRequest, dayView, onFocus, onFocusPlace, onToggleSave, onSelectCity }) {
  // While a day is shown, other places fade back so the day's numbered route stands out.
  const dimmed = Boolean(dayView)
  const markerRefs = useRef({})
  const focused = focusedId ? placeById[focusedId] : null
  // Tiles that fail to load (offline, or the tile server is down) leave only the country outlines.
  const [tiles, setTiles] = useState({ ok: 0, failed: 0 })
  const tilesDown = tiles.failed >= 4 && tiles.ok === 0

  // The country outlines (~160 KB compressed) are only a backdrop under the tiles, so they load once
  // the page is idle, or straight away if the tiles fail.
  const [outline, setOutline] = useState(null)
  useEffect(() => {
    let live = true
    const load = () => import('../data/europe-outline.json').then((m) => live && setOutline(m.default)).catch(() => {})
    if (tilesDown) load()
    else {
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000))
      const cancel = window.cancelIdleCallback || clearTimeout
      const id = idle(load, { timeout: 4000 })
      return () => {
        live = false
        cancel(id)
      }
    }
    return () => {
      live = false
    }
  }, [tilesDown])
  // Markers and lines draw on one canvas (much lighter than hundreds of SVG elements); the outlines
  // stay SVG so the CSS colours for light and dark mode apply to them.
  const outlineRenderer = useMemo(() => L.svg({ pane: 'outline' }), [])
  const liveOn = useLiveEnabled('places') === true
  const [zoom, setZoom] = useState(4)
  // The map key's filter: which kinds of places to show (empty = all), and whether only the best known.
  const [kinds, setKinds] = useState(() => new Set())
  const [bestOnly, setBestOnly] = useState(false)
  // EuroWander's own picks are hand-chosen, so "best known only" keeps them.
  const shownPlaces = kinds.size ? places.filter((p) => kinds.has(pinKind(p))) : places
  const guideIds = useMemo(() => new Set(places.map((p) => p.id)), [places])

  return (
    <MapContainer center={[48.5, 8]} zoom={4} className="map" scrollWheelZoom preferCanvas>
      {/* Country outlines sit under the tiles and show through wherever tiles can't load. */}
      <Pane name="outline" style={{ zIndex: 150 }}>
        {outline && <GeoJSON data={outline} interactive={false} renderer={outlineRenderer} style={{ className: 'country-outline', weight: 1 }} />}
      </Pane>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileload: () => setTiles((t) => (t.ok ? t : { ...t, ok: 1 })),
          tileerror: () => setTiles((t) => (t.failed >= 4 ? t : { ...t, failed: t.failed + 1 })),
        }}
      />
      {tilesDown && (
        <div className="map-notice" role="status">
          The map background can't load right now, so only country outlines show. Markers and routes still work.
        </div>
      )}
      <MapLabel />
      <FitToView places={places} cities={fitCities} />
      <FitToTrip routeCities={routeCities} request={fitTripRequest} />
      <FlyToFocused place={focused} markerRefs={markerRefs} />

      <ZoomWatch onZoom={setZoom} />
      <MapLegend kinds={kinds} onKinds={setKinds} bestOnly={bestOnly} onBestOnly={setBestOnly} liveOn={liveOn} zoom={zoom} liveMinZoom={LIVE_MIN_ZOOM} />
      <MapTapPlaces savedIds={savedIds} onToggleSave={onToggleSave} />
      {!dimmed && <LiveMapLayer on={liveOn} guideIds={guideIds} savedIds={savedIds} kinds={kinds} bestOnly={bestOnly} onToggleSave={onToggleSave} />}
      <RouteView routeCities={routeCities} legs={legs} />
      <DayRoute day={dayView?.day} places={dayView?.places || []} />

      {shownPlaces.map((p) => {
        const saved = savedIds.has(p.id)
        const interest = interestById[p.category]
        return (
          <Marker
            key={p.id}
            ref={(m) => {
              if (m) markerRefs.current[p.id] = m
              else delete markerRefs.current[p.id]
            }}
            position={[p.lat, p.lng]}
            icon={pinIcon(p, p.source === 'live' ? 'live' : 'guide', saved ? 'saved' : dimmed ? 'dim' : '')}
            zIndexOffset={saved ? 600 : 400}
            title={p.name}
            alt={p.name}
            eventHandlers={{ click: () => onFocus(p.id) }}
          >
            <Popup>
              <div className="popup">
                <span className="popup-tag" style={{ background: interestColors[p.category] }}>
                  {interest.icon} {interest.label}
                </span>
                <strong>{p.name}</strong>
                <small>
                  {[cityById[p.cityId].name, p.rating != null && `★ ${p.rating.toFixed(1)}`, costLabel(p.costLevel)].filter(Boolean).join(' · ')}
                </small>
                <span>{p.description}</span>
                <button type="button" className={`popup-btn${saved ? ' saved' : ''}`} onClick={() => onToggleSave(p.id)}>
                  {saved ? '♥ Saved to trip' : '♡ Save to trip'}
                </button>
                {focusedId === p.id && <PopupNearby place={p} onFocusPlace={onFocusPlace} />}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Cities last so they sit above place dots when zoomed out. */}
      {cities.map((c) => {
        const stop = routeCities.findIndex((r) => r.id === c.id)
        const inTrip = stop >= 0
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={inTrip ? 11 : c.hiddenGem ? 5 : 6}
            pathOptions={{
              color: c.hiddenGem && !inTrip ? '#0f8b8d' : '#d62828',
              fillColor: inTrip ? '#d62828' : '#fff',
              fillOpacity: 1,
              weight: 2,
            }}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelectCity(c.id) }}
          >
            <Tooltip key={inTrip ? `stop-${stop}` : 'city'} direction="top" offset={[0, -8]} permanent={inTrip}>
              {inTrip ? `${stop + 1}. ${c.name}` : `${c.hiddenGem ? '💎 ' : ''}${c.name}`}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
