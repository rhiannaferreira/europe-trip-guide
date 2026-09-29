// Distances between { lat, lng } points. Straight lines only: real walking or rail routes are longer.

// Great-circle distance in km.
export function distanceKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 0.42 → "~400 m", 2.36 → "~2.4 km", 37 → "~37 km".
export function formatDistance(km) {
  if (km < 1) return `~${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  if (km < 10) return `~${km.toFixed(1)} km`
  return `~${Math.round(km)} km`
}
