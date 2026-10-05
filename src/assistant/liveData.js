// Live data for the copilot: real trains for find_trains, and real places for food and drink questions.
// Fetched before the answer is worked out, so the reply (and the AI) only ever use what came back.
// Nothing here invents a train or a place: with no live answer, the reply says so and falls back to
// EuroWander's own data, labelled.
import { cityById } from '../data/cities.js'
import { getTrainTime } from '../data/trainTimes.js'
import { formatDuration } from '../lib/format.js'
import { estimateMinutes } from '../lib/trip.js'
import { distanceKm } from '../lib/geo.js'
import { mainStation, searchJourneys, stationName } from '../services/live/trains.js'
import { searchPlaces } from '../services/live/places.js'
import { clock } from '../services/live/time.js'
import { registerPlaces } from '../lib/extraPlacesCore.js'

const within = (p, ms) => Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))])

// ----- Trains -----

// → { journeys, from, to, retrievedAt } or { error }
export async function fetchTrains(a) {
  try {
    const [from, to] = await within(Promise.all([mainStation(a.from, a.to), mainStation(a.to, a.from)]), 9000)
    if (!from || !to) return { error: { code: 'no_station' }, missing: !from ? a.from : a.to }
    const r = await within(searchJourneys({ from, to, date: a.date, time: a.time, maxTransfers: a.transfers }), 12000)
    return { ...r, from, to }
  } catch (error) {
    return { error }
  }
}

const dayText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// EuroWander's own journey time between two cities, labelled as an estimate.
function estimateLine(fromId, toId) {
  const known = getTrainTime(fromId, toId)
  const minutes = known ? known.minutes : estimateMinutes(distanceKm(cityById[fromId], cityById[toId]))
  return `EuroWander’s estimate: about ${formatDuration(minutes)} by train${known ? '' : ', worked out from the distance'}.`
}

// The answer for find_trains, from what fetchTrains returned.
export function trainsAnswer(a, live) {
  const fromName = cityById[a.from].name
  const toName = cityById[a.to].name
  const again = { label: '↻ Try again', prompt: `Trains from ${fromName} to ${toName} on ${a.date} after ${a.time}` }
  if (!live || live.error) {
    const code = live?.error?.code
    const head =
      code === 'no_station'
        ? `I couldn’t find the main station in ${cityById[live.missing]?.name || 'one of those cities'} in the live timetable.`
        : code === 'not_configured'
          ? 'Live train times aren’t switched on yet.'
          : 'Live train times are temporarily unavailable.'
    return {
      text: `${head} ${estimateLine(a.from, a.to)} Check the operator’s site for real times.`,
      tone: 'note',
      followUps: code === 'not_configured' ? [] : [again],
      sources: ['estimate'],
      facts: { trains: 'none: live timetable unavailable', estimate: estimateLine(a.from, a.to) },
    }
  }
  const journeys = (live.journeys || []).slice(0, 5)
  const lastTrains = { from: a.from, to: a.to, date: a.date, time: a.time, transfers: a.transfers }
  if (!journeys.length) {
    return {
      text: `No trains found from ${stationName(live.from.name)} to ${stationName(live.to.name)} leaving after ${a.time} on ${dayText(a.date)}${a.transfers === 0 ? ' without changes' : ''}. Timetables far ahead may not be published yet. ${estimateLine(a.from, a.to)}`,
      followUps: [
        ...(a.transfers != null ? [{ label: 'Allow changes', prompt: `Trains from ${fromName} to ${toName} on ${a.date} after ${a.time}, any number of changes` }] : []),
        { label: 'Earlier trains', prompt: 'Earlier trains?' },
      ],
      sources: ['estimate'],
      memory: { lastTrains },
    }
  }
  const last = journeys[journeys.length - 1]
  const lastDep = new Date(Date.parse(last.departure.scheduled) + 60000).toISOString()
  const minTransfers = Math.min(...journeys.map((j) => j.transfers))
  return {
    text: `Trains from ${stationName(live.from.name)} to ${stationName(live.to.name)} on ${dayText(a.date)}, leaving after ${a.time}:`,
    blocks: [{ type: 'trains', from: a.from, to: a.to, date: a.date, hopDay: a.hopDay, journeys, retrievedAt: live.retrievedAt }],
    followUps: [
      { label: '⏩ Later trains', prompt: 'Can I leave later?' },
      ...(minTransfers > 0 ? [{ label: '🔁 Fewer changes', prompt: 'Show trains with fewer changes' }] : []),
      ...(a.hopDay ? [{ label: '🗓️ Fits my plans?', prompt: 'Which of these trains works best with my itinerary?' }] : []),
    ],
    sources: ['timetable'],
    memory: { lastTrains: { ...lastTrains, lastDeparture: clock(lastDep, live.from.tz), minTransfers } },
  }
}

// One train as plain facts for the AI: times on the stations' clocks and what is (and isn't) known live.
export function trainFact(j) {
  const dep = clock(j.departure.scheduled, j.origin.tz)
  const arr = clock(j.arrival.scheduled, j.destination.tz)
  const delay = j.departure.expected ? Math.round((Date.parse(j.departure.expected) - Date.parse(j.departure.scheduled)) / 60000) : null
  return {
    departs: `${dep} ${stationName(j.origin.name)}`,
    arrives: `${arr} ${stationName(j.destination.name)}`,
    duration: formatDuration(j.durationMin),
    changes: j.transfers === 0 ? 'direct' : `${j.transfers} (at ${j.changes.map(stationName).join(', ')})`,
    operators: j.operators.join(', ') || undefined,
    trains: (j.legs || []).map((l) => l.service).filter(Boolean).join(', ') || undefined,
    status: j.cancelled ? 'CANCELLED (real-time)' : delay != null ? (delay >= 2 ? `REAL-TIME: ${delay} min late` : 'REAL-TIME: on time') : 'SCHEDULED: timetable only, no live information',
    bookingLink: j.bookingUrl ? 'yes' : undefined,
  }
}

// ----- Places -----

const FOOD = /\b(restaurants?|eat|eating|dinner|lunch|brunch|breakfast|food|hungry|pizza|tapas|sushi|vegan|vegetarian|trattoria|bistro|cafes?|coffee|bars?|drinks?|pubs?|wine|gelato|ice ?cream|desserts?)\b/i

// Which kind of live place a request is after, or null when live places don't fit it.
export function livePlaceKind(action, message = '') {
  if (!action) return null
  const asks = ['places_near', 'suggest_places', 'open_question', 'plan_day'].includes(action.action)
  if (!asks) return null
  const t = String(message)
  if (/\b(gelato|gelaterias?|ice ?creams?|desserts?|sweets?|pastr(y|ies)|cakes?)\b/i.test(t)) return 'dessert'
  if (/\b(cafes?|coffee|breakfast)\b/i.test(t)) return 'cafe'
  if (/\b(bars?|drinks?|pubs?|wine|cocktails?)\b/i.test(t) || action.category === 'nightlife') return 'bar'
  if (action.category === 'food' || FOOD.test(t)) return 'restaurant'
  return null
}

// Real places of that kind around the city centre, registered so cards, saving and the map work.
// → { places, retrievedAt } or { error }
export async function fetchLivePlaces(cityId, kind) {
  const city = cityById[cityId]
  if (!city) return { error: { code: 'bad_input' } }
  try {
    const r = await within(searchPlaces({ lat: city.lat, lng: city.lng, radius: 1500, kind, limit: 12, cityId }), 8000)
    registerPlaces(r.places)
    return { places: r.places, retrievedAt: r.retrievedAt }
  } catch (error) {
    return { error }
  }
}
