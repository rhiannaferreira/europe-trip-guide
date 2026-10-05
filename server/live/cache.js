// A small in-memory cache with expiry, plus request de-duplication, for the live data gateway.
//
// Serverless instances are short-lived and not shared, so this is a best-effort first layer. The main
// shared cache is Vercel's CDN: GET responses carry Cache-Control s-maxage (see api/live.js), and the
// browser rounds inputs so identical searches share one cached URL.

export function createCache({ max = 500 } = {}) {
  const store = new Map() // key -> { v, until }
  const inflight = new Map() // key -> promise

  const get = (key) => {
    const hit = store.get(key)
    if (!hit) return undefined
    if (Date.now() > hit.until) {
      store.delete(key)
      return undefined
    }
    // Refresh recency.
    store.delete(key)
    store.set(key, hit)
    return hit.v
  }
  const set = (key, v, ttlMs) => {
    if (!(ttlMs > 0)) return
    store.set(key, { v, until: Date.now() + ttlMs })
    while (store.size > max) store.delete(store.keys().next().value)
  }

  return {
    get,
    set,
    clear: () => {
      store.clear()
      inflight.clear()
    },
    // The cached value, or the one already being fetched, or a fresh fetch (cached for ttlMs).
    // Returns { value, cached: true|false }.
    async through(key, ttlMs, fetcher) {
      const hit = get(key)
      if (hit !== undefined) return { value: hit, cached: true }
      if (inflight.has(key)) return { value: await inflight.get(key), cached: true }
      const p = (async () => {
        const v = await fetcher()
        set(key, v, typeof ttlMs === 'function' ? ttlMs(v) : ttlMs)
        return v
      })().finally(() => inflight.delete(key))
      inflight.set(key, p)
      return { value: await p, cached: false }
    },
  }
}
