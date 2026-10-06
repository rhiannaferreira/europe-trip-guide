// Turns trips, days and train journeys into GeoJSON for the map. Pure functions (no MapLibre), tested in
// map.test.js.
import { arc, collection, line, point } from './mapUtils.js'

const hopKey = (a, b) => `${a}>${b}`

// The journey's station-to-station path: origin, each change, destination (from the saved legs).
export function journeyStops(journey) {
  if (!journey) return []
  const out = []
  const push = (s, role) => {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return
    const last = out[out.length - 1]
    if (last && last.lat === s.lat && last.lng === s.lng) return
    out.push({ name: s.name, lat: s.lat, lng: s.lng, role })
  }
  const legs = journey.legs || []
  if (legs.length) {
    legs.forEach((l, i) => {
      push(l.from, i === 0 ? 'origin' : 'change')
      if (i === legs.length - 1) push(l.to, 'destination')
    })
  } else {
    push(journey.origin, 'origin')
    push(journey.destination, 'destination')
  }
  if (out.length) {
    out[0].role = 'origin'
    out[out.length - 1].role = 'destination'
  }
  return out
}

// One line per hop between trip cities, in order. A hop with a saved train follows its real stations.
//   properties: { hop, from, to, mode, minutes, estimated, journey (true when a real train is saved),
//                 realtime, selected }
export function tripRouteData(routeCities, legs = [], { journeys = {}, selectedHop = null } = {}) {
  const lines = []
  for (let i = 1; i < routeCities.length; i++) {
    const from = routeCities[i - 1]
    const to = routeCities[i]
    const leg = legs[i - 1] || {}
    const j = journeys[hopKey(from.id, to.id)]
    const stops = journeyStops(j)
    let coords
    if (stops.length >= 2) {
      // City → first station → ... → last station → city, each step gently curved.
      const chain = [from, ...stops, to]
      coords = []
      for (let k = 1; k < chain.length; k++) {
        const seg = arc(chain[k - 1], chain[k], { bend: 0.06, steps: 12 })
        coords.push(...(k === 1 ? seg : seg.slice(1)))
      }
    } else {
      coords = arc(from, to)
    }
    lines.push(
      line(coords, {
        hop: i - 1,
        from: from.name,
        to: to.name,
        mode: j ? 'train' : leg.mode || 'train',
        minutes: j?.durationMin ?? leg.minutes ?? null,
        estimated: j ? false : Boolean(leg.estimated),
        journey: Boolean(j),
        selected: selectedHop === i - 1,
      }),
    )
  }
  return collection(lines)
}

// Stations of saved trains: only for the selected hop, or for every hop when `all` (zoomed in on a trip).
export function stationData(routeCities, { journeys = {}, selectedHop = null, all = false } = {}) {
  const features = []
  for (let i = 1; i < routeCities.length; i++) {
    if (!all && selectedHop !== i - 1) continue
    const j = journeys[hopKey(routeCities[i - 1].id, routeCities[i].id)]
    for (const s of journeyStops(j)) features.push(point(s.lng, s.lat, { name: s.name, role: s.role, hop: i - 1 }))
  }
  return collection(features)
}

// Trip cities, numbered in trip order (a city visited twice keeps its first number), plus the others.
//   properties: { id, name, stop (1-based, 0 if not in the trip), gem, major, selected, current, label }
export function cityData(cities, { routeCities = [], selectedId = null, currentId = null } = {}) {
  const order = new Map()
  routeCities.forEach((c, i) => {
    if (!order.has(c.id)) order.set(c.id, i + 1)
  })
  return collection(
    cities.map((c) => {
      const stop = order.get(c.id) || 0
      return point(
        c.lng,
        c.lat,
        {
          id: c.id,
          name: c.name,
          stop,
          gem: Boolean(c.hiddenGem),
          major: c.size === 'major',
          selected: c.id === selectedId,
          current: c.id === currentId,
          // Lower draws (and keeps its label) first when labels collide.
          rank: c.id === selectedId ? 0 : stop ? 1 : c.size === 'major' ? 2 : c.hiddenGem ? 4 : 3,
        },
        undefined,
      )
    }),
  )
}

// A day's stops in order, joined by a line. states: { [placeId]: 'done'|'skipped'|'next'|... } (Travel Mode).
export function dayData(places, { states = {}, selectedId = null } = {}) {
  const stops = places.filter((p) => p && Number.isFinite(p.lat))
  const pts = stops.map((p, i) => point(p.lng, p.lat, { id: p.id, n: i + 1, name: p.name, state: states[p.id] || '', selected: p.id === selectedId }))
  const walk = stops.filter((p) => states[p.id] !== 'skipped')
  const lines = []
  for (let i = 1; i < walk.length; i++) {
    const done = states[walk[i].id] === 'done' && states[walk[i - 1].id] === 'done'
    lines.push(line(arc(walk[i - 1], walk[i], { bend: 0.08, steps: 10 }), { done }))
  }
  return { stops: collection(pts), line: collection(lines) }
}
