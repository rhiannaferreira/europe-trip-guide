// Ready-made trips as Build My Trip plans, and everything a template page shows about one. No React and
// no network: a template opens, shows its route and can be copied with every live service down.
//
// A template (data/tripTemplates.js) becomes an ordinary planner plan, so the route editor, the copilot,
// the budget and "Save as my trip" all work on it unchanged. The template itself is never changed: the
// page works on its own copy, and saving makes an independent trip (later edits to the template never
// reach it).
import { cityById, hiddenGemsFor } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { CITY_DAYS } from '../data/templateDays.js'
import { templateDayCount } from '../data/tripTemplates.js'
import { templatePace } from './templateFacts.js'
import { formatDuration, monthRange } from '../lib/format.js'
import { planToTrip } from '../planner/convert.js'
import { planDays } from '../planner/dayPlanner.js'
import { computeStats } from '../planner/feasibility.js'
import { replaceStop } from '../planner/modify.js'
import { planLegs, withStops } from '../planner/plan.js'
import { addDaysIso, normalizePreferences } from '../planner/preferences.js'

// $, $$ or $$$ from the cities' day-to-day prices.
export function budgetLevel(stops) {
  const levels = stops.map((s) => cityById[s.cityId]?.costLevel || 2)
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length
  const n = avg < 1.67 ? 1 : avg < 2.5 ? 2 : 3
  return { level: n, symbol: '$'.repeat(n), label: ['Budget-friendly', 'Mid-range', 'Pricier'][n - 1] }
}

