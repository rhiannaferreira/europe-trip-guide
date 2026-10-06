// Small helpers shared by every EuroWander map: motion, bounds, distances. No MapLibre import, so they
// can be unit tested in Node.

export const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// Camera options with animation turned off for people who asked for reduced motion.
export const calm = (options = {}) => (prefersReducedMotion() ? { ...options, animate: false, duration: 0 } : { duration: 700, ...options })

// [[lng, lat], [lng, lat]] around points ({lat, lng} or [lng, lat]), or null for none.
export function boundsOf(points) {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of points) {
    if (!p) continue
    const lng = Array.isArray(p) ? p[0] : p.lng
    const lat = Array.isArray(p) ? p[1] : p.lat
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    if (lng < w) w = lng
    if (lng > e) e = lng
    if (lat < s) s = lat
    if (lat > n) n = lat
  }
  if (w === Infinity) return null
  return [
    [w, s],
    [e, n],
  ]
}

// Frame points: one point flies to it at `single` zoom, several fit the bounds.
export function frame(map, points, { padding = 50, maxZoom = 14, single = 12, minZoomFloor = null } = {}) {
  const b = boundsOf(points)
  if (!map || !b) return
  if (b[0][0] === b[1][0] && b[0][1] === b[1][1]) {
    map.flyTo(calm({ center: b[0], zoom: minZoomFloor != null ? Math.max(single, minZoomFloor) : single }))
  } else {
    map.fitBounds(b, calm({ padding: fitPadding(map, padding), maxZoom }))
  }
}

// Padding that never exceeds the map's own size (fitBounds throws away the move otherwise on tiny maps).
export function fitPadding(map, padding) {
  const c = map.getContainer?.()
  const w = c?.clientWidth || 400
  const h = c?.clientHeight || 300
  const p = typeof pad === 'number' ? { top: pad, bottom: pad, left: pad, right: pad } : pad
  const cap = (v, size) => Math.max(0, Math.min(v, size / 2 - 20))
  return { top: cap(p.top, h), bottom: cap(p.bottom, h), left: cap(p.left, w), right: cap(p.right, w) }
}

// A gentle arc between two points, as [lng, lat] steps, so routes read as journeys rather than a ruler.
// The bend is a fraction of the distance, always to the same side of the direction of travel.
export function arc(from, to, { bend = 0.12, steps = 24 } = {}) {
  const a = [from.lng, from.lat]
  const b = [to.lng, to.lat]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return [a, b]
  // Control point: midpoint pushed sideways.
  const mx = (a[0] + b[0]) / 2 - dy * bend
  const my = (a[1] + b[1]) / 2 + dx * bend
  const out = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]])
  }
  return out
}

export const point = (lng, lat, properties = {}, id) => ({ type: 'Feature', ...(id != null ? { id } : {}), geometry: { type: 'Point', coordinates: [lng, lat] }, properties })
export const line = (coordinates, properties = {}) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties })
export const collection = (features) => ({ type: 'FeatureCollection', features: features.filter(Boolean) })
