// Rail provider: Transitous (https://transitous.org), the community-run MOTIS journey planner covering
// public transport across Europe, with real-time data where operators publish it (GTFS-RT / SIRI).
//
// Terms (checked 2026-10-05): free, no key; meant for open-source, non-commercial, light-traffic use;
// send a User-Agent naming the app and a contact (TRANSITOUS_CONTACT); get in touch before routine use
// of journey planning. Volunteer-run with no SLA, so every caller must cope with it failing.
// No fares and no booking (a leg may carry the operator's own ticket link from the timetable data).
//
// Returns EuroWander's normalized stations and journeys, never MOTIS's own shapes.
import { getJSON, ProviderError } from '../http.js'

export const ATTRIBUTION = { text: 'Timetables via Transitous and its open data sources', links: ['https://transitous.org/sources/'] }
const base = () => (process.env.TRANSITOUS_API_BASE || 'https://api.transitous.org').replace(/\/+$/, '')

export const configured = () => true

function headers() {
  const contact = process.env.TRANSITOUS_CONTACT || 'https://eurowander.vercel.app'
  return { 'user-agent': `EuroWander/1.0 (+https://eurowander.vercel.app; ${contact})` }
}

const RAIL = new Set(['RAIL', 'HIGHSPEED_RAIL', 'LONG_DISTANCE', 'NIGHT_RAIL', 'REGIONAL_FAST_RAIL', 'REGIONAL_RAIL', 'SUBURBAN'])
const STREET = new Set(['WALK', 'BIKE', 'RENTAL', 'CAR', 'CAR_PARKING', 'CAR_DROPOFF', 'ODM', 'RIDE_SHARING', 'FLEX', 'HGV'])
const str = (v, max = 160) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const iso = (v) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null)
const link = (v) => (typeof v === 'string' && /^https:\/\/[^\s]+$/i.test(v) ? v.slice(0, 400) : null)

// ----- Stations -----

export function normalizeStation(m) {
  if (!m || m.type !== 'STOP' || !str(m.id) || !str(m.name) || !Number.isFinite(m.lat) || !Number.isFinite(m.lon)) return null
  const modes = Array.isArray(m.modes) ? m.modes : null
  // Stops that only serve buses or trams aren't stations for this app; unknown modes are kept.
  if (modes && modes.length && !modes.some((x) => RAIL.has(x))) return null
  const area = (m.areas || []).find((a) => a.default) || (m.areas || []).find((a) => a.matched) || null
  const out = {
    id: m.id.slice(0, 200),
    provider: 'transitous',
    name: m.name.slice(0, 120),
    lat: m.lat,
    lng: m.lon,
    country: str(m.country, 3),
    area: str(area?.name, 80),
    tz: str(m.tz, 40),
    importance: Number.isFinite(m.importance) ? m.importance : null,
  }
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k]
  return out
}

export async function searchStations(q, near = null) {
  const params = new URLSearchParams({ text: q, type: 'STOP', numResults: '12', language: 'en' })
  if (near) params.set('place', `${near.lat},${near.lng}`)
  const data = await getJSON(`${base()}/api/v1/geocode?${params}`, { headers: headers(), timeout: 6000 })
  if (!Array.isArray(data)) throw new ProviderError('bad_response')
  const seen = new Set()
  return data
    .map(normalizeStation)
    // Keep the geocoder's own order: it ranks by how well the name matches (sorting by importance put
    // Munich's "Hauptbahnhof Süd" above Berlin Hbf for "Berlin Hbf").
    .filter((s) => s && !seen.has(s.id) && seen.add(s.id))
    .slice(0, 8)
}

// ----- Journeys -----

function stopTimes(place, scheduled, actual, realtime) {
  const out = {
    id: str(place?.stopId, 200),
    name: str(place?.name, 120) || 'Unknown stop',
    lat: Number.isFinite(place?.lat) ? place.lat : null,
    lng: Number.isFinite(place?.lon) ? place.lon : null,
    tz: str(place?.tz, 40),
    scheduled: iso(scheduled),
    // Only real-time data counts as "expected"; without it we only know the timetable.
    expected: realtime ? iso(actual) : null,
    track: str(place?.track, 12),
    scheduledTrack: str(place?.scheduledTrack, 12),
    cancelled: place?.cancelled === true,
  }
  for (const k of Object.keys(out)) if (out[k] == null || out[k] === false) delete out[k]
  return out
}

function normalizeLeg(l) {
  const realtime = l.realTime === true
  const service = str(l.displayName, 40) || [str(l.routeShortName, 20), str(l.tripShortName, 20)].filter((x, i, a) => x && a.indexOf(x) === i).join(' ') || null
  const out = {
    mode: RAIL.has(l.mode) ? 'train' : String(l.mode || 'TRANSIT').toLowerCase(),
    operator: str(l.agencyName, 80),
    service,
    headsign: str(l.headsign, 80),
    tripId: str(l.tripId, 300),
    from: stopTimes(l.from, l.scheduledStartTime, l.startTime, realtime),
    to: stopTimes(l.to, l.scheduledEndTime, l.endTime, realtime),
    realtime,
    cancelled: l.cancelled === true,
    stops: Array.isArray(l.intermediateStops) ? l.intermediateStops.length : null,
    alerts: (l.alerts || []).map((a) => ({ header: str(a.headerText, 160), description: str(a.descriptionText, 400) })).filter((a) => a.header || a.description).slice(0, 3),
    bookingUrl: link(l.ticketUrls?.web),
  }
  for (const k of Object.keys(out)) if (out[k] == null || (Array.isArray(out[k]) && !out[k].length)) delete out[k]
  return out
}

