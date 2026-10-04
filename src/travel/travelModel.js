// Travel Mode's rules, with no React: is the trip happening, what's today in the destination's own time,
// today's schedule, what's next, free time, the travel-day split, nearby places and the day's summary.
// Everything reads the one saved trip (lib/tripModel.js); nothing here keeps a copy of it.
//
// Times: the trip has no times of its own. A place gets the start time the traveller set in Travel Mode
// (itinerary[n].times), otherwise a suggested one worked out from the day's order:
//   the day starts at 09:30 (09:00 before a train); after a train, 45 minutes after arriving
//   each visit lasts a typical time for its type (VISIT_MINUTES), then the walk to the next place
//   (straight line × 1.3 at 4.5 km/h, 10 to 60 minutes), rounded up to the next quarter hour
//   a suggested visit that would start between 12:30 and 14:00 waits an hour for lunch, unless the
//   place is itself somewhere to eat
// Suggested times are always labelled as suggestions. All times are the destination's local time.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById, places } from '../data/places.js'
import { isTime } from '../lib/tripModel.js'
import { tripLegs } from '../lib/trip.js'
import { buildDays } from '../utils/tripCalculations.js'
import { distanceKm } from '../utils/distance.js'

// ----- Time zones and clocks -----

export const deviceZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// The IANA zone for a city, from its country. Every country in the guide has one; a missing one falls back
// to the device's zone, flagged so the page can say so.
export function cityZone(cityId) {
  const tz = countryByCode[cityById[cityId]?.country]?.tz
  return tz ? { tz, known: true } : { tz: deviceZone(), known: false }
}

// The date ('YYYY-MM-DD') and minutes since midnight in a zone, at `now`.
export function clockIn(tz, now = new Date()) {
  const parts = {}
  for (const p of new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)) parts[p.type] = p.value
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) }
}

// "CEST", "BST", "GMT+3"
export function zoneAbbr(tz, now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

// Whether the device shows a different clock time from the destination right now.
export const differsFromDevice = (tz, now = new Date()) => {
  const a = clockIn(tz, now)
  const b = clockIn(deviceZone(), now)
  return a.date !== b.date || a.minutes !== b.minutes
}

export const toMinutes = (hm) => (isTime(hm) ? Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3)) : null)
export const hm = (m) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
// 45 → "45 min", 150 → "2 h 30 min"
export function inWords(m) {
  const mins = Math.max(0, Math.round(m))
  const h = Math.floor(mins / 60)
  const r = mins % 60
  if (!h) return `${r} min`
  return r ? `${h} h ${r} min` : `${h} h`
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const DAY_MS = 86400000
const isoDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

// ----- The trip's days and its status -----

// The trip's days (the same rules as planning mode: utils/tripCalculations.buildDays), each with its date
// as text and its city's zone.
export function travelDays(trip) {
  const stops = trip?.stops || []
  if (!stops.length) return []
  const legs = tripLegs(stops.map((s) => s.cityId))
  return buildDays({ startDate: trip.startDate, endDate: trip.endDate, stops, legs }).map((d) => ({ ...d, iso: ymd(d.date), zone: cityZone(d.cityId).tz }))
}

// Where the trip stands at `now`:
//   { status: 'empty' }                            no cities yet
//   { status: 'nodates', days: [] }                cities but no dates
//   { status: 'upcoming', days, daysUntil }        first day still ahead (in the first city's time)
//   { status: 'active', days, today }              today is a trip day (in that day's city's time)
//   { status: 'completed', days }                  last day over (in the last city's time)
// Each check uses the destination's own date, never the device's, so a traveller whose phone is still on
// home time sees the right day.
export function tripStatus(trip, now = new Date()) {
  if (!trip?.stops?.length) return { status: 'empty', days: [] }
  const days = travelDays(trip)
  if (!days.length) return { status: 'nodates', days }
  const first = days[0]
  const last = days[days.length - 1]
  const startToday = clockIn(first.zone, now).date
  if (startToday < first.iso) return { status: 'upcoming', days, daysUntil: isoDiff(startToday, first.iso) }
  if (clockIn(last.zone, now).date > last.iso) return { status: 'completed', days }
  const today = days.find((d) => clockIn(d.zone, now).date === d.iso) || days.find((d) => d.iso === startToday) || first
  return { status: 'active', days, today }
}

// ----- Today's schedule -----

export const VISIT_MINUTES = {
  museum: 120, gallery: 90, palace: 105, castle: 105, landmark: 75, church: 45, cathedral: 60, ruins: 90,
  market: 60, restaurant: 75, cafe: 40, tasting: 90, bar: 90, club: 120, pub: 75, biergarten: 75,
  park: 75, garden: 60, viewpoint: 40, walk: 60, beach: 120, neighbourhood: 75, shop: 60,
}
export const visitMinutes = (place) => VISIT_MINUTES[place?.type] || 75

const roundUp15 = (m) => Math.ceil(m / 15) * 15
const round5 = (m) => Math.round(m / 5) * 5

// Rough time to get from one place to the next: walking up to about 2 km, then public transport.
export function hopMinutes(a, b) {
  if (!a || !b) return 0
  const km = distanceKm(a, b) * 1.3
  const walk = (km / 4.5) * 60
  return Math.min(60, Math.max(10, round5(km <= 2.6 ? walk : 15 + km * 3)))
}
export const walkingMinutes = (km) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60))

