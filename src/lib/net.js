// Small helpers for the free, keyless sources the app reads (Wikipedia/Wikimedia Commons,
// OpenStreetMap's Overpass API and Open-Meteo). Every caller has a fallback, so a failed
// request only means the built-in data is shown.
import { readJSON, writeJSON } from './storage.js'

export class FetchError extends Error {
  constructor(message, { offline = false, status = 0 } = {}) {
    super(message)
    this.offline = offline
    this.status = status
  }
}

export async function fetchJSON(url, { timeout = 12000, init } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new FetchError('You appear to be offline', { offline: true })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) throw new FetchError(`Request failed (${res.status})`, { status: res.status })
    return await res.json()
  } catch (e) {
    if (e instanceof FetchError) throw e
    throw new FetchError(e.name === 'AbortError' ? 'The request took too long' : 'The request failed')
  } finally {
    clearTimeout(timer)
  }
}

// A cache in localStorage: one key per kind of data ("eurowander-cache-photos"...), entries expire.
// Oldest entries are dropped once there are more than `max`.
export function createCache(name, { ttlDays, max = 400 }) {
  const key = `eurowander-cache-${name}`
  const ttl = ttlDays * 86400000
  let store = null
  const load = () => (store ??= readJSON(key, {}) || {})
  return {
    get(id) {
      const hit = load()[id]
      if (!hit) return undefined
      if (Date.now() - hit.t > (hit.ttl ?? ttl)) return undefined
      return hit.v
    },
    set(id, value, ttlOverrideDays) {
      const s = load()
      s[id] = { t: Date.now(), v: value, ...(ttlOverrideDays ? { ttl: ttlOverrideDays * 86400000 } : {}) }
      const ids = Object.keys(s)
      if (ids.length > max) ids.sort((a, b) => s[a].t - s[b].t).slice(0, ids.length - max).forEach((k) => delete s[k])
      writeJSON(key, s)
    },
  }
}
