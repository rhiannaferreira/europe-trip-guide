// Getting between two cities: the sample train time when there is one, otherwise a labelled estimate.
// Nothing here is a live timetable or fare.
//
// Rules:
//   sample     the approximate fastest time from data/trainTimes.js (source: 'sample')
//   estimate   straight-line distance × 1.25 at 100 km/h, plus 20 minutes (source: 'estimate'),
//              the same rule the trip summary uses (lib/trip.js estimateMinutes)
//   flight     only when the traveller allows flights: distance at 700 km/h, plus 30 minutes for take-off
//              and landing and 150 minutes for getting to, through and out of airports (source: 'flight-estimate').
//              'mixed' flies when the ground journey is 7 hours or more and over 600 km;
//              'fastest' flies when that saves at least an hour on a journey over 400 km.
import { cityById } from '../data/cities.js'
import { getTrainTime } from '../data/trainTimes.js'
import { estimateMinutes } from '../lib/trip.js'
import { distanceKm } from '../utils/distance.js'

export const LONG_LEG_MINUTES = 240
export const VERY_LONG_LEG_MINUTES = 420
export const flightMinutes = (km) => Math.round((km / 700) * 60 + 30 + 150)

const cache = new Map()

function groundLeg(fromId, toId) {
  const key = fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`
  let base = cache.get(key)
  if (!base) {
    const a = cityById[fromId]
    const b = cityById[toId]
    const km = distanceKm(a, b)
    const known = getTrainTime(fromId, toId)
    base = known
      ? { km, minutes: known.minutes, mode: known.mode, note: known.note || '', source: 'sample' }
      : { km, minutes: estimateMinutes(km), mode: 'train', note: 'No sample timetable; estimated from distance.', source: 'estimate' }
    cache.set(key, base)
  }
  return base
}

// One journey. Shape matches lib/trip.js tripLegs entries (from, to, km, minutes, mode, note, estimated),
// plus `source` and, when a flight is suggested, `groundMinutes` for the train/bus alternative.
export function legBetween(fromId, toId, { transport = 'train' } = {}) {
  const from = cityById[fromId]
  const to = cityById[toId]
  if (!from || !to) return null
  const g = groundLeg(fromId, toId)
  const fly = flightMinutes(g.km)
  const useFlight =
    (transport === 'mixed' && g.minutes >= VERY_LONG_LEG_MINUTES && g.km > 600) ||
    (transport === 'fastest' && g.km > 400 && fly <= g.minutes - 60)
  if (useFlight) {
    return {
      from,
      to,
      km: g.km,
      minutes: fly,
      mode: 'flight',
      note: 'Rough door-to-door estimate including airports. No flight data in Eurowander.',
      estimated: true,
      source: 'flight-estimate',
      groundMinutes: g.minutes,
      groundMode: g.mode,
    }
  }
  return { from, to, km: g.km, minutes: g.minutes, mode: g.mode, note: g.note, estimated: g.source !== 'sample', source: g.source }
}

// Travel time only, for the route search (cheap, cached).
export const travelMinutes = (fromId, toId, transport) => (fromId === toId ? 0 : legBetween(fromId, toId, { transport }).minutes)

// The journeys of a route, in order. A round trip adds the journey home at the end (`isReturn`).
export function routeLegs(cityIds, { transport = 'train', returnTo = '' } = {}) {
  const legs = []
  for (let i = 1; i < cityIds.length; i++) legs.push(legBetween(cityIds[i - 1], cityIds[i], { transport }))
  const last = cityIds[cityIds.length - 1]
  if (returnTo && last && returnTo !== last) legs.push({ ...legBetween(last, returnTo, { transport }), isReturn: true })
  return legs.filter(Boolean)
}

export const modeIcon = (mode) => (mode === 'flight' ? '✈️' : mode === 'bus' ? '🚌' : mode === 'rail + ferry' ? '⛴️' : '🚆')

export const sourceLabel = (source) =>
  source === 'sample' ? 'Sample time' : source === 'flight-estimate' ? 'Flight estimate' : 'Estimate from distance'
