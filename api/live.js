// Vercel serverless function: EuroWander's live data gateway. One function for every live route (the
// Hobby plan limits how many functions a deployment can have); vercel.json maps /api/live/<route> here.
//
//   GET /api/live/health                                     → what's switched on (no secrets)
//   GET /api/live/places/search?lat&lng&radius&kind&cuisine&diet&name&limit
//   GET /api/live/places/details?id                          → fresh details for a saved live place
//   GET /api/live/places/geocode?q&lat&lng                   → where a named landmark is
//   GET /api/live/places/at?lat&lng                          → what's at a tapped map point
//   GET /api/live/places/suggest?q&lat&lng                   → landmark suggestions while typing
//   GET /api/live/trains/stations?q&lat&lng                  → station autocomplete
//   GET /api/live/trains/journeys?from&to&time&arriveBy&maxTransfers&window&cursor
//   GET /api/live/trains/status?id&from&to&dep&trips         → latest times for one journey
//
// Every answer is { ok: true, data, meta: { provider, retrievedAt, cached, attribution } } or
// { ok: false, error: { code, message } }. Keys stay here (GEOAPIFY_API_KEY etc., never VITE_), inputs
// are validated and bounded (server/live/validate.js), visitors are rate-limited and each provider has
// a daily cap (server/live/limits.js). Provider errors are reduced to a few codes; nothing raw is passed on.
import { BadInput } from '../server/live/validate.js'
import { rateLimited } from '../server/live/limits.js'
import { coarse, logLive } from '../server/live/log.js'
import { health, ROUTES } from '../server/live/services.js'

const MESSAGES = {
  bad_input: 'That search isn’t valid.',
  rate_limited: 'Too many searches at once. Try again in a minute.',
  not_configured: 'Live data isn’t switched on for this site yet.',
  cap_reached: 'Live data has reached today’s limit. EuroWander’s own information is shown instead.',
  timeout: 'The live data service took too long to answer.',
  unavailable: 'The live data service is unavailable right now.',
  bad_response: 'The live data service sent something unexpected.',
  not_found: 'Nothing was found.',
  not_found_route: 'Unknown live data route.',
}
const STATUS = { bad_input: 400, rate_limited: 429, not_configured: 503, cap_reached: 503, timeout: 504, unavailable: 502, bad_response: 502, not_found: 404, not_found_route: 404 }

function send(res, status, body, { ttl = 0 } = {}) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  // Successful GETs are cached by the browser and by Vercel's CDN (shared by all visitors); errors never.
  res.setHeader('Cache-Control', status === 200 && ttl > 0 ? `public, max-age=${Math.min(ttl, 300)}, s-maxage=${ttl}, stale-while-revalidate=${Math.min(ttl, 600)}` : 'no-store')
  res.end(JSON.stringify(body))
}

function fail(res, code, message) {
  return send(res, STATUS[code] || 502, { ok: false, error: { code, message: message || MESSAGES[code] || MESSAGES.unavailable } })
}

export function routeOf(req) {
  const q = req.query || {}
  if (typeof q.route === 'string') return q.route
  const path = String(req.url || '').split('?')[0]
  const m = path.match(/\/api\/live\/?(.*)$/)
  return m ? m[1].replace(/\/+$/, '') : ''
}

function queryOf(req) {
  if (req.query && typeof req.query === 'object') return req.query
  const i = String(req.url || '').indexOf('?')
  return i < 0 ? {} : Object.fromEntries(new URLSearchParams(String(req.url).slice(i + 1)))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 'bad_input', 'Only GET requests are accepted.')
  const route = routeOf(req)
  if (route === 'health') return send(res, 200, { ok: true, data: health() }, { ttl: 60 })
  const def = Object.hasOwn(ROUTES, route) ? ROUTES[route] : null
  if (!def) return fail(res, 'not_found_route')

  const ip = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const start = Date.now()
  const q = queryOf(req)
  if (rateLimited(def.bucket, ip)) {
    logLive({ route, provider: def.provider.id, outcome: 'rate_limited' })
    return fail(res, 'rate_limited')
  }
  try {
    const { data, ttl, cached } = await def.run(q)
    logLive({ route, provider: def.provider.id, ms: Date.now() - start, outcome: 'ok', cache: cached ? 'hit' : 'miss' })
    const attribution = def.provider.mod.ATTRIBUTION
    return send(res, 200, { ok: true, data, meta: { provider: def.provider.id, retrievedAt: new Date().toISOString(), cached, attribution } }, { ttl })
  } catch (e) {
    const code = e instanceof BadInput ? 'bad_input' : e?.code && STATUS[e.code] ? e.code : 'unavailable'
    logLive({ route, provider: def.provider.id, ms: Date.now() - start, outcome: code, status: e?.status, area: route.startsWith('places') && q.lat ? coarse({ lat: Number(q.lat), lng: Number(q.lng) }) : undefined })
    if (code === 'unavailable' && !(e?.code)) console.error('live: unexpected error', route, e?.name)
    return fail(res, code, e instanceof BadInput ? e.message : undefined)
  }
}
