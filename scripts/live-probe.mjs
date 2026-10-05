import * as rail from '../server/live/providers/transitous.js'
const out = (label, v) => console.log(`\n=== ${label}\n` + JSON.stringify(v).slice(0, 2500))
const pick = async (q, lat, lng) => (await rail.searchStations(q, { lat, lng }))
try {
  const b = await pick('Berlin Hbf', 52.5, 13.4); out('berlin', b.map((s) => [s.name, s.area]))
  const h = await pick('Hamburg Hbf', 53.6, 10); out('hamburg', h.map((s) => [s.name, s.area]))
  const now = await rail.searchJourneys({ from: b[0].id, to: h[0].id, windowMin: 120 })
  out('berlin-hamburg now', now.journeys.map((x) => ({ dep: x.departure, arr: x.arrival, rt: x.realtime, c: x.cancelled, legs: x.legs.map((l) => [l.service, l.operator, l.realtime, l.from.track, l.from.expected, l.alerts]) })))
  const m = await pick('München Hbf', 48.1, 11.6); const w = await pick('Wien Hbf', 48.2, 16.4)
  out('munich/vienna', [m[0]?.name, w[0]?.name])
  const mw = await rail.searchJourneys({ from: m[0].id, to: w[0].id, windowMin: 180 })
  out('munich-vienna now', mw.journeys.map((x) => ({ dep: x.departure, rt: x.realtime, c: x.cancelled, legs: x.legs.map((l) => [l.service, l.realtime, l.from.track, l.from.expected]) })))
  const p = await pick('Paris', 48.85, 2.35); out('paris plain', p.map((s) => [s.name, s.area]))
  const a = await pick('Amsterdam', 52.37, 4.9); out('amsterdam plain', a.map((s) => [s.name, s.area]))
  const ro = await pick('Rome', 41.9, 12.5); out('rome plain', ro.map((s) => [s.name, s.area]))
} catch (e) { console.log('PROBE ERROR', e.code, e.status, e.message, e.stack) }
