// The map's key and filter: tap a kind to show only that (restaurants, museums...), tap more to add them,
// "All" to go back. "Best known only" keeps EuroWander's picks and places famous enough to have Wikipedia
// articles in many languages. Collapsed by default on small screens.
import { useEffect, useRef, useState } from 'react'
import { PIN_KINDS } from '../lib/pinKinds.js'

export default function MapLegend({ kinds, onKinds, bestOnly, onBestOnly, liveOn, zoom, liveMinZoom }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 700px)').matches)
  const hint = liveOn && zoom >= 10 && zoom < liveMinZoom
  // Clicks, drags and scrolls on the key shouldn't reach the map underneath (maps listen on the DOM).
  const box = useRef(null)
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    // Clicks still bubble (React handles them at the root); Leaflet skips them by this flag instead.
    el._leaflet_disable_click = true
    const stop = (e) => e.stopPropagation()
    const types = ['dblclick', 'mousedown', 'touchstart', 'pointerdown', 'wheel', 'contextmenu']
    types.forEach((t) => el.addEventListener(t, stop))
    return () => types.forEach((t) => el.removeEventListener(t, stop))
  }, [])
  const all = kinds.size === 0
  const toggle = (id) => {
    const next = new Set(kinds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onKinds(next)
  }
  return (
    <div className="map-legend-box" ref={box}>
      <button type="button" className="map-legend-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        🗺️ Show on map{all ? '' : ` (${kinds.size})`} {open ? '▾' : '▸'}
      </button>
      {open && (
        <>
          <div className="map-legend-chips" role="group" aria-label="Show only these kinds of places">
            <button type="button" className={`map-legend-chip all${all ? ' on' : ''}`} aria-pressed={all} onClick={() => onKinds(new Set())}>
              All
            </button>
            {PIN_KINDS.map((k) => {
              const on = kinds.has(k.id)
              return (
                <button key={k.id} type="button" className={`map-legend-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(k.id)}>
                  <span aria-hidden="true">{k.icon}</span> {k.label}
                </button>
              )
            })}
          </div>
          {liveOn && (
            <label className="map-legend-best">
              <input type="checkbox" checked={bestOnly} onChange={(e) => onBestOnly(e.target.checked)} /> ⭐ Best known only
            </label>
          )}
          <p className="map-legend-note">
            <span className="pin pin-guide pin-sample" aria-hidden="true" /> EuroWander pick
            {liveOn && (
              <>
                {' '}
                <span className="pin pin-live pin-sample" aria-hidden="true" /> Live place <span className="pin pin-live pin-top pin-sample" aria-hidden="true" /> Well known
              </>
            )}
          </p>
        </>
      )}
      {hint && <p className="map-legend-hint">Zoom in on a city to see its places on the map.</p>}
    </div>
  )
}
