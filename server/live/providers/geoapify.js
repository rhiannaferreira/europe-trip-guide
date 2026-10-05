// Places provider: Geoapify Places API (OpenStreetMap data). Server-side only: needs GEOAPIFY_API_KEY.
//
// Terms (checked 2026-10-05): the free plan allows commercial use, 3,000 credits a day (1 per request, +1
// per extra 20 results), and results may be cached and stored. Attribution: "Powered by Geoapify" and
// "© OpenStreetMap contributors" near the results. There are no ratings, review counts, price levels
// or photos in this data, so the normalized places never have them.
//
// Everything this module returns is EuroWander's normalized shape (services/live/models in the
// browser), never Geoapify's own response.
import { getJSON, ProviderError } from '../http.js'

const BASE = 'https://api.geoapify.com'
export const ATTRIBUTION = { text: 'Powered by Geoapify · © OpenStreetMap contributors', links: ['https://www.geoapify.com/', 'https://www.openstreetmap.org/copyright'] }

export const configured = () => Boolean(process.env.GEOAPIFY_API_KEY)

// What the app can ask for, and the Geoapify categories behind each.
export const KINDS = {
  food: ['catering.restaurant', 'catering.cafe', 'catering.fast_food', 'commercial.marketplace'],
  restaurant: ['catering.restaurant'],
  quick: ['catering.fast_food', 'commercial.food_and_drink.bakery'],
  cafe: ['catering.cafe'],
  bakery: ['commercial.food_and_drink.bakery'],
  dessert: ['catering.ice_cream', 'commercial.food_and_drink.ice_cream', 'commercial.food_and_drink.confectionery'],
  bar: ['catering.bar', 'catering.pub', 'catering.biergarten'],
  nightlife: ['catering.bar', 'catering.pub', 'catering.biergarten', 'adult.nightclub'],
  museum: ['entertainment.museum', 'entertainment.culture.gallery'],
  sights: ['tourism.sights', 'tourism.attraction'],
  park: ['leisure.park', 'beach'],
  shopping: ['commercial.shopping_mall', 'commercial.department_store', 'commercial.marketplace'],
  attractions: ['tourism.sights', 'tourism.attraction', 'entertainment.museum', 'leisure.park'],
  // Whatever is at a spot someone tapped on the map.
  any: ['catering', 'tourism.sights', 'tourism.attraction', 'entertainment.museum', 'entertainment.culture', 'leisure.park', 'commercial'],
}
export const KIND_IDS = Object.keys(KINDS)

// Cuisines that exist as Geoapify sub-categories (catering.restaurant.<cuisine>). Anything else is
// matched against the OpenStreetMap cuisine tag instead.
export const CUISINES = ['italian', 'pizza', 'french', 'spanish', 'tapas', 'greek', 'portuguese', 'german', 'regional', 'mediterranean', 'seafood', 'indian', 'chinese', 'japanese', 'sushi', 'thai', 'vietnamese', 'asian', 'mexican', 'turkish', 'lebanese', 'kebab', 'burger']
export const DIETS = ['vegetarian', 'vegan']

