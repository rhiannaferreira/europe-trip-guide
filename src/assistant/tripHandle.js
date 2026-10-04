// The trip the copilot is talking about, whichever kind it is:
//   'built'  the plan open on the Build page (its state lives in builder/usePlanner.js)
//   'saved'  My trip (travel-app-trip, the trip the board, map, timeline and budget show)
// Both are seen as a planner plan plus day plans, so the planner's rules (planner/) work on either, and a
// change is written back into the real trip: the copilot never keeps a trip of its own.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { monthNames } from '../lib/format.js'
import { KEYS, readJSON } from '../lib/storage.js'
import { readSavedTrip, updateSavedTrip, withPlace } from '../lib/tripStore.js'
import { tripToPlan } from '../planner/convert.js'
import { planTimeline, planTotals, stopDays } from '../planner/plan.js'
import { addDaysIso } from '../planner/preferences.js'
import { dayExtras, dayHasContent } from '../lib/tripModel.js'

// Places marked done or skipped in Travel Mode are history: the copilot plans around them, never moves them.
const settled = (day) => new Set([...(day?.done || []), ...(day?.skipped || [])])

const CURRENCIES = ['EUR', 'USD', 'GBP']

// The budget settings from the Budget tab, as planner preferences.
export function savedBudgetPrefs(saved = readJSON(KEYS.budget)) {
  const b = saved && typeof saved === 'object' ? saved : {}
  return {
    budget: typeof b.total === 'string' || typeof b.total === 'number' ? String(b.total) : '',
    currency: CURRENCIES.includes(b.currency) ? b.currency : 'EUR',
    travellers: Number.isInteger(b.travellers) && b.travellers > 0 ? b.travellers : 1,
  }
}

// My trip's day-by-day itinerary as day plans (the shape planner/dayPlanner.js uses).
export function itineraryDays(trip, plan) {
  return planTimeline(plan).map((d) => ({
    number: d.number,
    date: d.date,
    cityId: d.cityId,
    kind: d.leg ? 'arrival' : 'full',
    leg: d.leg,
    departure: d.departure,
    items: (trip.itinerary?.[d.number]?.placeIds || []).filter((id) => placeById[id] && !settled(trip.itinerary[d.number]).has(id)).map((id) => ({ slot: 'afternoon', placeId: id, label: placeById[id].name, reasons: [] })),
    notes: [],
  }))
}

// Day plans back into My trip's itinerary. Places new to the trip are saved; day notes stay.
// Places done or skipped in Travel Mode stay where they were (the day plans never include them), and a place
// that stays on its day keeps the start time the traveller gave it.
export function applyDaysToTrip(trip, days) {
  let t = trip
  const itinerary = {}
  const planned = new Set(days.flatMap((d) => d.items.map((it) => it.placeId)))
  for (const d of days) {
    const old = trip.itinerary?.[d.number]
    const kept = (old?.placeIds || []).filter((id) => settled(old).has(id) && !planned.has(id))
    const placeIds = [...new Set([...kept, ...d.items.map((it) => it.placeId).filter((id) => id && placeById[id])])]
    for (const id of placeIds) t = withPlace(t, id)
    const day = { placeIds, note: old?.note || '', ...dayExtras(old || {}, placeIds) }
    if (dayHasContent(day)) itinerary[d.number] = day
  }
  // Days the plan doesn't list (outside the trip) are kept as they were, if they hold a note.
  for (const [n, day] of Object.entries(trip.itinerary || {})) if (!itinerary[n] && day.note) itinerary[n] = { placeIds: [], note: day.note }
  return { ...t, itinerary }
}

