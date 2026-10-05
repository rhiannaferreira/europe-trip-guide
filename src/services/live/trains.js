// trainService: stations, scheduled journeys and real-time status, normalized, for My trip, the Trip
// Builder, Travel Mode and the copilot.
//
// A journey (from the gateway, see server/live/providers/transitous.js):
//   { id, provider, origin {id,name,tz}, destination, departure {scheduled, expected?, track?, scheduledTrack?},
//     arrival {...}, durationMin, transfers, changes [station names], operators [], legs [...], realtime,
//     cancelled, bookingUrl?, retrievedAt }
// `expected` exists only when the provider has real-time data; without it the journey is SCHEDULED and
// nothing may call it "on time".
import { cityById } from '../../data/cities.js'
import { distanceKm } from '../../utils/distance.js'
import { liveGet } from './http.js'
import { cityZoneOf } from './places.js'
import { delayMinutes, zonedIso } from './time.js'

export async function searchStations(q, near = null) {
  const r = await liveGet('trains/stations', {
    q: q.trim(),
    lat: near ? Math.round(near.lat * 10) / 10 : undefined,
    lng: near ? Math.round(near.lng * 10) / 10 : undefined,
  })
  return r.data.stations || []
}

// The main station for a guide city: the most important rail stop near the centre.
export async function mainStation(cityId) {
  const city = cityById[cityId]
  if (!city) return null
  const list = await searchStations(city.name, city)
  return list.find((s) => distanceKm(s, city) < 25) || null
}

// searchJourneys({ from, to: station objects, date 'YYYY-MM-DD', time 'HH:MM', arriveBy, maxTransfers, windowMin, cursor })
//   → { journeys, next, previous, retrievedAt }
export async function searchJourneys({ from, to, date = '', time = '08:00', arriveBy = false, maxTransfers = null, windowMin = 180, cursor = null }) {
  const tz = (arriveBy ? to.tz : from.tz) || 'Europe/Paris'
  const r = await liveGet('trains/journeys', {
    from: from.id,
    to: to.id,
    time: date ? zonedIso(date, time || '08:00', tz) : undefined,
    arriveBy: arriveBy || undefined,
    maxTransfers: maxTransfers ?? undefined,
    window: windowMin,
    cursor: cursor || undefined,
  })
  return { ...r.data, retrievedAt: r.meta.retrievedAt }
}

// The latest information for a saved journey. → journey (with retrievedAt), or throws LiveError.
export async function getJourneyStatus(saved) {
  const r = await liveGet(
    'trains/status',
    {
      id: saved.id && saved.id.length < 1800 ? saved.id : undefined,
      from: saved.origin?.id,
      to: saved.destination?.id,
      dep: saved.departure?.scheduled,
      trips: (saved.legs || []).map((l) => l.tripId).filter(Boolean).join(',') || undefined,
    },
    { fresh: true },
  )
  return { ...r.data.journey, retrievedAt: r.meta.retrievedAt }
}

// What a journey's times mean right now. Kinds:
//   'cancelled'  the provider says a train on it is cancelled
//   'delayed'    real-time data, departure (or, failing that, arrival) 2+ minutes late
//   'realtime'   real-time data and it matches the timetable
//   'partial'    real-time data for some trains only (no live departure or arrival time)
//   'scheduled'  timetable only: nothing is known about delays
export function journeyState(j) {
  if (!j) return { kind: 'scheduled', delay: null }
  if (j.cancelled) return { kind: 'cancelled', delay: null }
  const dep = delayMinutes(j.departure)
  const arr = delayMinutes(j.arrival)
  const d = dep ?? arr
  if (!j.realtime || d == null) return { kind: j.realtime ? 'partial' : 'scheduled', delay: null }
  if (d >= 2) return { kind: 'delayed', delay: d, at: dep != null ? 'departure' : 'arrival' }
  return { kind: 'realtime', delay: d, at: dep != null ? 'departure' : 'arrival' }
}

// Some timetables shout ("ROMA TERMINI"): show station names in normal case.
export function stationName(name) {
  if (!name || name !== name.toUpperCase() || !/[A-Z]{3}/.test(name)) return name || ''
  return name.toLowerCase().replace(/(^|[\s\-'./(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
}

// The compact copy kept in a trip: enough to show the journey and look it up again, nothing more.
export function journeySnapshot(j, { savedAt = new Date().toISOString() } = {}) {
  const leg = (l) => ({
    mode: l.mode,
    operator: l.operator,
    service: l.service,
    tripId: l.tripId,
    from: { id: l.from.id, name: l.from.name, tz: l.from.tz, scheduled: l.from.scheduled, scheduledTrack: l.from.scheduledTrack },
    to: { id: l.to.id, name: l.to.name, tz: l.to.tz, scheduled: l.to.scheduled },
  })
  return {
    id: j.id,
    provider: j.provider,
    origin: j.origin,
    destination: j.destination,
    departure: { scheduled: j.departure.scheduled, scheduledTrack: j.departure.scheduledTrack },
    arrival: { scheduled: j.arrival.scheduled },
    durationMin: j.durationMin,
    transfers: j.transfers,
    changes: j.changes || [],
    operators: j.operators || [],
    legs: (j.legs || []).map(leg),
    bookingUrl: j.bookingUrl,
    savedAt,
  }
}

export const defaultZone = (cityId) => cityZoneOf(cityId)
