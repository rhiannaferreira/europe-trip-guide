// Nearby places from the local sample data, by straight-line distance.
import { places } from '../data/places.js'
import { distanceKm } from './distance.js'

export const NEARBY_KM = 3

// Up to `limit` other places within `radiusKm` of `place`, closest first: [{ place, km }].
export function nearbyPlaces(place, { radiusKm = NEARBY_KM, limit = 5 } = {}) {
  if (!place) return []
  return places
    .filter((p) => p.id !== place.id)
    .map((p) => ({ place: p, km: distanceKm(place, p) }))
    .filter((n) => n.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
}
