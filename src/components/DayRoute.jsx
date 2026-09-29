import { useEffect } from 'react'
import L from 'leaflet'
import { Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { cityById } from '../data/cities.js'

// Numbered marker (1, 2, 3...) drawn with plain HTML, so no image files are needed.
const numberIcon = (n) =>
  L.divIcon({ className: 'day-marker', html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] })

// The selected day on the map: numbered markers in itinerary order joined by a line.
// Re-fits the map when the day or its set of places changes; reordering only redraws.
export default function DayRoute({ day, places }) {
  const map = useMap()
  const fitKey = day ? `${day.number}:${places.map((p) => p.id).sort().join(',')}` : ''

  useEffect(() => {
    if (!day) return
    if (places.length === 0) {
      const city = cityById[day.cityId]
      map.flyTo([city.lat, city.lng], 12, { duration: 0.6 })
    } else if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], 15, { duration: 0.6 })
    } else {
      map.flyToBounds(places.map((p) => [p.lat, p.lng]), { padding: [60, 60], maxZoom: 15, duration: 0.6 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  if (!day || places.length === 0) return null
  return (
    <>
      {places.length > 1 && (
        <Polyline positions={places.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#1f6f8b', weight: 4, opacity: 0.85, dashArray: '2 8', lineCap: 'round' }} />
      )}
      {places.map((p, i) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={numberIcon(i + 1)} zIndexOffset={1000}>
          <Popup>
            <strong>
              {i + 1}. {p.name}
            </strong>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
