import * as rail from '../server/live/providers/transitous.js'
const out = (label, v) => console.log(`\n=== ${label}\n` + JSON.stringify(v, null, 1).slice(0, 6000))
const raw = async (path) => { const r = await fetch('https://api.transitous.org' + path, { headers: { 'user-agent': 'EuroWander/1.0 (+https://eurowander.vercel.app; probe)' } }); const t = await r.text(); console.log(`\n=== RAW ${r.status} ${path}\n` + t.slice(0, 5000)); try { return JSON.parse(t) } catch { return null } }
try {
  await raw('/api/v1/geocode?text=Paris%20Gare%20du%20Nord&type=STOP&numResults=3&language=en')
  const paris = await rail.searchStations('Paris Nord')
  out('stations Paris Nord', paris)
  const ams = await rail.searchStations('Amsterdam Centraal')
  out('stations Amsterdam', ams)
  const time = new Date(Date.now() + 26 * 3600e3).toISOString().slice(0, 13) + ':00:00Z'
  const p = await raw(`/api/v6/plan?fromPlace=${encodeURIComponent(paris[0].id)}&toPlace=${encodeURIComponent(ams[0].id)}&time=${time}&transitModes=RAIL&searchWindow=10800&numItineraries=4&detailedLegs=false&language=en`)
  const j = await rail.searchJourneys({ from: paris[0].id, to: ams[0].id, time, windowMin: 180 })
  out('journeys', j)
  const now = await rail.searchJourneys({ from: (await rail.searchStations('Berlin Hbf'))[0].id, to: (await rail.searchStations('Hamburg Hbf'))[0].id, windowMin: 120 })
  out('berlin-hamburg now (realtime?)', now.journeys.map((x) => ({ dep: x.departure, rt: x.realtime, legs: x.legs.map((l) => [l.service, l.operator, l.realtime, l.from.track]) })))
  if (now.journeys[0]?.id) {
    const s = await rail.journeyStatus({ id: now.journeys[0].id })
    out('status via refresh', { dep: s.departure, rt: s.realtime })
  }
  const rome = await rail.searchStations('Roma Termini'); const fl = await rail.searchStations('Firenze Santa Maria Novella')
  out('rome/florence', { rome: rome.slice(0,2), fl: fl.slice(0,2) })
  const it = await rail.searchJourneys({ from: rome[0].id, to: fl[0].id, time, windowMin: 120 })
  out('rome-florence', it.journeys.slice(0,2))
} catch (e) { console.log('PROBE ERROR', e.code, e.status, e.message) }
