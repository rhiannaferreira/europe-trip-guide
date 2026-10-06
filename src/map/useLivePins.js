// Live places (Geoapify) for the part of the map in view, the MapLibre side of the live data layer.
// Same rules as before: sights from city zoom (13), food and drink too from street level (15), requests
// snapped to a grid (~1 km / ~400 m) so panning reuses cached answers, sent only once the map stops.
// What's been found stays (up to KEEP places) while panning.
import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../services/live/places.js'
import { track } from '../lib/analytics.js'
import { PIN_KINDS } from '../lib/pinKinds.js'
import { useEWMap } from './EuroWanderMap.jsx'

export const LIVE_MIN_ZOOM = 13
const FOOD_MIN_ZOOM = 15
const KEEP = 400

export function useLivePins({ on, kinds }) {
  const { map } = useEWMap()
  const [found, setFound] = useState(() => new Map())
  const [zoom, setZoom] = useState(() => map.getZoom())
  const timer = useRef(null)
  const asked = useRef(new Set())
  const filtered = kinds.size > 0

  const load = () => {
    const z = map.getZoom()
    setZoom(z)
    if (!on || z < LIVE_MIN_ZOOM) return
    const street = z >= FOOD_MIN_ZOOM
    const grid = street ? 250 : 100
    const c = map.getCenter()
    const lat = Math.round(c.lat * grid) / grid
    const lng = Math.round(c.lng * grid) / grid
    const half = c.distanceTo(map.getBounds().getNorthEast())
    const radius = street ? Math.min(1500, Math.max(500, Math.round(half / 250) * 250)) : Math.min(4000, Math.max(1500, Math.round(half / 500) * 500))
    const asks = filtered
      ? PIN_KINDS.filter((k) => kinds.has(k.id)).map((k) => [k.kind, kinds.size > 2 ? 30 : 60])
      : street
        ? [
            ['mapSights', 40],
            ['mapFood', 40],
          ]
        : [['mapSights', 60]]
    const key = `${lat},${lng},${radius}|${asks.map((a) => a[0]).join(',')}`
    if (asked.current.has(key)) return
    asked.current.add(key)
    Promise.allSettled(asks.map(([kind, limit]) => searchPlaces({ lat, lng, radius, kind, limit }))).then((rs) => {
      const places = rs.flatMap((r) => (r.status === 'fulfilled' ? r.value.places : []))
      if (rs.every((r) => r.status === 'rejected')) asked.current.delete(key)
      if (!places.length) return
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
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const onMove = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => loadRef.current(), 450)
    }
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
      clearTimeout(timer.current)
    }
  }, [map])

  const kindsKey = [...kinds].sort().join(',')
  useEffect(() => {
    loadRef.current()
  }, [on, kindsKey])

  const showing = on && zoom >= LIVE_MIN_ZOOM && found.size > 0
  return { places: showing ? [...found.values()] : [], zoom }
}