// Months that are good for weather in every city (or, failing that, in most of them).
export function bestMonths(stops) {
  const lists = stops.map((s) => cityById[s.cityId]?.seasons?.bestWeather || [])
  const all = lists.reduce((acc, l) => acc.filter((m) => l.includes(m)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  if (all.length) return all
  const count = {}
  for (const l of lists) for (const m of l) count[m] = (count[m] || 0) + 1
  const most = Math.max(0, ...Object.values(count))
  return most ? Object.keys(count).filter((m) => count[m] === most).map(Number).sort((a, b) => a - b) : []
}
export const bestMonthsText = (stops) => {
  const m = bestMonths(stops)
  return m.length ? monthRange(m) : ''
}

// The template as a planner plan. Its first city is where the trip starts; the others can be changed by
// every automatic change ("cheaper", "more relaxed", "different cities"...), like cities the builder picked.
export function templatePlan(t, { startDate = '' } = {}) {
  const days = templateDayCount(t)
  const { prefs } = normalizePreferences({
    days,
    startDate,
    startCityId: t.stops[0].cityId,
    interests: t.interests,
    pace: templatePace(t)?.id || 'moderate',
    transport: 'train',
    maxLegMinutes: t.maxLegMinutes ?? 300,
    mix: 'balanced',
  })
  return {
    version: 1,
    prefs,
    stops: t.stops.map((s, i) => ({ cityId: s.cityId, nights: s.nights, role: i === 0 ? 'start' : 'pick', why: [] })),
  }
}

// The same plan with a different start date ('' for none). Nights and order stay the same.
export function withStartDate(plan, startDate) {
  return withStops({ ...plan, prefs: { ...plan.prefs, startDate } }, plan.stops)
}

// Day plans for a plan (the shape planner/dayPlanner.js returns), with the curated ideas where Eurowander
// has an outline for the city (data/templateDays.js) and the planner's own picks everywhere else.
// Each day also gets `title` and `ideas` (free-text sights that aren't places in the data). The last day of
// the trip is left open for leaving.
export function templateDays(plan, legs = planLegs(plan)) {
  const base = planDays(plan, { legs })
  const seen = {}
  return base.map((d, i) => {
    const k = seen[d.cityId] || 0
    seen[d.cityId] = k + 1
    const travel = d.items.filter((it) => it.slot === 'travel')
    const last = i === base.length - 1 && base.length > 1
    if (last) {
      return {
        ...d,
        kind: 'last',
        title: 'Departure or a free day',
        ideas: ['A slow last morning, or anything you missed'],
        items: travel,
      }
    }
    const outline = CITY_DAYS[d.cityId]?.[k]
    if (!outline) return { ...d, title: d.leg ? `Arrive in ${cityById[d.cityId].name}` : `Free day in ${cityById[d.cityId].name}`, ideas: [] }
    const places = outline.places.filter((id) => placeById[id]?.cityId === d.cityId)
    const items = [
      ...travel,
      ...places.map((id, n) => {
        const p = placeById[id]
        const slot = p.category === 'nightlife' ? 'evening' : d.leg ? (n === 0 ? 'afternoon' : 'evening') : n === 0 ? 'morning' : 'afternoon'
        return { slot, placeId: id, label: p.name, reasons: [] }
      }),
    ]
    return { ...d, title: outline.title, ideas: outline.ideas, items }
  })
}

// Groups the day plans by stop, for the page: [{ stop, index, city, from, to, days }]
export function stopsWithDays(plan, days) {
  return plan.stops.map((stop, index) => {
    const own = days.filter((d) => d.cityId === stop.cityId)
    return { stop, index, city: cityById[stop.cityId], from: own[0]?.number || 0, to: own[own.length - 1]?.number || 0, days: own }
  })
}

// "Why this trip works": plain checks on the plan, each true or left out. No scores.
export function whyItWorks(plan, stats = computeStats(plan)) {
  const out = []
  const legs = stats.legs
  if (legs.length) {
    const longest = Math.max(...legs.map((l) => l.minutes))
    const allTrain = legs.every((l) => l.mode === 'train')
    const ground = legs.every((l) => l.mode !== 'flight')
    if (allTrain) out.push(`Every journey is by train, the longest about ${formatDuration(longest)}`)
    else if (ground) out.push(`No flights: trains and buses, the longest about ${formatDuration(longest)}`)
    if (longest <= 180) out.push('No journey longer than three hours')
  }
  if (stats.cities > 1 && stats.backtracking.extraMinutes < 15) out.push('No backtracking: the cities are already in the quickest order')
  const minNights = Math.min(...plan.stops.map((s) => s.nights))
  if (stats.cities > 1 && minNights >= 2) out.push('At least two nights everywhere, so no rushed one-night stops')
  if (stats.maxConsecutiveTravelDays <= 1 && stats.cities > 2) out.push('Never two travel days in a row')
  if (stats.countries.length > 1) out.push(`${stats.countries.length} countries without a flight`)
  const gems = plan.stops.filter((s) => cityById[s.cityId]?.hiddenGem).map((s) => cityById[s.cityId].name)
  if (gems.length) out.push(`Includes ${gems.length === 1 ? 'a hidden gem' : 'hidden gems'}: ${gems.join(', ')}`)
  if (stats.pace?.id === 'relaxed') out.push('A relaxed pace, with time to wander')
  return out
}

// Quieter swaps for the famous stops: Eurowander's own hidden-gem list for each city, with the change in
// travel time. [{ index, cityId, options: [{ cityId, deltaMinutes, plan }] }]
export function quieterSwaps(plan, stats = computeStats(plan)) {
  const inPlan = new Set(plan.stops.map((s) => s.cityId))
  return plan.stops
    .map((s, index) => {
      const city = cityById[s.cityId]
      if (!city || city.hiddenGem) return null
      const options = hiddenGemsFor(city)
        .filter((g) => !inPlan.has(g.id))
        .map((g) => {
          const r = replaceStop(plan, index, g.id)
          return r.changed ? { cityId: g.id, deltaMinutes: computeStats(r.plan).travelMinutes - stats.travelMinutes, plan: r.plan } : null
        })
        .filter(Boolean)
        .slice(0, 3)
      return options.length ? { index, cityId: s.cityId, options } : null
    })
    .filter(Boolean)
}

// A normal Eurowander trip from the page's plan (see planner/convert.js). The day ideas go into each day's
// note, and the trip note says where it came from. The result has no link back to the template.
export function templateTrip(t, plan, days, { name = '', startDate = plan.prefs.startDate } = {}) {
  const dated = startDate === plan.prefs.startDate ? plan : withStartDate(plan, startDate)
  const trip = planToTrip(dated, days, { startDate, name: name || t.title })
  const itinerary = { ...trip.itinerary }
  for (const d of days) {
    const ideas = d.ideas?.length ? `${d.title}: ${d.ideas.join(', ')}.` : d.title ? `${d.title}.` : ''
    if (!ideas) continue
    const old = itinerary[d.number] || { placeIds: [], note: '' }
    itinerary[d.number] = { ...old, note: [ideas, old.note].filter(Boolean).join(' ') }
  }
  const route = plan.stops.map((s) => `${cityById[s.cityId].name} (${s.nights} night${s.nights === 1 ? '' : 's'})`).join(' → ')
  return {
    ...trip,
    itinerary,
    endDate: startDate ? addDaysIso(startDate, days.length - 1) : '',
    notes: {
      ...trip.notes,
      trip: `Started from Eurowander’s “${t.title}” trip idea: ${route}. It’s your own copy now, so change anything. Journey times and costs are estimates; check timetables and opening hours before booking.`,
    },
  }
}

export { cityList, routeText, templateCountries, templateFlags, templatePace } from './templateFacts.js'
