import * as rail from '../server/live/providers/transitous.js'
import { cities, cityById } from '../src/data/cities.js'
import { stationQuery } from '../src/data/stations.js'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const km = (a, b) => {
  const r = Math.PI / 180
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}
const jobs = cities.map((c) => [c.id, null])
jobs.push(['paris', 'amsterdam'], ['paris', 'lyon'], ['paris', 'strasbourg'], ['paris', 'chartres'], ['london', 'paris'], ['london', 'edinburgh'])
for (const [id, toward] of jobs) {
  const c = cityById[id]
  const q = stationQuery(id, toward)
  if (!q) { console.log(`${id}: no rail`); continue }
  try {
    const list = await rail.searchStations(q, { lat: Math.round(c.lat * 10) / 10, lng: Math.round(c.lng * 10) / 10 })
    const hit = list.find((s) => km(s, c) < 25)
    console.log(`${id}${toward ? '>' + toward : ''}: q="${q}" -> ${hit ? `${hit.name} (${km(hit, c).toFixed(1)} km)` : 'MISSING'} | top: ${list.slice(0, 3).map((s) => s.name).join(' / ')}`)
  } catch (e) {
    console.log(`${id}: ERROR ${e.code}`)
  }
  await sleep(400)
}
