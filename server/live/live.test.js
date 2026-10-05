// Tests for the live data gateway (api/live.js) and its provider adapters, with providers mocked.
import { test, afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/live.js'
import { clearCache } from './services.js'
import { resetLimits } from './limits.js'
import { normalizePlace } from './providers/geoapify.js'
import { normalizeJourney, normalizeStation } from './providers/transitous.js'
import { coords, when } from './validate.js'
import { AMS, PARIS, directItinerary, geoFeature, geoResponse, geocodeMatches, planResponse, transferItinerary } from './fixtures.js'

let ipN = 0
function call(path, { ip } = {}) {
  const res = { statusCode: 0, headers: {}, body: '' }
  res.status = (s) => ((res.statusCode = s), res)
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v)
  res.end = (b) => (res.body = b)
  const [p, qs = ''] = path.split('?')
  const query = { route: p.replace(/^\/api\/live\//, ''), ...Object.fromEntries(new URLSearchParams(qs)) }
  return handler({ method: 'GET', url: path, query, headers: { 'x-forwarded-for': ip || `10.1.0.${++ipN % 250}` } }, res).then(() => ({ status: res.statusCode, json: JSON.parse(res.body), headers: res.headers }))
}

const realFetch = globalThis.fetch
let calls = []
function mockFetch(fn) {
  calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return fn(String(url), init)
  }
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (s) => ({ ok: false, status: s, json: async () => ({ error: 'internal detail apiKey=SECRET' }) })

beforeEach(() => {
  clearCache()
  resetLimits()
  process.env.GEOAPIFY_API_KEY = 'geo-test-key'
})
afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.GEOAPIFY_API_KEY
  delete process.env.LIVE_DAILY_CAP_GEOAPIFY
})

const near = '/api/live/places/search?lat=41.89834&lng=12.47689&radius=800&kind=restaurant'

// ----- Places -----

test('restaurant search: key stays on the server, input is rounded, results are normalized', async () => {
  mockFetch(() => ok(geoResponse([geoFeature(), geoFeature({ name: 'No coords', lat: undefined, lon: undefined }, {}), geoFeature({ name: 'Duplicate' })])))
  const r = await call(near)
  assert.equal(r.status, 200)
  assert.equal(r.json.ok, true)
  const sent = new URL(calls[0].url)
  assert.equal(sent.hostname, 'api.geoapify.com')
  assert.equal(sent.searchParams.get('apiKey'), 'geo-test-key')
  assert.equal(sent.searchParams.get('categories'), 'catering.restaurant')
  assert.equal(sent.searchParams.get('filter'), 'circle:12.477,41.898,800')
  const [p] = r.json.data.places
  assert.equal(p.id, 'osm-n123456')
  assert.equal(p.provider, 'geoapify')
  assert.equal(p.providerId, '51abc123def')
  assert.equal(p.category, 'food')
  assert.equal(p.type, 'restaurant')
  assert.equal(p.cuisine, 'italian')
  assert.equal(p.openingHours, 'Mo-Sa 12:30-16:00,19:00-23:30')
  assert.equal(p.phone, '+39 06 687 5287')
  // Fields the provider doesn't have are absent, not invented.
  for (const k of ['rating', 'ratingCount', 'priceLevel', 'photo', 'isOpen']) assert.equal(k in p, false, k)
  assert.equal(r.json.data.places.length, 1, 'duplicates and unusable rows dropped')
  assert.ok(!JSON.stringify(r.json).includes('geo-test-key'))
  assert.match(r.headers['cache-control'], /s-maxage=3600/)
  assert.equal(r.json.meta.provider, 'geoapify')
  assert.match(r.json.meta.attribution.text, /Geoapify/)
})

test('attraction kinds map to Geoapify categories; cuisines become sub-categories', async () => {
  mockFetch(() => ok(geoResponse([geoFeature({ name: 'Musei Capitolini', categories: ['entertainment', 'entertainment.museum'] }, { osm_id: 9, osm_type: 'w', wikipedia: 'en:Capitoline Museums' })])))
  const r = await call('/api/live/places/search?lat=41.89&lng=12.48&kind=museum')
  assert.equal(new URL(calls[0].url).searchParams.get('categories'), 'entertainment.museum,entertainment.culture.gallery')
  const p = r.json.data.places[0]
  assert.equal(p.category, 'museums')
  assert.equal(p.id, 'osm-w9')
  assert.equal(p.wiki, 'Capitoline Museums')
  assert.equal(p.osmUrl, 'https://www.openstreetmap.org/way/9')
  await call('/api/live/places/search?lat=41.89&lng=12.48&kind=restaurant&cuisine=italian&diet=vegetarian')
  const u = new URL(calls[calls.length - 1].url)
  assert.equal(u.searchParams.get('categories'), 'catering.restaurant.italian')
  assert.equal(u.searchParams.get('conditions'), 'vegetarian')
})

