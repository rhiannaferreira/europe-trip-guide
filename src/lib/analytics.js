// Product analytics for the trip builder. Only named events with small numbers or ids go out, never
// anything a person typed (trip names, notes, assistant messages).
//
// Events go to Vercel Web Analytics when it's switched on (VITE_VERCEL_ANALYTICS=1 at build time, and
// Web Analytics enabled for the Vercel project; custom events need a paid Vercel plan). Every event is
// also sent as a `eurowander:analytics` DOM event, so another tool can listen without code changes.
export const EVENTS = [
  'trip_builder_started',
  'trip_generated',
  'generated_trip_saved',
  'city_replaced',
  'route_optimized',
  'trip_shared',
  'assistant_used',
  // The EuroWander copilot. Only the action name and small counts go out, never what was typed.
  'chat_opened',
  'chat_message_sent',
  'chat_quick_action_used',
  'chat_place_saved',
  'chat_city_added',
  'chat_trip_change_proposed',
  'chat_trip_change_applied',
  'chat_error',
]
const allowed = new Set(EVENTS)

// Keeps numbers, booleans and short id-like strings ('rules', 'make_cheaper'); drops everything else.
export function cleanProps(props = {}) {
  const out = {}
  for (const [k, v] of Object.entries(props || {})) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string' && v.length <= 40 && /^[a-z0-9_-]+$/i.test(v)) out[k] = v
  }
  return out
}

export function track(name, props) {
  if (!allowed.has(name) || typeof window === 'undefined') return false
  const data = cleanProps(props)
  try {
    window.va?.('event', { name, data })
  } catch {
    // Analytics must never break the page.
  }
  try {
    window.dispatchEvent(new CustomEvent('eurowander:analytics', { detail: { name, data } }))
  } catch {
    // Old browsers without CustomEvent.
  }
  return true
}

// Loads Vercel's analytics script once, when it's switched on for this build.
export function setupAnalytics() {
  if (typeof window === 'undefined' || import.meta.env?.VITE_VERCEL_ANALYTICS !== '1' || import.meta.env?.VITE_PREVIEW) return
  window.va = window.va || ((...args) => (window.vaq = window.vaq || []).push(args))
  const s = document.createElement('script')
  s.defer = true
  s.src = '/_vercel/insights/script.js'
  document.head.appendChild(s)
}