const minutes = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60000) : null)

export function normalizeJourney(itin, retrievedAt = new Date().toISOString()) {
  const legs = (itin?.legs || []).filter((l) => l && !STREET.has(l.mode)).map(normalizeLeg)
  if (!legs.length) return null
  const first = legs[0]
  const last = legs[legs.length - 1]
  const dep = { ...first.from }
  const arr = { ...last.to }
  if (!dep.scheduled || !arr.scheduled) return null
  const realtime = legs.some((l) => l.realtime)
  const cancelled = legs.some((l) => l.cancelled || l.from.cancelled || l.to.cancelled)
  const out = {
    id: str(itin.id, 2000),
    provider: 'transitous',
    origin: { id: dep.id, name: dep.name, lat: dep.lat, lng: dep.lng, tz: dep.tz },
    destination: { id: arr.id, name: arr.name, lat: arr.lat, lng: arr.lng, tz: arr.tz },
    departure: { scheduled: dep.scheduled, expected: dep.expected, track: dep.track, scheduledTrack: dep.scheduledTrack },
    arrival: { scheduled: arr.scheduled, expected: arr.expected, track: arr.track, scheduledTrack: arr.scheduledTrack },
    durationMin: minutes(dep.scheduled, arr.scheduled),
    transfers: legs.length - 1,
    changes: legs.slice(1).map((l) => l.from.name),
    operators: [...new Set(legs.map((l) => l.operator).filter(Boolean))],
    allTrain: legs.every((l) => l.mode === 'train'),
    legs,
    realtime,
    cancelled,
    bookingUrl: legs.length === 1 ? legs[0].bookingUrl || null : null,
    retrievedAt,
  }
  for (const side of [out.origin, out.destination, out.departure, out.arrival]) for (const k of Object.keys(side)) if (side[k] == null) delete side[k]
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k]
  return out
}

// { from, to: station ids, time: ISO, arriveBy, maxTransfers, windowMin, cursor } → { journeys, next, previous }
export async function searchJourneys({ from, to, time = null, arriveBy = false, maxTransfers = null, windowMin = 180, cursor = null }) {
  const params = new URLSearchParams({
    fromPlace: from,
    toPlace: to,
    arriveBy: String(Boolean(arriveBy)),
    transitModes: 'RAIL',
    searchWindow: String(windowMin * 60),
    numItineraries: '6',
    detailedLegs: 'false',
    language: 'en',
  })
  if (time) params.set('time', time)
  if (maxTransfers != null) params.set('maxTransfers', String(maxTransfers))
  if (cursor) params.set('pageCursor', cursor)
  const data = await getJSON(`${base()}/api/v6/plan?${params}`, { headers: headers(), timeout: 12000 })
  if (!Array.isArray(data?.itineraries)) throw new ProviderError('bad_response')
  const at = new Date().toISOString()
  const seen = new Set()
  const journeys = data.itineraries
    .map((i) => normalizeJourney(i, at))
    .filter((j) => j && j.allTrain)
    .filter((j) => {
      const k = `${j.departure.scheduled}|${j.arrival.scheduled}|${j.transfers}`
      return !seen.has(k) && seen.add(k)
    })
    .sort((a, b) => Date.parse(a.departure.scheduled) - Date.parse(b.departure.scheduled))
  return { journeys, next: str(data.nextPageCursor, 2000), previous: str(data.previousPageCursor, 2000) }
}

// The latest information for a journey found earlier: Transitous rebuilds it from its id when it can,
// otherwise the same search is run again and the same trains picked out.
export async function journeyStatus({ id, from, to, departure, tripIds = [] }) {
  if (id) {
    try {
      const itin = await getJSON(`${base()}/api/v6/refresh-itinerary?${new URLSearchParams({ itineraryId: id, detailedLegs: 'false' })}`, { headers: headers(), timeout: 8000 })
      const j = normalizeJourney(itin)
      if (j) return j
    } catch (e) {
      if (!['not_found', 'bad_response'].includes(e.code)) throw e
    }
  }
  if (!from || !to || !departure) throw new ProviderError('not_found')
  const { journeys } = await searchJourneys({ from, to, time: departure, windowMin: 30 })
  const wanted = new Set(tripIds)
  const match =
    journeys.find((j) => wanted.size && j.legs.every((l) => wanted.has(l.tripId))) ||
    journeys.find((j) => wanted.size && wanted.has(j.legs[0].tripId)) ||
    journeys.find((j) => j.departure.scheduled === departure)
  if (!match) throw new ProviderError('not_found')
  return match
}