const isFood = (p) => p?.category === 'food'
const OUTDOOR_TYPES = new Set(['park', 'garden', 'viewpoint', 'walk', 'beach', 'neighbourhood', 'market'])
export const isOutdoor = (p) => Boolean(p && (p.category === 'outdoors' || OUTDOOR_TYPES.has(p.type)))

// The day's entries, in order: places (and, on a travel day, the journey between the places before it and
// the ones after). `nowMin` (minutes since midnight in the day's city) marks each one's state; leave it null
// for a day that isn't today (preview, history).
//   { kind: 'place' | 'journey', id, place?, leg?, start, end, timeSource: 'set' | 'suggested' | 'train' | null,
//     state: 'done' | 'skipped' | 'current' | 'earlier' | 'upcoming', part: 'before' | 'after' | null }
export function daySchedule(trip, day, { nowMin = null } = {}) {
  const entry = trip?.itinerary?.[day.number] || { placeIds: [], note: '' }
  const ids = (entry.placeIds || []).filter((id) => placeById[id])
  const times = entry.times || {}
  const done = new Set(entry.done || [])
  const skipped = new Set(entry.skipped || [])
  const leg = day.leg || null
  const depart = leg ? toMinutes(entry.depart) : null
  const arrive = depart != null ? depart + leg.minutes : null
  const before = leg ? ids.filter((id) => placeById[id].cityId === leg.from.id) : []
  const after = ids.filter((id) => !before.includes(id))

  const lunch = []
  const run = (list, start, part) => {
    let cursor = start
    let ate = false
    return list.map((id, i) => {
      const place = placeById[id]
      let t = toMinutes(times[id])
      let source = 'set'
      if (t == null && cursor != null) {
        t = roundUp15(cursor)
        source = 'suggested'
        if (!ate && !isFood(place) && t >= 750 && t < 840) {
          lunch.push({ start: t, end: t + 60 })
          t += 60
          ate = true
        }
      } else if (t == null) source = null
      if (isFood(place) && t != null && t >= 690 && t < 870) ate = true
      const end = t == null ? null : t + visitMinutes(place)
      cursor = end == null ? null : end + hopMinutes(place, placeById[list[i + 1]])
      return { kind: 'place', id, place, start: t, end, timeSource: source, part }
    })
  }

  let entries
  if (leg) {
    const journey = { kind: 'journey', id: `journey-${day.number}`, leg, start: depart, end: arrive, timeSource: depart != null ? 'train' : null, part: null }
    entries = [...run(before, 540, 'before'), journey, ...run(after, arrive != null ? arrive + 45 : null, 'after')]
  } else {
    entries = run(after, 570, null)
    // Places the traveller timed out of order are shown in time order; untimed ones keep their place.
    if (entries.every((e) => e.start != null)) entries.sort((a, b) => a.start - b.start)
  }

  for (const e of entries) {
    if (e.kind === 'place' && done.has(e.id)) e.state = 'done'
    else if (e.kind === 'place' && skipped.has(e.id)) e.state = 'skipped'
    else if (nowMin == null || e.start == null) e.state = 'upcoming'
    else if (nowMin >= e.start && nowMin < e.end) e.state = 'current'
    else if (nowMin >= e.end) e.state = e.kind === 'journey' ? 'done' : 'earlier'
    else e.state = 'upcoming'
  }
  return { entries, lunch, depart, arrive, leg, note: entry.note || '' }
}

