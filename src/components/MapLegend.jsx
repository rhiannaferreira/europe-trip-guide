// The map's key: what each colour and icon means, which ones are EuroWander's picks and which are live
// places, and a toggle per interest to hide its pins. Collapsed by default on small screens.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { interests } from '../data/interests.js'
import { interestColors } from './mapPins.js'

export default function MapLegend({ hidden, onToggle, liveOn, zoom, liveMinZoom }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 700px)').matches)
  const hint = liveOn && zoom >= 10 && zoom < liveMinZoom
  // Clicks and scrolls on the key shouldn't reach the map underneath (Leaflet listens on the DOM).
  const box = useRef(null)
  useEffect(() => {
    if (!box.current) return
    L.DomEvent.disableClickPropagation(box.current)
    L.DomEvent.disableScrollPropagation(box.current)
  }, [])
  return (
    <div className="map-legend-box" ref={box}>
      <button type="button" className="map-legend-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        🗺️ Map key {open ? '▾' : '▸'}
      </button>
      {open && (
        <>
          <div className="map-legend-chips" role="group" aria-label="Show or hide places by interest">
            {interests.map((i) => {
              const off = hidden.has(i.id)
              return (
                <button key={i.id} type="button" className={`map-legend-chip${off ? ' off' : ''}`} aria-pressed={!off} onClick={() => onToggle(i.id)} style={{ '--pin': interestColors[i.id] }}>
                  <span className="map-legend-dot" aria-hidden="true">
                    {i.icon}
                  </span>
                  {i.label}
                </button>
              )
            })}
          </div>
          <p className="map-legend-note">
            <span className="pin pin-guide pin-sample" aria-hidden="true" /> EuroWander pick
            {liveOn && (
              <>
                {' '}
                <span className="pin pin-live pin-sample" aria-hidden="true" /> Live place
              </>
            )}
          </p>
        </>
      )}
      {hint && <p className="map-legend-hint">Zoom in on a city to see its sights on the map, and closer still for restaurants and cafés.</p>}
    </div>
  )
}
