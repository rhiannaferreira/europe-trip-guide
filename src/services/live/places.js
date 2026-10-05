// placesService: live restaurants and attractions, normalized, for every part of the app (Explore, Travel
// Mode, the copilot). Components never see a provider's response; they get app places with live fields.
//
// A live place is an ordinary app place (id, cityId, category, type, name, lat, lng, description) plus:
//   source 'live', provider, providerId, retrievedAt, and only the fields the provider gave:
//   address, cuisine, openingHours (as listed on OpenStreetMap), website, phone, wheelchair, wiki, osmUrl.
// There are never ratings, review counts or price levels: the provider doesn't have them.
import { cities, cityById } from '../../data/cities.js'
import { countryByCode } from '../../data/countries.js'
import { distanceKm } from '../../utils/distance.js'
import { liveGet, liveHealth } from './http.js'

export const PLACE_KINDS = {
  food: { label: 'Food', icon: '🍽️', loading: 'Searching nearby restaurants…' },
  restaurant: { label: 'Restaurants', icon: '🍝', loading: 'Searching nearby restaurants…' },
  cafe: { label: 'Coffee', icon: '☕', loading: 'Finding cafés nearby…' },
  dessert: { label: 'Dessert', icon: '🍨', loading: 'Finding gelato and sweets nearby…' },
  quick: { label: 'Quick bites', icon: '🥪', loading: 'Finding quick bites nearby…' },
  bar: { label: 'Bars', icon: '🍷', loading: 'Finding bars nearby…' },
  nightlife: { label: 'Nightlife', icon: '🌙', loading: 'Finding bars and clubs…' },
  museum: { label: 'Museums', icon: '🖼️', loading: 'Loading museums…' },
  sights: { label: 'Sights', icon: '🏛️', loading: 'Loading attractions…' },
  attractions: { label: 'Attractions', icon: '📍', loading: 'Loading attractions…' },
  park: { label: 'Parks', icon: '🌳', loading: 'Finding parks…' },
  shopping: { label: 'Shopping', icon: '🛍️', loading: 'Finding shops…' },
}

// App interests → the live kind that answers them.
export const KIND_FOR_CATEGORY = { food: 'restaurant', museums: 'museum', history: 'sights', outdoors: 'park', nightlife: 'nightlife', shopping: 'shopping' }

export const CUISINES = ['italian', 'pizza', 'french', 'spanish', 'tapas', 'greek', 'portuguese', 'german', 'regional', 'mediterranean', 'seafood', 'indian', 'chinese', 'japanese', 'sushi', 'thai', 'vietnamese', 'asian', 'mexican', 'turkish', 'lebanese', 'kebab', 'burger']

// The nearest guide city within 40 km: live places belong to a city like every other place.
export function nearestCity(p, maxKm = 40) {
  let best = null
  for (const c of cities) {
    const km = distanceKm(p, c)
    if (km <= maxKm && (!best || km < best.km)) best = { city: c, km }
  }
  return best?.city || null
}

export const cityZoneOf = (cityId) => countryByCode[cityById[cityId]?.country]?.tz || 'Europe/Paris'

const TYPE_LABEL = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Place')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// A normalized provider place → an app place (or null outside the guide's cities).
export function toAppPlace(p, { cityId = null } = {}) {
  const city = cityId ? cityById[cityId] : nearestCity(p)
  if (!city || !p?.id || !p.name) return null
  const cuisine = p.cuisine ? p.cuisine.split(/[;,]/).map((s) => cap(s.trim().replace(/_/g, ' '))).filter(Boolean).slice(0, 2).join(', ') : ''
  const out = {
    id: p.id,
    cityId: city.id,
    category: p.category,
    type: p.type || 'place',
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    // An ice-cream shop in Italy is a gelateria.
    description: [p.type === 'ice cream' && city.country === 'IT' ? 'Gelateria' : TYPE_LABEL(p.type), cuisine].filter(Boolean).join(' · '),
    source: 'live',
    provider: p.provider,
    providerId: p.providerId,
    retrievedAt: p.retrievedAt,
  }
  for (const k of ['address', 'cuisine', 'openingHours', 'website', 'phone', 'wheelchair', 'wiki', 'osmUrl']) if (p[k]) out[k] = p[k]
  return out
}

// searchPlaces({ lat, lng, radius (m), kind, cuisine, diet, name, limit, cityId })
//   → { places: [appPlace + distanceKm], center, retrievedAt, attribution }
// Throws LiveError when live places can't be fetched; callers show their fallback.
export async function searchPlaces({ lat, lng, radius = 1000, kind = 'food', cuisine = '', diet = '', name = '', limit = 20, cityId = null }) {
  const r = await liveGet('places/search', {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
    radius: Math.round(radius),
    kind,
    cuisine: cuisine || undefined,
    diet: diet || undefined,
    name: name || undefined,
    limit,
  })
  const center = { lat, lng }
  const list = (r.data.places || [])
    .map((p) => toAppPlace(p, { cityId: cityId && distanceKm(p, cityById[cityId]) < 40 ? cityId : null }))
    .filter(Boolean)
    .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
  return { places: list, center, retrievedAt: r.meta.retrievedAt, attribution: r.meta.attribution }
}

// Fresh details for a saved live place (its dynamic fields: hours, website, phone).
export async function getPlaceDetails(place) {
  if (!place?.providerId) return null
  const r = await liveGet('places/details', { id: place.providerId })
  return r.data.place ? { ...toAppPlace(r.data.place, { cityId: place.cityId }), retrievedAt: r.meta.retrievedAt } : null
}

// Where a named landmark is, near a city: { name, address, lat, lng }.
export async function geocodePlace(q, near) {
  const r = await liveGet('places/geocode', { q, lat: near ? Math.round(near.lat * 100) / 100 : undefined, lng: near ? Math.round(near.lng * 100) / 100 : undefined })
  return r.data.point
}

// Landmarks and streets matching what's been typed so far, near a point. → [{ name, detail, lat, lng }]
export async function suggestPlaces(q, near) {
  const r = await liveGet('places/suggest', { q: q.trim(), lat: near ? Math.round(near.lat * 100) / 100 : undefined, lng: near ? Math.round(near.lng * 100) / 100 : undefined })
  return r.data.suggestions || []
}

export async function livePlacesEnabled() {
  const h = await liveHealth()
  return Boolean(h?.places?.enabled)
}