// Geoapify category → the app's interest (category) and place type.
const TYPE_RULES = [
  [/^(catering|commercial\.food_and_drink)\.ice_cream/, 'food', 'ice cream'],
  [/^commercial\.food_and_drink\.confectionery/, 'food', 'sweet shop'],
  [/^catering\.restaurant/, 'food', 'restaurant'],
  [/^catering\.fast_food/, 'food', 'fast food'],
  [/^catering\.cafe/, 'food', 'cafe'],
  [/^commercial\.food_and_drink\.bakery/, 'food', 'bakery'],
  [/^commercial\.marketplace/, 'food', 'market'],
  [/^catering\.biergarten/, 'nightlife', 'beer garden'],
  [/^catering\.pub/, 'nightlife', 'pub'],
  [/^catering\.bar/, 'nightlife', 'bar'],
  [/^adult\.nightclub/, 'nightlife', 'club'],
  [/^entertainment\.culture\.gallery/, 'museums', 'gallery'],
  [/^entertainment\.museum/, 'museums', 'museum'],
  [/^tourism\.attraction\.viewpoint/, 'outdoors', 'viewpoint'],
  [/^tourism\.sights\.place_of_worship/, 'history', 'church'],
  [/^tourism\.sights\.(castle|memorial|monument|ruines|fort|city_gate|archaeological_site|tower|bridge|lighthouse|windmill|battlefield)/, 'history', null],
  [/^tourism\.sights/, 'history', 'landmark'],
  [/^tourism\.attraction/, 'history', 'sight'],
  [/^leisure\.park/, 'outdoors', 'park'],
  [/^beach/, 'outdoors', 'beach'],
  [/^natural/, 'outdoors', 'nature'],
  [/^commercial\.(shopping_mall|department_store)/, 'shopping', 'shopping centre'],
  [/^commercial/, 'shopping', 'shop'],
]

function classify(categories = []) {
  // Most specific first.
  const sorted = [...categories].sort((a, b) => b.split('.').length - a.split('.').length)
  for (const [re, category, type] of TYPE_RULES) {
    const hit = sorted.find((c) => re.test(c))
    if (hit) return { category, type: type || hit.split('.').pop().replace(/_/g, ' ').replace('ruines', 'ruins') }
  }
  return null
}

const str = (v, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const url = (v) => (typeof v === 'string' && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim().slice(0, 300) : null)

// One Geoapify feature → a normalized live place, or null when it lacks what the app needs.
export function normalizePlace(feature, retrievedAt = new Date().toISOString()) {
  const p = feature?.properties
  if (!p) return null
  const raw = p.datasource?.raw || {}
  const name = str(p.name) || str(p.name_international?.en) || str(raw.name)
  const lat = typeof p.lat === 'number' ? p.lat : feature.geometry?.coordinates?.[1]
  const lng = typeof p.lon === 'number' ? p.lon : feature.geometry?.coordinates?.[0]
  const kind = classify(p.categories)
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !kind || !p.place_id) return null
  // The OpenStreetMap id is the stable identity (same as the Overpass places the app already has);
  // Geoapify's place_id is kept to refresh details.
  const osmType = String(raw.osm_type || '').charAt(0).toLowerCase()
  const osmId = raw.osm_id
  if (!['n', 'w', 'r'].includes(osmType) || !Number.isFinite(Number(osmId))) return null
  const osmKind = { n: 'node', w: 'way', r: 'relation' }[osmType]
  const wikipedia = str(raw.wikipedia)
  const street = [str(p.street), str(p.housenumber)].filter(Boolean).join(' ')
  const address = str(p.address_line2) || [street, [str(p.postcode), str(p.city)].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null
  const out = {
    id: `osm-${osmType}${Math.abs(Number(osmId))}`,
    provider: 'geoapify',
    providerId: String(p.place_id).slice(0, 200),
    name,
    lat,
    lng,
    address,
    category: kind.category,
    type: kind.type,
    categories: (p.categories || []).filter((c) => typeof c === 'string').slice(0, 6),
    cuisine: str(p.catering?.cuisine || raw.cuisine, 80),
    openingHours: str(p.opening_hours || raw.opening_hours, 300),
    website: url(p.website || p.contact?.website || raw.website || raw['contact:website']),
    phone: str(p.contact?.phone || raw.phone || raw['contact:phone'], 40),
    wheelchair: str(raw.wheelchair, 10) || (p.facilities?.wheelchair === true ? 'yes' : null),
    wiki: wikipedia && wikipedia.startsWith('en:') ? wikipedia.slice(3) : null,
    osmUrl: `https://www.openstreetmap.org/${osmKind}/${Math.abs(Number(osmId))}`,
    retrievedAt,
  }
  // Only fields the provider actually gave.
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k]
  return out
}

