import { useEffect, useRef } from 'react'
import { places as allPlaces } from '../data/places.js'
import { CircleMarker, GeoJSON, MapContainer, Pane, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import europeOutline from '../data/europe-outline.json'

export const interestColors = {
  food: '#e76f51',
  outdoors: '#2a9d8f',
  museums: '#6a4c93',
  nightlife: '#264653',
}

// Fits the map to whatever places are currently visible.
function FitToPlaces({ places }) {
  const map = useMap()
  const key = places.map((p) => p.id).join(',')
  useEffect(() => {
    if (places.length === 0) return
    const bounds = places.map((p) => [p.lat, p.lng])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

function FlyToFocused({ place, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    if (!place) return
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
    markerRefs.current[place.id]?.openPopup()
  }, [place, map, markerRefs])
  return null
}

export default function MapView({ places, cities, savedIds, routeCities, focusedId, onFocus, onToggleSave, onSelectCity }) {
  const markerRefs = useRef({})
  const focused = allPlaces.find((p) => p.id === focusedId)

  return (
    <MapContainer center={[48.5, 8]} zoom={4} className="map" scrollWheelZoom>
      {/* Country outlines sit under the tiles and show through wherever tiles can't load. */}
      <Pane name="outline" style={{ zIndex: 150 }}>
        <GeoJSON
          data={europeOutline}
          interactive={false}
          style={{ className: 'country-outline', weight: 1 }}
        />
      </Pane>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPlaces places={places} />
      <FlyToFocused place={focused} markerRefs={markerRefs} />

      {routeCities.length > 1 && (
        <Polyline
          positions={routeCities.map((c) => [c.lat, c.lng])}
          pathOptions={{ color: '#d62828', weight: 3, dashArray: '8 6' }}
        />
      )}

      {places.map((p) => (
        <CircleMarker
          key={p.id}
          ref={(m) => {
            if (m) markerRefs.current[p.id] = m
            else delete markerRefs.current[p.id]
          }}
          center={[p.lat, p.lng]}
          radius={savedIds.has(p.id) ? 9 : 7}
          pathOptions={{
            color: savedIds.has(p.id) ? '#f4a261' : '#fff',
            weight: savedIds.has(p.id) ? 3 : 2,
            fillColor: interestColors[p.category],
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: () => onFocus(p.id) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.description}
            <br />
            <button type="button" className="popup-btn" onClick={() => onToggleSave(p.id)}>
              {savedIds.has(p.id) ? 'Remove from trip' : 'Save to trip'}
            </button>
          </Popup>
        </CircleMarker>
      ))}

      {/* Cities last so they sit above place dots when zoomed out. */}
      {cities.map((c) => {
        const stop = routeCities.findIndex((r) => r.id === c.id)
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={stop >= 0 ? 11 : 6}
            pathOptions={{ color: '#d62828', fillColor: stop >= 0 ? '#d62828' : '#fff', fillOpacity: 1, weight: 2 }}
            eventHandlers={{ click: () => onSelectCity(c.id) }}
          >
            <Tooltip key={stop >= 0 ? `stop-${stop}` : "city"} direction="top" offset={[0, -8]} permanent={stop >= 0}>
              {stop >= 0 ? `${stop + 1}. ${c.name}` : c.name}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