// A changed plan (cities, order, nights) back into My trip. Saved places stay with their cities, places in
// cities that were dropped are unsaved, and each planned day moves with its city: the Nth day in Rome stays
// the Nth day in Rome (a day that no longer exists leaves its places saved but unscheduled).
export function applyPlanToTrip(trip, before, after) {
  const counts = stopDays(after)
  const old = new Map(trip.stops.map((s) => [s.cityId, s]))
  const keep = new Set(after.stops.map((s) => s.cityId))
  const stops = after.stops.map((s, i) => ({ ...(old.get(s.cityId) || { cityId: s.cityId, placeIds: [] }), auto: false, days: counts[i] }))
  const dropped = trip.stops.filter((s) => !keep.has(s.cityId)).flatMap((s) => s.placeIds)
  const statuses = { ...trip.statuses }
  for (const id of dropped) delete statuses[id]

  const slot = (timeline) => {
    const seen = {}
    return timeline.map((d) => {
      const k = seen[d.cityId] || 0
      seen[d.cityId] = k + 1
      return { number: d.number, key: `${d.cityId}#${k}` }
    })
  }
  const newByKey = Object.fromEntries(slot(planTimeline(after)).map((d) => [d.key, d.number]))
  const itinerary = {}
  for (const d of slot(planTimeline(before))) {
    const day = trip.itinerary?.[d.number]
    const to = newByKey[d.key]
    if (!day || !to) continue
    const placeIds = day.placeIds.filter((id) => !dropped.includes(id))
    const next = { placeIds, note: day.note, ...dayExtras(day, placeIds) }
    if (dayHasContent(next)) itinerary[to] = next
  }
  const { days } = planTotals(after)
  return { ...trip, stops, statuses, itinerary, endDate: trip.startDate ? addDaysIso(trip.startDate, days - 1) : trip.endDate }
}

const DAY = (iso) => new Date(`${iso}T00:00:00`)
const fmt = (iso) => `${monthNames[DAY(iso).getMonth()]} ${DAY(iso).getDate()}`

// "Italy & Switzerland", "France, Italy +2"
export function countriesLabel(plan) {
  const names = [...new Set(plan.stops.map((s) => cityById[s.cityId]?.country))].map((c) => countryByCode[c]?.name).filter(Boolean)
  if (names.length <= 2) return names.join(' & ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

// "Jun 10–21", "Jun 28 – Jul 3"
export function datesLabel(start, end) {
  if (!start || !end) return ''
  const a = DAY(start)
  const b = DAY(end)
  return a.getMonth() === b.getMonth() ? `${fmt(start)}–${b.getDate()}` : `${fmt(start)} – ${fmt(end)}`
}

// What the traveller is doing: exploring (no trip), planning (Build page), editing (My trip) or
// traveling (today falls inside My trip's dates).
export function tripMode(handle, today) {
  if (!handle) return 'exploring'
  if (handle.kind === 'built') return 'planning'
  const { startDate, endDate } = handle.trip
  if (startDate && endDate && today >= startDate && today <= endDate) return 'traveling'
  return 'editing'
}

// A key that changes whenever the trip does, so an old proposal can't be applied to a newer trip.
export const tripKey = (handle) => (handle ? JSON.stringify([handle.kind, handle.plan.stops.map((s) => [s.cityId, s.nights]), handle.plan.prefs.startDate, handle.days.map((d) => d.items.map((it) => it.placeId))]) : '')

// The open trip, or null. `builder` is what the Build page registered (assistant/bridge.js).
export function openTripHandle({ route, builder, trip = readSavedTrip(), budget } = {}) {
  if (route?.name === 'build' && builder?.plan) {
    const plan = builder.plan
    return {
      kind: 'built',
      plan,
      days: builder.days,
      weatherByDay: builder.weatherByDay || {},
      trip: null,
      name: '',
      title: countriesLabel(plan),
      dates: datesLabel(plan.prefs.startDate, plan.prefs.endDate),
      apply: (next, { days = null, message = '' } = {}) => builder.apply(next, { message, days }),
    }
  }
  if (!trip?.stops?.length) return null
  const plan = tripToPlan(trip, budget || savedBudgetPrefs())
  return {
    kind: 'saved',
    plan,
    days: itineraryDays(trip, plan),
    weatherByDay: null, // fetched when a question needs it
    trip,
    name: trip.name || '',
    title: countriesLabel(plan),
    dates: datesLabel(trip.startDate, trip.endDate),
    apply: (next, { days = null } = {}) =>
      updateSavedTrip((t) => {
        let out = next !== plan ? applyPlanToTrip(t, plan, next) : t
        if (days) out = applyDaysToTrip(out, days)
        return out
      }),
  }
}