function key() {
  const k = process.env.GEOAPIFY_API_KEY
  if (!k) throw new ProviderError('not_configured')
  return k
}

// { lat, lng, radius (m), kind, cuisine, diet, name, limit } → [place]
export async function searchPlaces({ lat, lng, radius = 1000, kind = 'food', cuisine = null, diet = null, name = '', limit = 20 }) {
  const base = KINDS[kind] || KINDS.food
  const knownCuisine = cuisine && CUISINES.includes(cuisine)
  const categories = knownCuisine ? [`catering.restaurant.${cuisine}`] : base
  const params = new URLSearchParams({
    categories: categories.join(','),
    filter: `circle:${lng},${lat},${radius}`,
    bias: `proximity:${lng},${lat}`,
    limit: String(cuisine && !knownCuisine ? Math.min(60, limit * 3) : limit),
    lang: 'en',
    apiKey: key(),
  })
  if (diet && DIETS.includes(diet)) params.set('conditions', diet)
  if (name) params.set('name', name)
  const data = await getJSON(`${BASE}/v2/places?${params}`)
  if (!Array.isArray(data?.features)) throw new ProviderError('bad_response')
  const at = new Date().toISOString()
  let list = data.features.map((f) => normalizePlace(f, at)).filter(Boolean)
  if (cuisine && !knownCuisine) list = list.filter((p) => (p.cuisine || '').toLowerCase().split(/[;,]/).map((s) => s.trim()).includes(cuisine))
  const seen = new Set()
  return list.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, limit)
}

// Fresh details for one place, by Geoapify place_id.
export async function placeDetails(placeId) {
  const params = new URLSearchParams({ id: placeId, features: 'details', lang: 'en', apiKey: key() })
  const data = await getJSON(`${BASE}/v2/place-details?${params}`)
  const feature = (data?.features || []).find((f) => f?.properties?.feature_type === 'details') || data?.features?.[0]
  const place = normalizePlace(feature)
  if (!place) throw new ProviderError('not_found')
  return place
}

// Suggestions while someone types a landmark or street ("Colos" → Colosseum, Colosseo station...), near a point.
export async function suggest(textQuery, near) {
  const params = new URLSearchParams({ text: textQuery, limit: '6', lang: 'en', format: 'json', apiKey: key() })
  if (near) {
    params.set('bias', `proximity:${near.lng},${near.lat}`)
    params.set('filter', `circle:${near.lng},${near.lat},40000`)
  }
  const data = await getJSON(`${BASE}/v1/geocode/autocomplete?${params}`)
  const seen = new Set()
  return (data?.results || [])
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon))
    .map((r) => ({ name: str(r.name) || str(r.address_line1) || textQuery, detail: str(r.address_line2) || str(r.formatted), lat: r.lat, lng: r.lon }))
    .filter((r) => !seen.has(r.name.toLowerCase()) && seen.add(r.name.toLowerCase()))
    .slice(0, 5)
}

// Where a named landmark or address is ("the Pantheon", "my hotel's street"), near a point.
export async function geocode(textQuery, near) {
  const params = new URLSearchParams({ text: textQuery, limit: '1', lang: 'en', format: 'json', apiKey: key() })
  if (near) {
    params.set('bias', `proximity:${near.lng},${near.lat}`)
    params.set('filter', `circle:${near.lng},${near.lat},40000`)
  }
  let data = await getJSON(`${BASE}/v1/geocode/search?${params}`)
  // Search wants the name spelled right; autocomplete forgives typos ("Colessum"). Only asked on a miss.
  if (!data?.results?.length) data = await getJSON(`${BASE}/v1/geocode/autocomplete?${params}`)
  const r = data?.results?.[0]
  if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) throw new ProviderError('not_found')
  return { name: str(r.name) || str(r.address_line1) || textQuery, address: str(r.formatted), lat: r.lat, lng: r.lon }
}
