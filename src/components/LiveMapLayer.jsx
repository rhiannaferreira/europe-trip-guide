// Zoomed in on a city, the map fills with the real sights, museums and parks in view, and closer in
// (street level) with restaurants, cafés, gelaterias and bars too, from the live places service, as small
// outlined pins (EuroWander's own picks stay filled and on top). Each pin opens the same card as a map
// tap. Only when live places are switched on.
//
// Requests are snapped to a grid (~1 km at city level, ~400 m at street level) so panning around reuses
// cached answers, and wait until the map has stopped moving. What's been found stays on the map (up to a
// few hundred places) while panning.
import { useEffect, useRef, useState } from 'react'
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { registerPlaces } from '../lib/extraPlacesCore.js'
import { searchPlaces } from '../services/live/places.js'
import { track } from '../lib/analytics.js'
import { pinIcon } from './mapPins.js'
import { MapPlaceItem, LiveFoot } from './MapTapPlaces.jsx'

export const LIVE_MIN_ZOOM = 13
const FOOD_MIN_ZOOM = 15
const KEEP = 400
const ATTRIBUTION = 'Places: <a href="https://www.geoapify.com/">Powered by Geoapify</a>'

export default function LiveMapLayer({ on, guideIds, savedIds, hidden, onToggleSave }) {
  const map = useMap()
  const [found, setFound] = useState(() => new Map())
  const [zoom, setZoom] = useState(() => map.getZoom())
  const timer = useRef(null)
  const asked = useRef(new Set())

  const load = () => {
    const z = map.getZoom()
    setZoom(z)
    if (!on || z < LIVE_MIN_ZOOM) return
    const street = z >= FOOD_MIN_ZOOM
    const grid = street ? 250 : 100 // 1/250 of a degree ≈ 400 m, 1/100 ≈ 1 km
    const c = map.getCenter()
    const lat = Math.round(c.lat * grid) / grid
    const lng = Math.round(c.lng * grid) / grid
    const half = map.distance(map.getBounds().getNorthEast(), map.getCenter())
    const radius = street ? Math.min(1500, Math.max(500, Math.round(half / 250) * 250)) : Math.min(4000, Math.max(1500, Math.round(half / 500) * 500))
    const key = `${lat},${lng},${radius}`
    if (asked.current.has(key)) return
    asked.current.add(key)
    const asks = street ? [['mapSights', 40], ['mapFood', 40]] : [['mapSights', 60]]
    Promise.allSettled(asks.map(([kind, limit]) => searchPlaces({ lat, lng, radius, kind, limit }))).then((rs) => {
      const places = rs.flatMap((r) => (r.status === 'fulfilled' ? r.value.places : []))
      if (rs.every((r) => r.status === 'rejected')) asked.current.delete(key)
      if (!places.length) return
      registerPlaces(places)
      setFound((prev) => {
        const next = new Map(prev)
        for (const p of places) {
          next.delete(p.id)
          next.set(p.id, p)
        }
        while (next.size > KEEP) next.delete(next.keys().next().value)
        return next
      })
      track('live_places_searched', { kind: 'map_layer', anchor: 'map', results: places.length })
    })
  }

  useMapEvents({
    moveend: () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(load, 450)
    },
  })
  useEffect(() => {
    load()
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])

  const showing = on && zoom >= LIVE_MIN_ZOOM && found.size > 0
  useEffect(() => {
    if (!showing) return undefined
    map.attributionControl?.addAttribution(ATTRIBUTION)
    return () => map.attributionControl?.removeAttribution(ATTRIBUTION)
  }, [showing, map])

  if (!showing) return null
  return [...found.values()]
    .filter((p) => !guideIds.has(p.id) && !hidden.has(p.category))
    .map((p) => (
      <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p, 'live', savedIds.has(p.id) ? 'saved' : '')} title={p.name} alt={p.name}>
        <Tooltip direction="top">{p.name}</Tooltip>
        <Popup>
          <div className="map-tap">
            <MapPlaceItem place={p} saved={savedIds.has(p.id)} onToggleSave={onToggleSave} source="map_layer" />
            <LiveFoot />
          </div>
        </Popup>
      </Marker>
    ))
}
