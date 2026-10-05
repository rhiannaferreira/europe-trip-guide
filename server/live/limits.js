// Cost protection for the live data gateway:
//   - per-visitor rate limits (per IP, per minute), best effort per server instance
//   - a hard daily cap per provider, counted in Supabase when SUPABASE_SERVICE_ROLE_KEY is set (shared
//     by every instance), otherwise per instance. Only real provider calls count; cache hits are free.
// At the cap the gateway answers "temporarily unavailable" and the app shows its own data instead.

const WINDOW_MS = 60_000
const hits = new Map() // `${bucket}:${ip}` -> [timestamps]

export const RATE = { places: 40, suggest: 30, trains: 30, status: 60 }

export function rateLimited(bucket, ip, max = RATE[bucket] || 30, now = Date.now()) {
  const key = `${bucket}:${ip}`
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)
  list.push(now)
  hits.set(key, list)
  if (hits.size > 10_000) hits.clear()
  return list.length > max
}

export const resetLimits = () => {
  hits.clear()
  local.clear()
}

// Daily caps, overridable per provider (LIVE_DAILY_CAP_GEOAPIFY=2500 ...). Geoapify's free plan is
// 3,000 credits a day, so the default stops short of it.
const DEFAULT_CAPS = { geoapify: 2500, transitous: 3000 }
export const dailyCap = (provider) => {
  const v = Number(process.env[`LIVE_DAILY_CAP_${provider.toUpperCase()}`])
  return Number.isInteger(v) && v >= 0 ? v : DEFAULT_CAPS[provider] ?? 1000
}

const local = new Map() // `${provider}:${day}` -> count
const today = () => new Date().toISOString().slice(0, 10)

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}

// Counts one provider call and returns the day's total so far (including this one).
async function countCall(provider) {
  const sb = supabaseConfig()
  if (sb) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    try {
      const r = await fetch(`${sb.url}/rest/v1/rpc/live_usage_hit`, {
        method: 'POST',
        signal: controller.signal,
        headers: { apikey: sb.key, authorization: `Bearer ${sb.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_provider: provider }),
      })
      if (r.ok) {
        const n = await r.json()
        if (Number.isInteger(n)) return n
      }
    } catch {
      // Fall through to the per-instance count; never block a request because the counter is down.
    } finally {
      clearTimeout(timer)
    }
  }
  const key = `${provider}:${today()}`
  const n = (local.get(key) || 0) + 1
  local.set(key, n)
  if (local.size > 50) for (const k of local.keys()) if (!k.endsWith(today())) local.delete(k)
  return n
}

// True when this call may go ahead; false once the day's cap is reached.
export async function underDailyCap(provider) {
  const n = await countCall(provider)
  return n <= dailyCap(provider)
}
