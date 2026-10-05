// The browser's only door to live data: EuroWander's own /api/live gateway. No provider URL or key is
// ever used in the browser. Identical requests in flight share one fetch, and answers are cached briefly
// in memory (the gateway's Cache-Control also lets the browser and Vercel's CDN reuse them).

export class LiveError extends Error {
  // code: 'offline' | 'not_configured' | 'cap_reached' | 'rate_limited' | 'timeout' | 'unavailable' | 'bad_input' | 'not_found'
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

// Words for each failure, written for travellers.
export const LIVE_ERROR_TEXT = {
  offline: 'You’re offline.',
  not_configured: 'Live data isn’t switched on yet.',
  cap_reached: 'Live data has reached today’s limit.',
  rate_limited: 'Too many searches at once. Try again in a minute.',
  timeout: 'The live service is slow to answer right now.',
  unavailable: 'Live data is temporarily unavailable.',
  bad_input: 'That search didn’t work.',
  not_found: 'Nothing was found.',
}

const inflight = new Map()
const memory = new Map() // url -> { at, body }
const MEMORY_MS = 60_000

export function liveUrl(route, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v))
  const s = qs.toString()
  return `/api/live/${route}${s ? `?${s}` : ''}`
}

// → { data, meta } or throws LiveError.
export async function liveGet(route, params = {}, { timeout = 15000, fresh = false } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new LiveError('offline')
  const url = liveUrl(route, params)
  const hit = memory.get(url)
  if (!fresh && hit && Date.now() - hit.at < MEMORY_MS) return hit.body
  if (inflight.has(url)) return inflight.get(url)
  const p = (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    let res
    try {
      res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' }, cache: fresh ? 'no-cache' : 'default' })
    } catch (e) {
      throw new LiveError(e?.name === 'AbortError' ? 'timeout' : 'unavailable')
    } finally {
      clearTimeout(timer)
    }
    let body = null
    try {
      body = await res.json()
    } catch {
      // Not our gateway (a static preview, say): treat as unavailable.
    }
    if (!body || typeof body !== 'object') throw new LiveError(res.status === 404 ? 'not_configured' : 'unavailable')
    if (!body.ok) throw new LiveError(body.error?.code || 'unavailable', body.error?.message)
    const out = { data: body.data, meta: body.meta || {} }
    memory.set(url, { at: Date.now(), body: out })
    if (memory.size > 200) memory.delete(memory.keys().next().value)
    return out
  })().finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

// Which live services are on (cached for the session).
let healthP = null
export function liveHealth() {
  healthP ||= liveGet('health', {}, { timeout: 6000 })
    .then((r) => r.data)
    .catch(() => {
      healthP = null
      return null
    })
  return healthP
}

export const __resetLiveHttp = () => {
  inflight.clear()
  memory.clear()
  healthP = null
}
