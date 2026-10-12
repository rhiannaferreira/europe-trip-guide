// EuroWander's live data services on the server: each route checks its input, answers from cache when
// it can, keeps to the daily caps, calls the provider adapter, and returns normalized data.
//
// Providers are chosen here and nowhere else, so swapping one (say Google Places for Geoapify) means
// writing a new adapter with the same functions and changing these two lines.
import * as places from './providers/geoapify.js'
import * as rail from './providers/transitous.js'
import * as ratings from './providers/tripadvisor.js'
import { bestMatch, confirm } from './match.js'
import { createCache } from './cache.js'
import { ProviderError } from './http.js'
import { underDailyCap } from './limits.js'
import { BadInput, bool, coords, intIn, oneOf, opaqueId, providerId, text, when } from './validate.js'

export const PROVIDERS = { places: { id: 'geoapify', mod: places }, rail: { id: 'transitous', mod: rail }, ratings: { id: 'tripadvisor', mod: ratings } }

const cache = createCache({ max: 800 })
// Our place → Tripadvisor location ID (the only Tripadvisor data its terms let us keep), or no match.
const taMatches = createCache({ max: 2000 })
export const clearCache = () => {
  cache.clear()
  taMatches.clear()
}

const MIN = 60_000
const HOUR = 60 * MIN

// Each route: bucket (rate limit), provider, and handler(query) → { data, ttl (s, browser + CDN), cached }.
async function guarded(provider, key, ttlMs, fetcher) {
  return cache.through(key, ttlMs, async () => {
    if (!(await underDailyCap(provider.id))) throw new ProviderError('cap_reached')
    return fetcher()
  })
}

function needPlaces() {
  if (!places.configured()) throw new ProviderError('not_configured')
}

function needRail() {
  if (!rail.configured()) throw new ProviderError('not_configured')
}

