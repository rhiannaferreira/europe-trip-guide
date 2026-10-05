// One structured line per gateway request, readable in Vercel's function logs:
//   {"live":"places/search","provider":"geoapify","ms":312,"outcome":"ok","cache":"miss"}
// Never logged: API keys, request URLs (they can carry keys), raw provider errors, IP addresses, or
// precise coordinates (at most a ~1 km grid cell, and only when it helps).

export function logLive(fields) {
  const safe = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v
    else safe[k] = String(v).slice(0, 80)
  }
  // console.warn for problems so they stand out in the Vercel log view.
  const line = JSON.stringify({ live: safe.route, ...safe, route: undefined })
  if (fields.outcome && fields.outcome !== 'ok') console.warn(line)
  else console.log(line)
}

// A coarse cell (~1 km) for logs, when location helps diagnose a problem.
export const coarse = (p) => (p ? `${p.lat.toFixed(2)},${p.lng.toFixed(2)}` : undefined)
