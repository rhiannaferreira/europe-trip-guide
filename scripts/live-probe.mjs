import * as rail from '../server/live/providers/transitous.js'
const out = (label, v) => console.log(`\n=== ${label}\n` + JSON.stringify(v).slice(0, 3000))
try {
  const b = await rail.searchStations('Berlin Hbf'); out('berlin stations', b.map((s) => [s.name, s.id, s.area]))
  const h = await rail.searchStations('Hamburg Hbf'); out('hamburg stations', h.map((s) => [s.name, s.id]))
  const now = await rail.searchJourneys({ from: b[0].id, to: h[0].id, windowMin: 120 })
  out('berlin-hamburg now', now.journeys.map((x) => ({ dep: x.departure, arr: x.arrival, rt: x.realtime, legs: x.legs.map((l) => [l.service, l.operator, l.realtime, l.from.track, l.from.expected]) })))
  const nowAny = await fetch(`https://api.transitous.org/api/v6/plan?fromPlace=${encodeURIComponent(b[0].id)}&toPlace=${encodeURIComponent(h[0].id)}&detailedLegs=false`, { headers: { 'user-agent': 'EuroWander/1.0 probe' } }).then((r) => r.json())
  out('berlin-hamburg ANY modes', nowAny.itineraries?.map((i) => i.legs.map((l) => [l.mode, l.displayName, l.realTime])))
  const m = await rail.searchStations('München Hbf'); const w = await rail.searchStations('Wien Hbf')
  const mw = await rail.searchJourneys({ from: m[0].id, to: w[0].id, windowMin: 180 })
  out('munich-vienna now', mw.journeys.map((x) => ({ dep: x.departure, rt: x.realtime, c: x.cancelled, legs: x.legs.map((l) => [l.service, l.realtime, l.from.track, l.from.expected]) })))
  const p = await rail.searchStations('Paris Nord'); const a = await rail.searchStations('Amsterdam Centraal')
  const pa = await rail.searchJourneys({ from: p[0].id, to: a[0].id, windowMin: 180 })
  if (pa.journeys[0]) {
    try { const s = await rail.journeyStatus({ id: pa.journeys[0].id }); out('refresh ok', { dep: s.departure, arr: s.arrival, rt: s.realtime }) } catch (e) { out('refresh failed', [e.code, e.status]) }
    const r = await fetch(`https://api.transitous.org/api/v6/refresh-itinerary?itineraryId=${encodeURIComponent(pa.journeys[0].id)}`, { headers: { 'user-agent': 'EuroWander/1.0 probe' } }); out('refresh raw status', [r.status, (await r.text()).slice(0, 300)])
  }
  const s2 = await rail.searchStations('Lyon Part-Dieu'); const s3 = await rail.searchStations('Barcelona Sants'); out('lyon/bcn', [s2.slice(0,2), s3.slice(0,2)].map((l) => l.map((s) => [s.name, s.id])))
} catch (e) { console.log('PROBE ERROR', e.code, e.status, e.message, e.stack) }
