// Input checks for the live data gateway (api/live.js). Everything a browser sends is checked and
// bounded here before any provider is called, so the gateway can't be used as an open proxy.
// Each parser returns the clean value, or throws a BadInput with a message safe to show.

export class BadInput extends Error {
  constructor(message) {
    super(message)
    this.code = 'bad_input'
  }
}

// Europe, generously (Canaries and Iceland to the Urals' edge). Searches outside it are refused.
export const EUROPE = { minLat: 27, maxLat: 72, minLng: -32, maxLng: 45 }

const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)

// Coordinates are rounded before use: 3 decimals is ~110 m, plenty for "nearby", and it keeps precise
// positions out of caches and logs, and lets nearby searches share cached results.
export function coords(lat, lng, { decimals = 3 } = {}) {
  const a = num(lat)
  const b = num(lng)
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new BadInput('Coordinates are missing or not numbers.')
  if (a < EUROPE.minLat || a > EUROPE.maxLat || b < EUROPE.minLng || b > EUROPE.maxLng) throw new BadInput('That location is outside Europe.')
  const f = 10 ** decimals
  return { lat: Math.round(a * f) / f, lng: Math.round(b * f) / f }
}

export function intIn(v, min, max, fallback) {
  if (v == null || v === '') return fallback
  const n = num(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new BadInput(`Expected a whole number from ${min} to ${max}.`)
  return n
}

// Free text (a name, a station): trimmed, control characters removed, length-bounded.
export function text(v, { min = 2, max = 80, required = true } = {}) {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (!s) {
    if (required) throw new BadInput('Search text is missing.')
    return ''
  }
  if (s.length < min) throw new BadInput(`Type at least ${min} characters.`)
  return s.slice(0, max)
}

export function oneOf(v, list, fallback) {
  if (v == null || v === '') return fallback
  if (!list.includes(v)) throw new BadInput('Unknown option.')
  return v
}

export function bool(v) {
  return v === true || v === 'true' || v === '1'
}

// Provider ids we pass back to a provider. Only safe characters, never a URL.
export function providerId(v, { max = 200 } = {}) {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s || s.length > max || !/^[A-Za-z0-9_.:|\-]+$/.test(s)) throw new BadInput('That id isn’t valid.')
  return s
}

// An itinerary id from the rail provider: opaque, but bounded and printable, never a URL.
export function opaqueId(v, { max = 2000 } = {}) {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s || s.length > max || /[\s<>"'`\\]/.test(s) || /^[a-z]+:\/\//i.test(s)) throw new BadInput('That id isn’t valid.')
  return s
}

const DAY = 86_400_000

// A date-time to search from: 'YYYY-MM-DDTHH:MM' (local to the station) or an ISO string with a zone.
// Bounded to yesterday … `aheadDays` from now, since timetables don't reach further.
export function when(v, { aheadDays = 180, now = Date.now() } = {}) {
  if (v == null || v === '') return null
  const s = String(v)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.test(s)) throw new BadInput('Dates look like 2026-10-06T08:30.')
  const t = Date.parse(/Z|[+-]\d{2}:\d{2}$/.test(s) ? s : `${s}Z`)
  if (!Number.isFinite(t)) throw new BadInput('That date doesn’t exist.')
  if (t < now - 1.5 * DAY) throw new BadInput('That date is in the past.')
  if (t > now + aheadDays * DAY) throw new BadInput(`Timetables only go about ${aheadDays} days ahead.`)
  return s
}
