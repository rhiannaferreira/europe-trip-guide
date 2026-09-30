import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { formatDuration } from '../lib/format.js'
import { modeIcon, sourceLabel } from '../planner/transport.js'

// Colours per travel mode (Leaflet needs real colours, not CSS variables).
const MODE_STYLE = {
  train: { color: '#c8232c', dashArray: null },
  bus: { color: '#9a5b00', dashArray: '4 6' },
  'rail + ferry': { color: '#1f6f99', dashArray: '2 6' },
  flight: { color: '#6a4c93', dashArray: '10 8' },
}

function FitRoute({ points }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join(';')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 7)
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 8 })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// The generated route: numbered stops and one line per journey, styled by how you travel.
export default function PlanMap({ stops, legs, overLimit = [] }) {
  const points = stops.map((c) => [c.lat, c.lng])
  const over = new Set(overLimit.map((l) => `${l.from.id}-${l.to.id}`))
  return (
    <div className="plan-map">
      <MapContainer center={[48.5, 8]} zoom={4} className="map" scrollWheelZoom={false} aria-label="Map of the route">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitRoute points={points} />
        {legs.map((l) => {
          const style = MODE_STYLE[l.mode] || MODE_STYLE.train
          const tooLong = over.has(`${l.from.id}-${l.to.id}`)
          return (
            <Polyline
              key={`${l.from.id}-${l.to.id}${l.isReturn ? '-home' : ''}`}
              positions={[
                [l.from.lat, l.from.lng],
                [l.to.lat, l.to.lng],
              ]}
              pathOptions={{ color: style.color, weight: tooLong ? 5 : 3, dashArray: style.dashArray, opacity: l.isReturn ? 0.55 : 0.9 }}
            >
              <Tooltip sticky>
                {modeIcon(l.mode)} {l.from.name} → {l.to.name}, ~{formatDuration(l.minutes)}
                <br />
                <em>{sourceLabel(l.source)}</em>
                {tooLong && (
                  <>
                    <br />
                    Longer than your preferred limit
                  </>
                )}
              </Tooltip>
            </Polyline>
          )
        })}
        {stops.map((c, i) => (
          <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#c8232c', fillOpacity: 1 }}>
            {/* Leaflet allows one tooltip per marker, so the number and name share it. */}
            <Tooltip permanent direction="right" offset={[8, 0]} className="stop-label">
              {i + 1}. {c.name}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="map-legend" aria-hidden="true">
        <span className="legend-train">Train</span> <span className="legend-bus">Bus</span> <span className="legend-ferry">Rail + ferry</span> <span className="legend-flight">Flight</span>
      </p>
    </div>
  )
}