export function dayProgress(schedule) {
  const placesOnly = schedule.entries.filter((e) => e.kind === 'place')
  return {
    total: placesOnly.length,
    done: placesOnly.filter((e) => e.state === 'done').length,
    skipped: placesOnly.filter((e) => e.state === 'skipped').length,
  }
}

const OPEN_AFTER = 120

// What's next: the entry going on now, or the next one still to come.
//   { entry, inProgress, startsIn (minutes or null), open: { from, to } | null }
// `open` is set when nothing starts within two hours: the traveller has free time until `to` (null: the rest of the day).
export function nextUp(schedule, nowMin) {
  const live = schedule.entries.filter((e) => e.state === 'current' || e.state === 'upcoming')
  const current = live.find((e) => e.state === 'current')
  if (current) return { entry: current, inProgress: true, startsIn: 0, open: null }
  const next = live.find((e) => e.start == null || nowMin == null || e.start >= nowMin) || null
  const startsIn = next && next.start != null && nowMin != null ? next.start - nowMin : null
  const open = nowMin != null && (!next || (startsIn != null && startsIn >= OPEN_AFTER)) ? { from: nowMin, to: next?.start ?? null } : null
  return { entry: next, inProgress: false, startsIn, open }
}

// Free stretches of 90 minutes or more between timed plans, and the end of the day from late afternoon,
// from now on. Skipped and done places don't count as busy (done ones are over anyway).
export function freeTime(schedule, nowMin, { dayEnd = 1290 } = {}) {
  if (nowMin == null) return []
  const busy = schedule.entries.filter((e) => e.start != null && e.state !== 'skipped' && e.state !== 'done' && e.state !== 'earlier').sort((a, b) => a.start - b.start)
  const gaps = []
  let cursor = nowMin
  for (const e of busy) {
    if (e.start - cursor >= 90) gaps.push({ from: cursor, to: e.start, minutes: e.start - cursor })
    cursor = Math.max(cursor, e.end)
  }
  if (dayEnd - cursor >= 120 && cursor < dayEnd) gaps.push({ from: cursor, to: dayEnd, minutes: dayEnd - cursor, evening: true })
  return gaps
}

// ----- Nearby -----

// Kinds of place for the Nearby and Hungry? filters. Tests use the guide's own categories and types;
// opening hours aren't in the data, so nothing is filtered or sorted by them.
export const FINDERS = {
  all: { label: 'All', test: () => true },
  food: { label: 'Food', test: (p) => p.category === 'food' },
  sights: { label: 'Sights', test: (p) => p.category === 'history' || p.category === 'museums' },
  outdoors: { label: 'Outdoors', test: (p) => p.category === 'outdoors' },
  coffee: { label: 'Coffee', test: (p) => p.type === 'cafe' || (p.category === 'food' && p.type === 'market') },
  drinks: { label: 'Drinks', test: (p) => p.category === 'nightlife' || p.type === 'tasting' },
  breakfast: { label: 'Breakfast', test: (p) => p.category === 'food' && ['cafe', 'market', 'bakery'].includes(p.type) },
  lunch: { label: 'Lunch', test: (p) => p.category === 'food' && p.type !== 'tasting' },
  dinner: { label: 'Dinner', test: (p) => (p.category === 'food' && p.type !== 'market' && p.type !== 'cafe') || (p.category === 'nightlife' && p.type === 'neighbourhood') },
}