test('a second identical search is answered from cache without calling the provider', async () => {
  mockFetch(() => ok(geoResponse([geoFeature()])))
  await call(near)
  const r = await call(near)
  assert.equal(calls.length, 1)
  assert.equal(r.json.meta.cached, true)
})

test('no results is an empty list, not an error', async () => {
  mockFetch(() => ok(geoResponse([])))
  const r = await call(near)
  assert.equal(r.status, 200)
  assert.deepEqual(r.json.data.places, [])
})

test('invalid and out-of-bounds input is refused before any provider call', async () => {
  mockFetch(() => ok(geoResponse([])))
  for (const q of ['lat=abc&lng=1', 'lat=40.7&lng=-74', 'lat=41.9&lng=12.5&radius=99999', 'lat=41.9&lng=12.5&kind=casino', 'lat=41.9&lng=12.5&limit=500']) {
    const r = await call(`/api/live/places/search?${q}`)
    assert.equal(r.status, 400, q)
    assert.equal(r.json.error.code, 'bad_input')
  }
  assert.equal(calls.length, 0)
  assert.equal((await call('/api/live/places/details?id=https://evil.example/x')).status, 400)
  assert.equal((await call('/api/live/nope')).status, 404)
})

test('without a key, places report not configured (the app falls back to its own data)', async () => {
  delete process.env.GEOAPIFY_API_KEY
  mockFetch(() => ok(geoResponse([])))
  const r = await call(near)
  assert.equal(r.status, 503)
  assert.equal(r.json.error.code, 'not_configured')
  assert.equal(calls.length, 0)
  const h = await call('/api/live/health')
  assert.equal(h.json.data.places.enabled, false)
  assert.equal(h.json.data.rail.enabled, true)
})

test('provider failures become short codes; raw errors and keys never leak', async () => {
  mockFetch(() => status(500))
  let r = await call(near)
  assert.equal(r.status, 502)
  assert.equal(r.json.error.code, 'unavailable')
  assert.ok(!JSON.stringify(r.json).includes('SECRET'))
  assert.equal(r.headers['cache-control'], 'no-store')
  clearCache()
  mockFetch(() => {
    const e = new Error('aborted')
    e.name = 'AbortError'
    throw e
  })
  r = await call(near)
  assert.equal(r.status, 504)
  assert.equal(r.json.error.code, 'timeout')
  clearCache()
  mockFetch(() => status(429))
  r = await call(near)
  assert.equal(r.json.error.code, 'rate_limited')
})

test('visitors are rate-limited per minute', async () => {
  mockFetch(() => ok(geoResponse([])))
  let last
  for (let i = 0; i < 42; i++) last = await call(`/api/live/places/search?lat=41.9&lng=12.${100 + i}`, { ip: '10.9.9.9' })
  assert.equal(last.status, 429)
  assert.equal(last.json.error.code, 'rate_limited')
})

test('the daily cap stops provider calls', async () => {
  process.env.LIVE_DAILY_CAP_GEOAPIFY = '2'
  mockFetch(() => ok(geoResponse([])))
  await call('/api/live/places/search?lat=41.9&lng=12.1')
  await call('/api/live/places/search?lat=41.9&lng=12.2')
  const r = await call('/api/live/places/search?lat=41.9&lng=12.3')
  assert.equal(r.status, 503)
  assert.equal(r.json.error.code, 'cap_reached')
  assert.equal(calls.length, 2)
})

