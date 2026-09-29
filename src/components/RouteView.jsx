import { Polyline, Tooltip } from 'react-leaflet'
import { formatDuration } from '../lib/format.js'

// Straight lines between trip stops, in trip order. Hover a line to see the leg.
export default function RouteView({ routeCities, legs = [] }) {
  if (routeCities.length < 2) return null
  return routeCities.slice(1).map((to, i) => {
    const from = routeCities[i]
    const leg = legs[i]
    return (
      <Polyline
        key={`${from.id}-${to.id}`}
        positions={[
          [from.lat, from.lng],
          [to.lat, to.lng],
        ]}
        pathOptions={{ color: '#d62828', weight: 3, dashArray: '8 6' }}
      >
        <Tooltip sticky>
          {from.name} → {to.name}
          {leg && (
            <>
              <br />
              <span className="leg-label">
                {leg.mode === 'train' ? '🚆 Train' : leg.mode === 'bus' ? '🚌 Bus' : '⛴️ Rail + ferry'} ~{formatDuration(leg.minutes)}
              </span>{' '}
              <em>({leg.estimated ? 'rough estimate' : 'estimate'})</em>
            </>
          )}
        </Tooltip>
      </Polyline>
    )
  })
}