export const ROUTES = {
  'places/search': {
    bucket: 'places',
    provider: PROVIDERS.places,
    async run(q) {
      needPlaces()
      const at = coords(q.lat, q.lng)
      const radius = intIn(q.radius, 100, 5000, 1000)
      const kind = oneOf(q.kind, places.KIND_IDS, 'food')
      const cuisine = q.cuisine ? text(q.cuisine, { min: 3, max: 30 }).toLowerCase().replace(/[^a-z_]/g, '') || null : null
      const diet = oneOf(q.diet, places.DIETS, null)
      const name = text(q.name, { required: false, min: 2, max: 60 })
      // The map asks for up to 60 at once (Geoapify charges one extra credit per 20).
      const limit = intIn(q.limit, 1, 60, 20)
      const key = `ps|${at.lat},${at.lng}|${radius}|${kind}|${cuisine || ''}|${diet || ''}|${name.toLowerCase()}|${limit}`
      const { value, cached } = await guarded(PROVIDERS.places, key, 6 * HOUR, () => places.searchPlaces({ ...at, radius, kind, cuisine, diet, name, limit }))
      return { data: { places: value, center: at, radius, kind }, ttl: 3600, cached }
    },
  },
  'places/details': {
    bucket: 'places',
    provider: PROVIDERS.places,
    async run(q) {
      needPlaces()
      const id = providerId(q.id, { max: 200 })
      const { value, cached } = await guarded(PROVIDERS.places, `pd|${id}`, 12 * HOUR, () => places.placeDetails(id))
      return { data: { place: value }, ttl: 6 * 3600, cached }
    },
  },
  'places/geocode': {
    bucket: 'places',
    provider: PROVIDERS.places,
    async run(q) {
      needPlaces()
      const t = text(q.q, { min: 3, max: 80 })
      const near = q.lat != null ? coords(q.lat, q.lng, { decimals: 2 }) : null
      const key = `pg|${t.toLowerCase()}|${near ? `${near.lat},${near.lng}` : ''}`
      const { value, cached } = await guarded(PROVIDERS.places, key, 24 * HOUR, () => places.geocode(t, near))
      return { data: { point: value }, ttl: 24 * 3600, cached }
    },
  },
  'places/at': {
    bucket: 'places',
    provider: PROVIDERS.places,
    async run(q) {
      needPlaces()
      // A tapped map point (not the traveller's location): about 10 m is enough to find what's there.
      const at = coords(q.lat, q.lng, { decimals: 4 })
      const key = `pa2|${at.lat},${at.lng}`
      const { value, cached } = await guarded(PROVIDERS.places, key, 24 * HOUR, async () => {
        const near = { ...at, radius: 90, limit: 12 }
        const found = await places.searchPlaces({ ...near, kind: 'any' }).catch((e) => (e.status === 400 ? places.searchPlaces({ ...near, kind: 'anyBasic' }) : Promise.reject(e)))
        // Nothing listed: name the square, street or building instead (one extra request, only then).
        const spot = found.length ? null : await places.reverse(at).catch(() => null)
        return { places: found.slice(0, 5), spot }
      })
      return { data: { places: value.places, spot: value.spot, at }, ttl: 6 * 3600, cached }
    },
  },
  'places/suggest': {
    bucket: 'suggest',
    provider: PROVIDERS.places,
    async run(q) {
      needPlaces()
      const t = text(q.q, { min: 3, max: 80 })
      const near = q.lat != null ? coords(q.lat, q.lng, { decimals: 2 }) : null
      const key = `pq|${t.toLowerCase()}|${near ? `${near.lat},${near.lng}` : ''}`
      const { value, cached } = await guarded(PROVIDERS.places, key, 24 * HOUR, () => places.suggest(t, near))
      return { data: { suggestions: value }, ttl: 24 * 3600, cached }
    },
  },
  'trains/stations': {
    bucket: 'trains',
    provider: PROVIDERS.rail,
    async run(q) {
      needRail()
      const t = text(q.q, { min: 3, max: 60 })
      const near = q.lat != null ? coords(q.lat, q.lng, { decimals: 1 }) : null
      const key = `st|${t.toLowerCase()}|${near ? `${near.lat},${near.lng}` : ''}`
      const { value, cached } = await guarded(PROVIDERS.rail, key, 24 * HOUR, () => rail.searchStations(t, near))
      return { data: { stations: value }, ttl: 7 * 24 * 3600, cached }
    },
  },
  'trains/journeys': {
    bucket: 'trains',
    provider: PROVIDERS.rail,
    async run(q) {
      needRail()
      const from = providerId(q.from)
      const to = providerId(q.to)
      if (from === to) throw new BadInput('Pick two different stations.')
      const time = when(q.time)
      const arriveBy = bool(q.arriveBy)
      const maxTransfers = q.maxTransfers == null || q.maxTransfers === '' ? null : intIn(q.maxTransfers, 0, 6)
      const windowMin = intIn(q.window, 30, 360, 180)
      const cursor = q.cursor ? opaqueId(q.cursor) : null
      // Departures today and tomorrow change with real-time data, so they're kept briefly.
      const soon = !time || Date.parse(/Z|[+-]\d{2}:\d{2}$/.test(time) ? time : `${time}Z`) - Date.now() < 36 * HOUR
      const ttlMs = soon ? 2 * MIN : 30 * MIN
      const key = `pj|${from}|${to}|${time || 'now'}|${arriveBy}|${maxTransfers ?? ''}|${windowMin}|${cursor || ''}`
      const { value, cached } = await guarded(PROVIDERS.rail, key, ttlMs, () => rail.searchJourneys({ from, to, time, arriveBy, maxTransfers, windowMin, cursor }))
      return { data: value, ttl: soon ? 60 : 900, cached }
    },
  },
  'trains/status': {
    bucket: 'status',
    provider: PROVIDERS.rail,
    async run(q) {
      needRail()
      const id = q.id ? opaqueId(q.id) : null
      const from = q.from ? providerId(q.from) : null
      const to = q.to ? providerId(q.to) : null
      const departure = q.dep ? when(q.dep, { aheadDays: 400 }) : null
      const tripIds = String(q.trips || '')
        .split(',')
        .filter(Boolean)
        .slice(0, 6)
        .map((t) => opaqueId(t, { max: 300 }))
      if (!id && !(from && to && departure)) throw new BadInput('Which journey?')
      const key = `js|${id || ''}|${from}|${to}|${departure}|${tripIds.join(',')}`
      const { value, cached } = await guarded(PROVIDERS.rail, key, MIN, () => rail.journeyStatus({ id, from, to, departure, tripIds }))
      return { data: { journey: value }, ttl: 30, cached }
    },
  },
}

