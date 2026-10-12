// Tripadvisor rating enrichment: matching our places to Tripadvisor listings, and the gateway route
// that fetches a rating only for an opened place, never caches it, and never shows an unsure match.
import { test, afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/live.js'
import { clearCache } from './services.js'
import { resetLimits } from './limits.js'
import { resetSearchSlot, normalizeLocation } from './providers/tripadvisor.js'
import { bestMatch, confirm, nameSimilarity } from './match.js'

let ipN = 0
function call(path) {
  const res = { statusCode: 0, headers: {}, body: '' }
  res.status = (s) => ((res.statusCode = s), res)
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v)
  res.end = (b) => (res.body = b)
  const [p, qs = ''] = path.split('?')
  const query = { route: p.replace(/^\/api\/live\//, ''), ...Object.fromEntries(new URLSearchParams(qs)) }
  return handler({ method: 'GET', url: path, query, headers: { 'x-forwarded-for': `10.9.0.${++ipN % 250}` } }, res).then(() => ({ status: res.statusCode, json: JSON.parse(res.body), headers: res.headers, body: res.body }))
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
const notFound = { ok: false, status: 404, json: async () => ({ detail: 'Not Found' }) }

// Roscioli, Rome (our point) and Tripadvisor-shaped answers.
const ROSCIOLI = { name: 'Roscioli Salumeria con Cucina', lat: 41.89386, lng: 12.47358 }
const cand = (id, name, lat, lng, km = 0.01) => ({ location: { id, names: [{ language: 'en', primary: true, value: name }], coordinates: { latitude: lat, longitude: lng } }, distance_kilometers: km })
const details = (over = {}) => ({
  id: 1006472,
  names: [{ language: 'en', primary: true, value: 'Roscioli Salumeria con Cucina' }],
  coordinates: { latitude: 41.89389, longitude: 12.47361 },
  traveler_ratings: { overall: { rating: 4.5, count: 6789, icon_url: 'https://static.tacdn.com/img2/ratings/traveler/4.5.svg' } },
  rankings: [{ display_text: '#25 of 12,345 Restaurants in Rome' }],
  urls: { tripadvisor: { main: 'https://www.tripadvisor.com/Restaurant_Review-g187791-d1006472', write_review: 'https://www.tripadvisor.com/UserReview-g187791-d1006472', photos: 'https://www.tripadvisor.com/Restaurant_Review-g187791-d1006472#photos' } },
  photos: { total_count: 2400 },
  status: { value: 'OPEN' },
  ...over,
})
const q = (p, extra = '') => `/api/live/ratings/place?name=${encodeURIComponent(p.name)}&lat=${p.lat}&lng=${p.lng}&cat=food${extra}`

beforeEach(() => {
  clearCache()
  resetLimits()
  resetSearchSlot()
  process.env.TRIPADVISOR_API_KEY = 'ta-test-key'
})
afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.TRIPADVISOR_API_KEY
  delete process.env.LIVE_DAILY_CAP_TRIPADVISOR
})

test('names: accents, punctuation and words like Ristorante are ignored; different places stay apart', () => {
  assert.equal(nameSimilarity('Café Central', 'Cafe Central'), 1)
  assert.equal(nameSimilarity('Ristorante Da Enzo', 'Da Enzo al 29'), nameSimilarity('Da Enzo al 29', 'Ristorante Da Enzo'))
  assert.ok(nameSimilarity('Roscioli', 'Roscioli Salumeria con Cucina') >= 0.85)
  assert.ok(nameSimilarity('Pantheon', 'Pantheon') === 1)
  assert.ok(nameSimilarity('Armando al Pantheon', 'Pantheon') < 0.9)
  assert.ok(nameSimilarity('Trattoria Monti', 'Pizzeria da Baffetto') < 0.4)
})

test('matching: same name next door is high; a different name next door, or two equal fits, is no match', () => {
  const m = bestMatch(ROSCIOLI, [{ id: 1, names: ['Roscioli Salumeria con Cucina'], lat: 41.89389, lng: 12.47361 }])
  assert.equal(m.matched, true)
  assert.equal(m.level, 'high')
  assert.ok(m.confidence >= 0.85)
  assert.match(m.reason, /name 100% alike/)
  const other = bestMatch(ROSCIOLI, [{ id: 2, names: ['Antico Forno Roscioli'], lat: 41.8935, lng: 12.4731 }, { id: 3, names: ['Bar del Fico'], lat: 41.8939, lng: 12.4736 }])
  assert.ok(!other.matched || other.providerId === 2)
  assert.equal(bestMatch(ROSCIOLI, [{ id: 3, names: ['Bar del Fico'], lat: 41.89386, lng: 12.47358 }]).matched, false)
  const twins = bestMatch({ name: 'Café Central', lat: 48.2104, lng: 16.3655 }, [
    { id: 4, names: ['Cafe Central'], lat: 48.2104, lng: 16.3656 },
    { id: 5, names: ['Café Central'], lat: 48.2105, lng: 16.3655 },
  ])
  assert.equal(twins.matched, false)
  assert.match(twins.reason, /two listings/)
  // Same name, wrong part of town: never.
  assert.equal(bestMatch({ name: 'Café Central', lat: 48.2104, lng: 16.3655 }, [{ id: 6, names: ['Café Central'], lat: 48.2204, lng: 16.3955 }]).matched, false)
  assert.equal(bestMatch(ROSCIOLI, []).matched, false)
})

test('confirm: the fresh details must still describe our place', () => {
  const d = normalizeLocation(details())
  assert.equal(confirm(ROSCIOLI, d, 'high'), true)
  assert.equal(confirm(ROSCIOLI, normalizeLocation(details({ coordinates: { latitude: 41.91, longitude: 12.49 } })), 'high'), false)
  assert.equal(confirm(ROSCIOLI, normalizeLocation(details({ names: [{ value: 'Some Hotel', primary: true }] })), 'high'), false)
})

test('a rated place: one small search, fresh details, Tripadvisor links, never cached, key never sent back', async () => {
  mockFetch((url) => (url.includes('/catalog/locations/nearby') ? ok({ data: [cand(1006472, 'Roscioli Salumeria con Cucina', 41.89389, 12.47361)] }) : ok(details())))
  const r = await call(q(ROSCIOLI))
  assert.equal(r.status, 200)
  assert.equal(r.headers['cache-control'], 'no-store')
  assert.equal(r.json.data.status, 'rated')
  const rating = r.json.data.rating
  assert.equal(rating.rating, 4.5)
  assert.equal(rating.reviewCount, 6789)
  assert.equal(rating.ranking, '#25 of 12,345 Restaurants in Rome')
  assert.match(rating.url, /^https:\/\/www\.tripadvisor\.com\//)
  assert.match(rating.writeReviewUrl, /UserReview/)
  assert.equal(rating.names, undefined)
  const search = new URL(calls[0].url)
  assert.equal(search.searchParams.get('size'), '3')
  assert.equal(search.searchParams.get('category'), 'RESTAURANT')
  assert.equal(search.searchParams.get('sort'), 'distance,asc')
  assert.equal(calls[0].init.headers['X-API-Key'], 'ta-test-key')
  assert.ok(!r.body.includes('ta-test-key'))
  // Opening it again: the match is remembered (no search), the rating is fetched fresh.
  const again = await call(q(ROSCIOLI))
  assert.equal(again.json.data.status, 'rated')
  assert.equal(calls.length, 3)
  assert.match(calls[2].url, /\/locations\/1006472\?/)
})

test('no confident match: says so, and does not fetch details', async () => {
  mockFetch(() => ok({ data: [cand(9, 'Bar del Fico', 41.89386, 12.47358)] }))
  const r = await call(q(ROSCIOLI))
  assert.equal(r.json.data.status, 'no_match')
  assert.equal(r.json.data.rating, undefined)
  assert.equal(calls.length, 1)
  // Remembered: a second look costs nothing.
  await call(q(ROSCIOLI))
  assert.equal(calls.length, 1)
})

test('listed in the catalog but not available to this account (allowlist): no rating, no error', async () => {
  mockFetch((url) => (url.includes('/catalog/') ? ok({ data: [cand(1006472, 'Roscioli Salumeria con Cucina', 41.89389, 12.47361)] }) : notFound))
  const r = await call(q(ROSCIOLI))
  assert.equal(r.status, 200)
  assert.equal(r.json.data.status, 'not_available')
})

test('a remembered ID from the browser skips the search, and is still checked against our place', async () => {
  mockFetch(() => ok(details()))
  const r = await call(q(ROSCIOLI, '&ta=1006472'))
  assert.equal(r.json.data.status, 'rated')
  assert.equal(calls.length, 1)
  mockFetch(() => ok(details({ names: [{ value: 'Hotel Somewhere Else', primary: true }], coordinates: { latitude: 41.95, longitude: 12.5 } })))
  const wrong = await call(q(ROSCIOLI, '&ta=1006472'))
  assert.equal(wrong.json.data.status, 'no_match')
})

test('off without a key, capped per day, and inputs checked', async () => {
  delete process.env.TRIPADVISOR_API_KEY
  assert.equal((await call(q(ROSCIOLI))).json.error.code, 'not_configured')
  process.env.TRIPADVISOR_API_KEY = 'ta-test-key'
  process.env.LIVE_DAILY_CAP_TRIPADVISOR = '0'
  mockFetch(() => ok({ data: [] }))
  assert.equal((await call(q(ROSCIOLI))).json.error.code, 'cap_reached')
  assert.equal(calls.length, 0)
  delete process.env.LIVE_DAILY_CAP_TRIPADVISOR
  assert.equal((await call('/api/live/ratings/place?name=Roscioli&lat=40.7&lng=-74')).status, 400)
  assert.equal((await call('/api/live/ratings/place?lat=41.9&lng=12.5')).status, 400)
})

test('health says whether ratings are on, without the key', async () => {
  const r = await call('/api/live/health')
  assert.equal(r.json.data.ratings.enabled, true)
  assert.ok(!r.body.includes('ta-test-key'))
})