// Places near a point, closest first: [{ place, km, walk }]. `saved` places come first among equals, and
// with `budget` the $$$ ones count as a little further away.
export function placesNear(ref, { finder = 'all', radiusKm = 2, limit = 8, exclude = new Set(), saved = new Set(), budget = false, list = places } = {}) {
  if (!ref) return []
  const test = FINDERS[finder]?.test || FINDERS.all.test
  return list
    .filter((p) => !exclude.has(p.id) && test(p))
    .map((p) => ({ place: p, km: distanceKm(ref, p) }))
    .filter((x) => x.km <= radiusKm)
    .sort((a, b) => a.km + (budget && a.place.costLevel === 3 ? 0.4 : 0) - (saved.has(a.place.id) ? 0.05 : 0) - (b.km + (budget && b.place.costLevel === 3 ? 0.4 : 0) - (saved.has(b.place.id) ? 0.05 : 0)))
    .slice(0, limit)
    .map((x) => ({ ...x, walk: walkingMinutes(x.km), saved: saved.has(x.place.id) }))
}

// The reference point for Nearby: the traveller's position when they shared it, else the place going on now
// or next, else the last place of the day, else the city centre.
export function referencePoint({ position = null, schedule = null, cityId }) {
  if (position) return { lat: position.lat, lng: position.lng, kind: 'you', label: 'you' }
  const placesToday = (schedule?.entries || []).filter((e) => e.kind === 'place')
  const next = placesToday.find((e) => e.state === 'current') || placesToday.find((e) => e.state === 'upcoming') || placesToday[placesToday.length - 1]
  if (next) return { lat: next.place.lat, lng: next.place.lng, kind: 'activity', label: next.place.name }
  const c = cityById[cityId]
  return c ? { lat: c.lat, lng: c.lng, kind: 'city', label: `${c.name} centre` } : null
}

// "You saved something nearby": a saved place in today's city that isn't planned on any day, within
// about 15 minutes' walk of a stop still to come today (the next one first).
export function savedNearby(trip, schedule, cityId, { maxKm = 1.2 } = {}) {
  const planned = new Set(Object.values(trip?.itinerary || {}).flatMap((d) => d.placeIds || []))
  const saved = Object.entries(trip?.statuses || {})
    .filter(([id, s]) => s !== 'visited' && !planned.has(id) && placeById[id]?.cityId === cityId)
    .map(([id]) => placeById[id])
  const stops = schedule.entries.filter((e) => e.kind === 'place' && (e.state === 'current' || e.state === 'upcoming')).map((e) => e.place)
  let best = null
  for (const anchor of stops) {
    for (const p of saved) {
      const km = distanceKm(anchor, p)
      if (km <= maxKm && (!best || km < best.km)) best = { place: p, anchor, km, walk: walkingMinutes(km) }
    }
    if (best) break
  }
  return best
}

// ----- Directions -----

// A link to the device's maps app for walking or transit directions (Apple Maps on iPhone and iPad,
// Google Maps everywhere else). Eurowander never navigates itself.
export function isApple(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, touch = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints) {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1)
}
export function directionsUrl(place, { apple = isApple(), mode = 'walking' } = {}) {
  const ll = `${place.lat},${place.lng}`
  if (apple) return `https://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(place.name || '')}&dirflg=${mode === 'transit' ? 'r' : 'w'}`
  return `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=${mode}`
}

// ----- End of day, and tomorrow -----

// The day's summary once it's done (everything marked, or after 20:00 with something done):
// { visited, skipped, km } where km is the straight-line distance between the visited places, in order
// (a floor for the real walk), only when at least two were visited.
export function daySummary(schedule, nowMin) {
  const p = dayProgress(schedule)
  if (!p.total || nowMin == null) return null
  const settled = p.done + p.skipped === p.total
  if (!settled && !(nowMin >= 1200 && p.done > 0)) return null
  const visited = schedule.entries.filter((e) => e.state === 'done').map((e) => e.place)
  let km = 0
  for (let i = 1; i < visited.length; i++) km += distanceKm(visited[i - 1], visited[i])
  return { visited: p.done, skipped: p.skipped, remaining: p.total - p.done - p.skipped, km: visited.length >= 2 ? km : null }
}

export const dayCity = (day) => cityById[day.cityId]
export const flagOf = (cityId) => countryByCode[cityById[cityId]?.country]?.flag || ''
