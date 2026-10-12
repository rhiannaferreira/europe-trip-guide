// Tripadvisor traveler ratings for one place, only when someone opens it (each lookup costs money).
// The answer is never kept, as Tripadvisor's terms require; only the matched Tripadvisor location ID is
// remembered (for a month) so the next look skips the search. Nothing here goes to the Copilot.
import { createCache } from '../../lib/net.js'
import { liveGet, liveHealth } from './http.js'

const ids = createCache('ta-ids', { ttlDays: 30, max: 500 })
const HOTEL_TYPES = new Set(['hotel', 'guesthouse', 'hostel', 'apartment', 'accommodation'])

export async function ratingsEnabled() {
  const h = await liveHealth()
  return Boolean(h?.ratings?.enabled)
}

const kindOf = (p) => (HOTEL_TYPES.has(p.type) ? 'hotel' : p.category || undefined)

// → { status: 'rated', rating, confidence, match } | { status: 'no_match' | 'no_rating' | 'not_available' }
export async function getTravelerRating(place) {
  const known = place.id ? ids.get(place.id) : undefined
  const r = await liveGet(
    'ratings/place',
    { name: place.name, lat: Math.round(place.lat * 1e5) / 1e5, lng: Math.round(place.lng * 1e5) / 1e5, cat: kindOf(place), ta: known || undefined },
    { noStore: true, timeout: 12000 },
  )
  const d = r.data || {}
  if (place.id && d.status === 'rated' && Number.isInteger(d.rating?.id)) ids.set(place.id, d.rating.id)
  // A remembered ID the details no longer confirm is forgotten.
  if (place.id && known && d.status === 'no_match') ids.set(place.id, null)
  return d
}