// What's switched on, for the browser to decide what to offer. No secrets, just booleans.
async function capped(provider, fetcher) {
  if (!(await underDailyCap(provider.id))) throw new ProviderError('cap_reached')
  return fetcher()
}

ROUTES['ratings/place'] = {
  bucket: 'ratings',
  provider: PROVIDERS.ratings,
  // Tripadvisor traveler rating for one place someone has opened. Never cached (their terms), so the
  // answer is no-store; only the matched location ID is remembered, to skip the search next time.
  async run(q) {
    if (!ratings.configured()) throw new ProviderError('not_configured')
    const name = text(q.name, { min: 2, max: 120 })
    const at = coords(q.lat, q.lng, { decimals: 5 })
    const kind = oneOf(q.cat, Object.keys(ratings.CATEGORY), null)
    const known = q.ta ? intIn(q.ta, 1, 2_000_000_000, null) : null
    const place = { name, ...at }
    const key = `ta|${name.toLowerCase()}|${at.lat.toFixed(4)},${at.lng.toFixed(4)}`

    // 1. Which Tripadvisor listing is it? (the browser's remembered ID, ours, or a small nearby search)
    let match = known ? { matched: true, level: 'high', providerId: known, reason: 'remembered match' } : taMatches.get(key)
    let searched = false
    if (!match) {
      const candidates = await capped(PROVIDERS.ratings, () => ratings.nearbyCandidates({ ...at, category: kind ? ratings.CATEGORY[kind] : null }))
      match = bestMatch(place, candidates)
      searched = true
      taMatches.set(key, match, 30 * 24 * HOUR)
    }
    if (!match.matched) return { data: { status: 'no_match', confidence: match.confidence, reason: match.reason }, ttl: 0, cached: !searched }

    // 2. Its rating, fresh, and only if the details still describe our place.
    let details
    try {
      details = await capped(PROVIDERS.ratings, () => ratings.locationRating(match.providerId))
    } catch (e) {
      // Found in the catalog but not available to this account (Terra allowlist), or gone.
      if (e?.code === 'not_found') return { data: { status: 'not_available' }, ttl: 0, cached: false }
      throw e
    }
    if (!confirm(place, details, match.level)) {
      taMatches.set(key, { matched: false, level: 'low', confidence: match.confidence, reason: 'details did not confirm the match' }, 30 * 24 * HOUR)
      return { data: { status: 'no_match', confidence: match.confidence, reason: 'details did not confirm the match' }, ttl: 0, cached: false }
    }
    if (details.rating == null) return { data: { status: 'no_rating', providerId: details.id, url: details.url }, ttl: 0, cached: false }
    const { names, lat, lng, ...shown } = details
    return { data: { status: 'rated', confidence: match.confidence, match: match.level, rating: shown }, ttl: 0, cached: false }
  },
}

export function health() {
  return {
    places: { provider: PROVIDERS.places.id, enabled: places.configured(), attribution: places.ATTRIBUTION },
    rail: { provider: PROVIDERS.rail.id, enabled: rail.configured(), attribution: rail.ATTRIBUTION },
    events: { provider: 'eurowander', enabled: true },
    weather: { provider: 'open-meteo', enabled: true },
    ratings: { provider: PROVIDERS.ratings.id, enabled: ratings.configured() },
  }
}
