// Turning a generated plan into a normal Eurowander trip (the v3 shape useTrip.js keeps), and back.
// The trip keeps every stop's length fixed, so the dates, travel days and day numbers line up exactly
// with the plan (see plan.js for the nights/days rule).
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { tripDays } from '../lib/trip.js'
import { allocateDays } from '../utils/tripCalculations.js'
import { addDaysIso, normalizePreferences } from './preferences.js'
import { planLegs, planTotals, stopDays } from './plan.js'

const legText = (l) => `${l.mode === 'flight' ? 'Flight' : l.mode === 'bus' ? 'Bus' : 'Train'} ${l.from.name} → ${l.to.name}, ~${formatDuration(l.minutes)}${l.source === 'sample' ? ' (sample time)' : ' (estimate)'}`

export function planToTrip(plan, dayPlans = [], { startDate = plan.prefs.startDate, name = '' } = {}) {
  const { days } = planTotals(plan)
  const counts = stopDays(plan)
  const legs = planLegs(plan)
  const start = startDate || ''
  const seen = new Set()
  const itinerary = {}
  for (const d of dayPlans) {
    const placeIds = d.items.map((it) => it.placeId).filter((id) => id && !seen.has(id) && seen.add(id))
    const notes = []
    if (d.leg) notes.push(`${legText(d.leg)}. Check in, then keep the day light.`)
    if (d.departure) notes.push(`${legText(d.departure)} home.`)
    if (placeIds.length || notes.length) itinerary[d.number] = { placeIds, note: notes.join(' ') }
  }
  const stops = plan.stops.map((s, i) => ({
    cityId: s.cityId,
    auto: false,
    placeIds: dayPlans.filter((d) => d.cityId === s.cityId).flatMap((d) => d.items.map((it) => it.placeId)).filter((id, k, all) => id && all.indexOf(id) === k),
    days: counts[i],
  }))
  const statuses = Object.fromEntries(stops.flatMap((s) => s.placeIds).map((id) => [id, 'want']))
  const route = plan.stops.map((s) => `${cityById[s.cityId].name} (${s.nights} night${s.nights === 1 ? '' : 's'})`).join(' → ')
  const home = legs.find((l) => l.isReturn)
  return {
    version: 3,
    name: name || `${days}-day Europe trip`,
    stops,
    startDate: start,
    endDate: start ? addDaysIso(start, days - 1) : '',
    statuses,
    itinerary,
    notes: {
      trip: `Planned with Build My Europe Trip: ${route}${home ? `, then back to ${home.to.name}` : ''}. Journey times and costs are estimates; check timetables and opening hours before booking.`,
      cities: {},
    },
  }
}

// A normal trip as a plan, so the builder can review and edit an existing trip.
export function tripToPlan(trip, extraPrefs = {}) {
  const stops = (trip.stops || []).filter((s) => cityById[s.cityId])
  const total = tripDays(trip.startDate, trip.endDate)
  const counts = total ? allocateDays(total, stops) : stops.map((s) => (Number.isInteger(s.days) ? s.days : 2))
  const nights = counts.map((c, i) => (i === counts.length - 1 ? Math.max(0, c - 1) : c))
  const days = nights.reduce((a, b) => a + b, 0) + 1
  const { prefs } = normalizePreferences({
    ...extraPrefs,
    startDate: trip.startDate || '',
    endDate: '',
    days,
    startCityId: stops[0]?.cityId || '',
  })
  return {
    version: 1,
    prefs,
    stops: stops.map((s, i) => ({ cityId: s.cityId, nights: nights[i], role: i === 0 ? 'start' : 'user', why: [] })),
  }
}
