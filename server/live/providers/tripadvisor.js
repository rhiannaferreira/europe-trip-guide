// Ratings provider: Tripadvisor Terra (Discover package). Server-side only: needs TRIPADVISOR_API_KEY.
// It ENRICHES places found elsewhere (Geoapify, EuroWander's guide); it never finds them.
//
// Terms (official Terra docs, checked 2026-10-06; notes/live-data/tripadvisor-terra-terms.md):
//   - Pay per location returned (a nearby search returning 3 candidates costs 3; details cost 1). The
//     first 1,000 are free once per account. Search endpoints: 1 request a second for the whole account.
//   - Nothing may be cached or stored except the Tripadvisor location ID. So ratings are fetched fresh
//     every time a card shows one, and only the matched ID is kept.
//   - No use with AI: none of this reaches the Copilot.
//   - Displays must credit and link back to Tripadvisor, stay out of search engines, and not be re-sorted
//     or mixed with other ratings.
//
// Returns EuroWander's own shapes, never Terra's.
import { getJSON, ProviderError } from '../http.js'

const BASE = 'https://terra.tripadvisor.com/api'
export const ATTRIBUTION = { text: 'Traveler ratings from Tripadvisor', links: ['https://www.tripadvisor.com/'] }

export const configured = () => Boolean(process.env.TRIPADVISOR_API_KEY)

function headers() {
  const k = process.env.TRIPADVISOR_API_KEY
  if (!k) throw new ProviderError('not_configured')
  return { 'X-API-Key': k }
}

// Search endpoints allow one request a second across the account: space this instance's calls out.
let lastSearch = 0
async function searchSlot(now = Date.now) {
  const wait = lastSearch + 1100 - now()
  if (wait > 2500) throw new ProviderError('rate_limited')
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastSearch = now()
}
export const resetSearchSlot = () => {
  lastSearch = 0
}

const str = (v, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const https = (v) => (typeof v === 'string' && /^https:\/\/[^\s]+$/i.test(v.trim()) ? v.trim().slice(0, 500) : null)
const allNames = (names) =>
  (Array.isArray(names) ? names : [])
    .map((n) => str(n?.value, 160))
    .filter(Boolean)
    .slice(0, 6)
const primaryName = (names) => {
  const list = Array.isArray(names) ? names : []
  return str((list.find((n) => n?.primary) || list.find((n) => n?.language === 'en') || list[0])?.value, 160)
}

// EuroWander interest → Tripadvisor top-level category (null: don't filter, e.g. bars can be either).
export const CATEGORY = { food: 'RESTAURANT', history: 'ATTRACTION', museums: 'ATTRACTION', outdoors: 'ATTRACTION', shopping: 'ATTRACTION', nightlife: null, hotel: 'HOTEL' }

// Up to 3 catalog places closest to a point: just enough to identify one. → [{ id, names, lat, lng, distanceKm }]
export async function nearbyCandidates({ lat, lng, category }) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), radius: '0.25', unit: 'KM', size: '3', sort: 'distance,asc', locale: 'en' })
  if (category) params.set('category', category)
  await searchSlot()
  const data = await getJSON(`${BASE}/catalog/locations/nearby?${params}`, { headers: headers(), timeout: 8000 })
  if (!Array.isArray(data?.data)) throw new ProviderError('bad_response')
  return data.data
    .map((r) => {
      const l = r?.location
      const id = Number(l?.id)
      const la = l?.coordinates?.latitude
      const lo = l?.coordinates?.longitude
      if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(la) || !Number.isFinite(lo)) return null
      return { id, names: allNames(l.names), lat: la, lng: lo, distanceKm: Number.isFinite(r.distance_kilometers) ? r.distance_kilometers : null }
    })
    .filter(Boolean)
}

// One location's traveler rating, fresh. → normalized rating, or null when Tripadvisor has none for it.
// A 404 means the ID isn't available to this account (for example, not on its allowlist).
export async function locationRating(id) {
  const data = await getJSON(`${BASE}/locations/${encodeURIComponent(id)}?locale=en`, { headers: headers(), timeout: 8000 })
  return normalizeLocation(data)
}

export function normalizeLocation(l) {
  const id = Number(l?.id)
  if (!Number.isInteger(id) || id <= 0) throw new ProviderError('bad_response')
  const overall = l.traveler_ratings?.overall || {}
  const rating = Number.isFinite(overall.rating) && overall.rating >= 1 && overall.rating <= 5 ? Math.round(overall.rating * 2) / 2 : null
  const urls = l.urls?.tripadvisor || {}
  const ranking = (Array.isArray(l.rankings) ? l.rankings : []).map((r) => str(r?.display_text, 120)).find(Boolean) || null
  const out = {
    id,
    name: primaryName(l.names),
    names: allNames(l.names),
    lat: l.coordinates?.latitude,
    lng: l.coordinates?.longitude,
    rating,
    reviewCount: Number.isInteger(overall.count) && overall.count >= 0 ? overall.count : null,
    ratingImage: https(overall.icon_url),
    ranking,
    priceLevel: str(l.price_level, 40),
    url: https(urls.main),
    writeReviewUrl: https(urls.write_review),
    photosUrl: https(urls.photos),
    photoCount: Number.isInteger(l.photos?.total_count) ? l.photos.total_count : null,
    status: l.status?.value === 'CLOSED' ? 'closed' : l.status?.value === 'TEMPORARILY_CLOSED' ? 'temporarily_closed' : null,
  }
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k]
  return out
}
