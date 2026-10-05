import * as rail from '../server/live/providers/transitous.js'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const tries = [['Athens', 38.0, 23.7], ['Athina', 38.0, 23.7], ['Larissa', 38.0, 23.7], ['Athens Larissa', 38.0, 23.7], ['Edinburgh', 56.0, -3.2], ['Edinburgh Waverley', 56.0, -3.2], ['Waverley', 56.0, -3.2]]
for (const [q, lat, lng] of tries) {
  try {
    const list = await rail.searchStations(q, { lat, lng })
    console.log(`${q}: ${list.slice(0, 5).map((s) => `${s.name} [${s.lat.toFixed(3)},${s.lng.toFixed(3)} ${(s.modes || []).join('+')}]`).join(' / ')}`)
  } catch (e) { console.log(`${q}: ERROR ${e.code}`) }
  await sleep(400)
}
