// Travel Mode's map: only today. The day's stops in order (the next one larger), you when you've shared
// your location, and saved places close to today's route. Directions open the maps app.
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { placeById } from '../data/places.js'
import { motion } from '../lib/motion.js'
import { distanceKm } from '../utils/distance.js'
import { nextUp } from './travelModel.js'
import { Directions } from './ui.jsx'

const COLORS = { done: '#7b8794', skipped: '#9aa5b0', current: '#c8232c', earlier: '#5e6b77', upcoming: '#1f5f99', next: '#c8232c', saved: '#e0245e', you: '#0b7cd6' }

function Fit({ points, focus }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join(';')
  useEffect(() => {
    if (focus) map.setView(focus, 16, motion())
    else if (points.length === 1) map.setView(points[0], 15, motion())
    else if (points.length > 1) map.fitBounds(points, motion({ padding: [36, 36], maxZoom: 16 }))
  }, [key, focus?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function Label() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('role', 'application')
    el.setAttribute('aria-label', 'Map of today’s stops. Every stop is also in the list below the map.')
  }, [map])
  return null
}

export default function TravelMap({ env, focusId, position }) {
  const { schedule, trip, day, city, nowMin } = env
  const stops = schedule.entries.filter((e) => e.kind === 'place')
  const n = nowMin != null ? nextUp(schedule, nowMin) : null
  const nextId = n?.entry?.kind === 'place' ? n.entry.id : stops.find((e) => e.state === 'upcoming')?.id
  const onDay = new Set(stops.map((e) => e.id))
  // Saved places in this city, within about 1 km of one of today's stops.
  const saved = Object.keys(trip.statuses || {})
    .map((id) => placeById[id])
    .filter((p) => p && p.cityId === day.cityId && !onDay.has(p.id) && stops.some((e) => distanceKm(e.place, p) <= 1))
  const focusPlace = focusId ? placeById[focusId] : null
  const points = [...stops.map((e) => [e.place.lat, e.place.lng]), ...(position ? [[position.lat, position.lng]] : [])]
  if (!points.length) points.push([city.lat, city.lng])
  const route = stops.filter((e) => e.state !== 'skipped').map((e) => [e.place.lat, e.place.lng])
  const next = stops.find((e) => e.id === nextId)

  return (
    <div className="tm-map-wrap">
      <MapContainer center={points[0]} zoom={14} className="tm-map" scrollWheelZoom={false} preferCanvas>
        <Label />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} focus={focusPlace ? [focusPlace.lat, focusPlace.lng] : null} />
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#1f5f99', weight: 3, opacity: 0.5, dashArray: '6 8' }} />}
        {saved.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: COLORS.saved, fillOpacity: 0.9 }}>
            <Tooltip>♥ {p.name} (saved)</Tooltip>
          </CircleMarker>
        ))}
        {stops.map((e, i) => {
          const isNext = e.id === nextId
          return (
            <CircleMarker key={e.id} center={[e.place.lat, e.place.lng]} radius={isNext ? 13 : 10} pathOptions={{ color: '#fff', weight: 2, fillColor: isNext ? COLORS.next : COLORS[e.state], fillOpacity: e.state === 'done' || e.state === 'skipped' ? 0.55 : 1 }}>
              <Tooltip permanent={isNext || e.id === focusId} direction="top" offset={[0, -10]}>
                {i + 1}. {e.place.name}
                {isNext ? ' (next)' : e.state === 'done' ? ' ✓' : e.state === 'skipped' ? ' (skipped)' : ''}
              </Tooltip>
            </CircleMarker>
          )
        })}
        {focusPlace && !onDay.has(focusPlace.id) && (
          <CircleMarker center={[focusPlace.lat, focusPlace.lng]} radius={11} pathOptions={{ color: '#fff', weight: 2, fillColor: '#6a4c93', fillOpacity: 1 }}>
            <Tooltip permanent direction="top" offset={[0, -10]}>
              {focusPlace.name}
            </Tooltip>
          </CircleMarker>
        )}
        {position && (
          <CircleMarker center={[position.lat, position.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: COLORS.you, fillOpacity: 1 }}>
            <Tooltip>You (from your location)</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      <div className="tm-map-under">
        {next && (
          <div className="tm-actions">
            <Directions place={next.place} className="btn btn-primary tm-btn" label={`Directions to ${next.place.name}`} />
          </div>
        )}
        {focusPlace && focusPlace.id !== next?.place.id && (
          <div className="tm-actions">
            <Directions place={focusPlace} className="btn tm-btn" label={`Directions to ${focusPlace.name}`} />
          </div>
        )}
        <ol className="tm-maplist">
          {stops.map((e, i) => (
            <li key={e.id} className={`tm-${e.state}`}>
              {i + 1}. {e.place.name}
              <span className="tm-muted">
                {' '}
                · {e.id === nextId ? 'next' : { done: 'done', skipped: 'skipped', current: 'now', earlier: 'earlier', upcoming: 'later' }[e.state]}
              </span>
            </li>
          ))}
        </ol>
        {saved.length > 0 && <p className="tm-muted">♥ Pink dots: places you saved near today’s stops.</p>}
        {position && <p className="tm-muted">🔵 Blue dot: you (read once from your location, not tracked).</p>}
        {!stops.length && <p className="tm-muted">Nothing planned today, so the map shows {city.name}.</p>}
      </div>
    </div>
  )
}