test('place details and geocoding', async () => {
  mockFetch((url) => (url.includes('place-details') ? ok(geoResponse([geoFeature({ feature_type: 'details' })])) : ok({ results: [{ name: 'Pantheon', lat: 41.8986, lon: 12.4769, formatted: 'Pantheon, Rome' }] })))
  const d = await call('/api/live/places/details?id=51abc123def')
  assert.equal(d.json.data.place.name, 'Roscioli')
  const g = await call('/api/live/places/geocode?q=Pantheon&lat=41.9&lng=12.5')
  assert.deepEqual(g.json.data.point, { name: 'Pantheon', address: 'Pantheon, Rome', lat: 41.8986, lng: 12.4769 })
})

test('landmark suggestions while typing: rate-limited, de-duplicated, never more than five', async () => {
  mockFetch(() => ok({ results: [{ name: 'Colosseum', lat: 41.89, lon: 12.49, address_line2: 'Rome' }, { name: 'Colosseum', lat: 41.89, lon: 12.49 }, { name: 'Colosseo', lat: 41.891, lon: 12.491 }, { name: 'No coords' }] }))
  const r = await call('/api/live/places/suggest?q=Colos&lat=41.9&lng=12.5')
  assert.deepEqual(r.json.data.suggestions.map((x) => x.name), ['Colosseum', 'Colosseo'])
  assert.equal(new URL(calls[0].url).pathname, '/v1/geocode/autocomplete')
  assert.equal((await call('/api/live/places/suggest?q=Co&lat=41.9&lng=12.5')).status, 400)
})

test('geocoding a misspelt landmark falls back to autocomplete, once', async () => {
  mockFetch((url) => (url.includes('/geocode/autocomplete') ? ok({ results: [{ name: 'Colosseum', lat: 41.8902, lon: 12.4922 }] }) : ok({ results: [] })))
  const g = await call('/api/live/places/geocode?q=Colessum&lat=41.9&lng=12.5')
  assert.equal(g.json.data.point.name, 'Colosseum')
  assert.deepEqual(calls.map((c) => new URL(c.url).pathname), ['/v1/geocode/search', '/v1/geocode/autocomplete'])
})

test('normalizePlace skips places without an OpenStreetMap id or a known kind', () => {
  assert.equal(normalizePlace(geoFeature({}, { osm_id: undefined })), null)
  assert.equal(normalizePlace(geoFeature({ categories: ['building'] })), null)
  assert.equal(normalizePlace(geoFeature({ categories: ['catering.cafe'] })).type, 'cafe')
})

// ----- Rail -----

