// The trip's saved shape, and bringing older or untrusted copies into it. No React here, so shared links,
// the account sync, the trip builder and the tests can all use it.
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'

export const VERSION = 3
export const DEFAULT_TRIP_NAME = 'My Europe trip'
export const STATUSES = ['saved', 'want', 'visited']

export const emptyTrip = () => ({
  version: VERSION,
  name: '',
  stops: [],
  startDate: '',
  endDate: '',
  statuses: {},
  itinerary: {},
  notes: { trip: '', cities: {} },
  journeys: {},
})

// Trip shape (also what's saved in localStorage under travel-app-trip):
//   {
//     version: 3,
//     name: '',                                   trip name for the printable view ('' shows the default)
//     stops: [{ cityId, auto, placeIds: [], days }],
//         in travel order. A stop can have no saved places (a city added on its own).
//         `auto` marks a stop created by saving a place; it goes away again when its last place is unsaved.
//         `days` is a whole number when the user set the stop's length with +/-, otherwise null (shared automatically).
//     startDate: 'YYYY-MM-DD' | '', endDate: 'YYYY-MM-DD' | '',
//     statuses: { [placeId]: 'saved' | 'want' | 'visited' },   one per saved place
//     itinerary: { [dayNumber]: { placeIds: [], note: '' } },  keyed by day number (1, 2, 3...) so moving the
//         start date keeps the plan. A place is on at most one day.
//         Optional, added by Travel Mode (only present when set):
//           times:   { [placeId]: 'HH:MM' }   a start time the traveller set, in the destination's local time
//           done:    [placeId]                 marked done while travelling
//           skipped: [placeId]                 skipped while travelling (still on the day, never deleted)
//           depart:  'HH:MM'                   the traveller's own departure time on a travel day
//     notes: { trip: '', cities: { [cityId]: '' } },
//     journeys: { ['fromCityId>toCityId']: journey },   a real train the traveller picked for a hop (a
//         compact copy of the timetable result, see services/live/trains.js journeySnapshot). Kept on this
//         device and in the account, never in share links.
//   }
//
const HM = /^([01]\d|2[0-3]):[0-5]\d$/
export const isTime = (v) => typeof v === 'string' && HM.test(v)

// A day's optional Travel Mode fields, kept only for places still on the day (and dropped when empty).
export function dayExtras(day, placeIds = day?.placeIds || []) {
  const on = new Set(placeIds)
  const out = {}
  const times = Object.fromEntries(Object.entries(day?.times || {}).filter(([id, v]) => on.has(id) && isTime(v)))
  if (Object.keys(times).length) out.times = times
  const done = [...new Set((Array.isArray(day?.done) ? day.done : []).filter((id) => on.has(id)))]
  if (done.length) out.done = done
  const skipped = [...new Set((Array.isArray(day?.skipped) ? day.skipped : []).filter((id) => on.has(id) && !done.includes(id)))]
  if (skipped.length) out.skipped = skipped
  if (isTime(day?.depart)) out.depart = day.depart
  return out
}

// Whether a day holds anything worth keeping.
export const dayHasContent = (day) => Boolean(day && ((day.placeIds || []).length || (day.note || '').trim() || isTime(day.depart)))

// A day with some places taken off (their times and done/skipped marks go with them).
export function dayWithout(day, placeIds) {
  const drop = new Set(placeIds)
  const kept = day.placeIds.filter((id) => !drop.has(id))
  return { placeIds: kept, note: day.note || '', ...dayExtras(day, kept) }
}