test('station search keeps rail stations, drops bus stops and addresses', async () => {
  mockFetch(() => ok(geocodeMatches))
  const r = await call('/api/live/trains/stations?q=Paris&lat=48.85&lng=2.35')
  const sent = new URL(calls[0].url)
  assert.equal(sent.hostname, 'api.transitous.org')
  assert.equal(sent.pathname, '/api/v1/geocode')
  assert.equal(sent.searchParams.get('type'), 'STOP')
  assert.match(calls[0].init.headers['user-agent'], /^EuroWander\//)
  assert.deepEqual(r.json.data.stations.map((s) => s.name), ['Paris Gare du Nord', 'Paris Gare de Lyon'])
  assert.equal(r.json.data.stations[0].id, PARIS[1])
  assert.equal(r.json.data.stations[0].area, 'Paris')
  assert.equal((await call('/api/live/trains/stations?q=P')).status, 400)
  assert.equal(normalizeStation(geocodeMatches[2]), null)
})

test('a direct train, scheduled only: no expected times, never "on time"', async () => {
  mockFetch(() => ok(planResponse([directItinerary()])))
  const r = await call(`/api/live/trains/journeys?from=${encodeURIComponent(PARIS[1])}&to=${encodeURIComponent(AMS[1])}`)
  assert.equal(r.status, 200)
  const sent = new URL(calls[0].url)
  assert.equal(sent.pathname, '/api/v6/plan')
  assert.equal(sent.searchParams.get('transitModes'), 'RAIL')
  const [j] = r.json.data.journeys
  assert.equal(j.transfers, 0)
  assert.equal(j.durationMin, 205)
  assert.equal(j.realtime, false)
  assert.equal(j.departure.scheduled, '2026-10-06T06:25:00Z')
  assert.equal('expected' in j.departure, false)
  assert.deepEqual(j.operators, ['Eurostar'])
  assert.equal(j.legs[0].service, 'EST 9311')
  assert.equal(j.legs.length, 1, 'walking legs dropped')
  assert.equal(r.json.data.next, 'next')
})

test('a journey with a change lists the transfer station and both operators', () => {
  const j = normalizeJourney(transferItinerary())
  assert.equal(j.transfers, 1)
  assert.deepEqual(j.changes, ['Brussels-Midi'])
  assert.deepEqual(j.operators, ['Eurostar', 'NS International'])
  assert.equal(j.durationMin, 250)
})

test('real-time delay, platform and cancellation come through as given', () => {
  const late = normalizeJourney(directItinerary({ realTime: true, dep: '2026-10-06T06:40:00Z', schedDep: '2026-10-06T06:25:00Z', depTrack: '7' }))
  assert.equal(late.realtime, true)
  assert.equal(late.departure.scheduled, '2026-10-06T06:25:00Z')
  assert.equal(late.departure.expected, '2026-10-06T06:40:00Z')
  assert.equal(late.departure.track, '7')
  const gone = normalizeJourney(directItinerary({ realTime: true, cancelled: true }))
  assert.equal(gone.cancelled, true)
  const booking = normalizeJourney(directItinerary({ ticket: 'https://www.eurostar.com/book' }))
  assert.equal(booking.bookingUrl, 'https://www.eurostar.com/book')
  assert.equal(normalizeJourney(directItinerary({ ticket: 'javascript:alert(1)' })).bookingUrl, undefined)
})

test('no trains found is an empty list; bad stations and dates are refused', async () => {
  mockFetch(() => ok(planResponse([])))
  const r = await call(`/api/live/trains/journeys?from=a1&to=b2`)
  assert.deepEqual(r.json.data.journeys, [])
  assert.equal((await call('/api/live/trains/journeys?from=a1&to=a1')).status, 400)
  assert.equal((await call('/api/live/trains/journeys?from=a1&to=b2&time=2020-01-01T08:00')).status, 400)
  assert.equal((await call('/api/live/trains/journeys?from=a1&to=b2&time=2099-01-01T08:00')).status, 400)
  assert.equal((await call('/api/live/trains/journeys?from=a1&to=b2&time=tomorrow')).status, 400)
})

test('journey status: refreshed by id, or found again by its trains when that fails', async () => {
  const dep = new Date(Date.now() + 3600_000).toISOString().replace(/\.\d+Z$/, 'Z')
  mockFetch((url) => (url.includes('refresh-itinerary') ? ok(directItinerary({ realTime: true, dep: '2026-10-06T06:43:00Z', schedDep: '2026-10-06T06:25:00Z' })) : ok(planResponse([]))))
  let r = await call(`/api/live/trains/status?id=itin-direct-1&from=${encodeURIComponent(PARIS[1])}&to=${encodeURIComponent(AMS[1])}&dep=${dep}`)
  assert.equal(r.json.data.journey.departure.expected, '2026-10-06T06:43:00Z')
  clearCache()
  mockFetch((url) => (url.includes('refresh-itinerary') ? status(404) : ok(planResponse([transferItinerary(), directItinerary({ tripId: 'trip-x' })]))))
  r = await call(`/api/live/trains/status?id=itin-old&from=${encodeURIComponent(PARIS[1])}&to=${encodeURIComponent(AMS[1])}&dep=${dep}&trips=trip-x`)
  assert.equal(r.status, 200)
  assert.equal(r.json.data.journey.legs[0].tripId, 'trip-x')
  clearCache()
  mockFetch(() => status(503))
  r = await call(`/api/live/trains/status?id=itin-old`)
  assert.equal(r.json.ok, false)
  assert.equal(r.json.error.code, 'unavailable')
})

// ----- Validation -----

test('coordinates are rounded and bounded to Europe; dates are bounded', () => {
  assert.deepEqual(coords('48.858372', '2.294481'), { lat: 48.858, lng: 2.294 })
  assert.throws(() => coords(91, 0))
  assert.throws(() => coords(35.6, 139.7))
  const now = Date.parse('2026-10-05T12:00:00Z')
  assert.equal(when('2026-10-06T08:30', { now }), '2026-10-06T08:30')
  assert.equal(when('2026-10-06T08:30:00+02:00', { now }), '2026-10-06T08:30:00+02:00')
  assert.throws(() => when('2026-10-01T08:30', { now }))
  assert.throws(() => when('2027-10-01T08:30', { now }))
})