// A picked train, checked field by field (it comes back from storage and the account).
const str = (v, max = 200) => (typeof v === 'string' && v.length <= max ? v : undefined)
const iso = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) && v.length <= 40 ? v : undefined)
const stop = (s) => (s && str(s.id) ? { id: s.id, name: str(s.name) || '', tz: str(s.tz, 60), lat: Number.isFinite(s.lat) ? s.lat : undefined, lng: Number.isFinite(s.lng) ? s.lng : undefined } : null)
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
export function cleanJourney(j) {
  if (!j || typeof j !== 'object') return null
  const origin = stop(j.origin)
  const destination = stop(j.destination)
  const dep = iso(j.departure?.scheduled)
  const arr = iso(j.arrival?.scheduled)
  if (!origin || !destination || !dep || !arr) return null
  const legs = (Array.isArray(j.legs) ? j.legs : []).slice(0, 12).map((l) =>
    drop({
      mode: str(l?.mode, 40),
      operator: str(l?.operator),
      service: str(l?.service),
      tripId: str(l?.tripId, 300),
      from: drop({ ...drop(stop(l?.from) || {}), scheduled: iso(l?.from?.scheduled), scheduledTrack: str(l?.from?.scheduledTrack, 20) }),
      to: drop({ ...drop(stop(l?.to) || {}), scheduled: iso(l?.to?.scheduled) }),
    }),
  )
  return drop({
    id: str(j.id, 2000),
    provider: str(j.provider, 40),
    origin: drop(origin),
    destination: drop(destination),
    departure: drop({ scheduled: dep, scheduledTrack: str(j.departure?.scheduledTrack, 20) }),
    arrival: { scheduled: arr },
    durationMin: Number.isFinite(j.durationMin) ? j.durationMin : undefined,
    transfers: Number.isInteger(j.transfers) ? j.transfers : undefined,
    changes: (Array.isArray(j.changes) ? j.changes : []).map((c) => str(c)).filter(Boolean).slice(0, 10),
    operators: (Array.isArray(j.operators) ? j.operators : []).map((c) => str(c)).filter(Boolean).slice(0, 10),
    legs,
    bookingUrl: typeof j.bookingUrl === 'string' && /^https:\/\//.test(j.bookingUrl) ? str(j.bookingUrl, 1000) : undefined,
    savedAt: iso(j.savedAt),
  })
}

export const journeyKey = (fromId, toId) => `${fromId}>${toId}`

// Older shapes are migrated when loaded, never thrown away:
//   v1 { placeIds, cityOrder }                   first version
//   v2 { stops: [{ cityId, auto, placeIds }], startDate, endDate }
export function migrate(saved) {
  if (!saved || typeof saved !== 'object') return emptyTrip()

  let stops = []
  if (Array.isArray(saved.stops)) stops = saved.stops
  else if (Array.isArray(saved.placeIds) && Array.isArray(saved.cityOrder)) {
    stops = saved.cityOrder.map((cityId) => ({ cityId, auto: true, placeIds: saved.placeIds.filter((id) => placeById[id]?.cityId === cityId) }))
  }

  // Drop stops and places the sample data no longer has, and any duplicates.
  const seenCities = new Set()
  const seenPlaces = new Set()
  stops = stops
    .filter((s) => s && cityById[s.cityId] && !seenCities.has(s.cityId) && seenCities.add(s.cityId))
    .map((s) => ({
      cityId: s.cityId,
      auto: Boolean(s.auto),
      placeIds: (s.placeIds || []).filter((id) => placeById[id]?.cityId === s.cityId && !seenPlaces.has(id) && seenPlaces.add(id)),
      days: Number.isInteger(s.days) && s.days >= 0 ? s.days : null,
    }))

  // Every saved place gets a status; anything saved before statuses existed becomes "saved".
  const statuses = {}
  for (const id of seenPlaces) statuses[id] = STATUSES.includes(saved.statuses?.[id]) ? saved.statuses[id] : 'saved'

  // Itinerary: keep only saved places, each on one day, and only days that hold something.
  const itinerary = {}
  const placed = new Set()
  for (const [key, day] of Object.entries(saved.itinerary || {})) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1 || !day) continue
    const placeIds = (day.placeIds || []).filter((id) => seenPlaces.has(id) && !placed.has(id) && placed.add(id))
    const note = typeof day.note === 'string' ? day.note : ''
    const extras = dayExtras(day, placeIds)
    if (placeIds.length || note || extras.depart) itinerary[n] = { placeIds, note, ...extras }
  }

  const notes = {
    trip: typeof saved.notes?.trip === 'string' ? saved.notes.trip : '',
    cities: Object.fromEntries(Object.entries(saved.notes?.cities || {}).filter(([id, text]) => cityById[id] && typeof text === 'string')),
  }

  // Picked trains, only for hops between consecutive stops.
  const hops = new Set(stops.slice(1).map((s, i) => journeyKey(stops[i].cityId, s.cityId)))
  const journeys = {}
  for (const [key, j] of Object.entries(saved.journeys || {})) {
    const clean = hops.has(key) && cleanJourney(j)
    if (clean) journeys[key] = clean
  }

  return {
    version: VERSION,
    name: typeof saved.name === 'string' ? saved.name : '',
    stops,
    startDate: typeof saved.startDate === 'string' ? saved.startDate : '',
    endDate: typeof saved.endDate === 'string' ? saved.endDate : '',
    statuses,
    itinerary,
    notes,
    journeys,
  }
}

// Whether a trip holds nothing worth keeping (no stops, name, dates or notes).
export function isEmptyTrip(t) {
  return (
    !t.stops.length &&
    !t.name.trim() &&
    !t.startDate &&
    !t.endDate &&
    !t.notes.trip.trim() &&
    !Object.values(t.notes.cities).some((text) => text.trim())
  )
}
