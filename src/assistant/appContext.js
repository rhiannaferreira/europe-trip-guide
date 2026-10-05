// What the AI sees for a copilot request: the page, the open trip in a compact structured form, the last
// cities or places the chat showed (so "which is cheapest?" can refer to them), and the cities and
// countries Eurowander covers. Only structure goes in: the trip's notes, expenses and account details never do.
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { planBudget } from '../planner/budget.js'
import { computeStats } from '../planner/feasibility.js'
import { planLegs } from '../planner/plan.js'
import { tripMode } from './tripHandle.js'

const name = (id) => cityById[id]?.name || id
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function tripContext(handle, today) {
  if (!handle) return null
  const { plan, days } = handle
  const stats = computeStats(plan)
  const budget = planBudget(plan, days)
  const saved = handle.trip ? Object.keys(handle.trip.statuses || {}).filter((id) => placeById[id]).slice(0, 25).map((id) => placeById[id].name) : []
  const weather = handle.weatherByDay ? Object.entries(handle.weatherByDay).slice(0, 16).map(([n, w]) => ({ day: Number(n), kind: w.kind, rainChance: w.rain ?? null })) : null
  return {
    kind: handle.kind === 'built' ? 'built on the Build page' : 'My trip',
    name: handle.name || null,
    mode: tripMode(handle, today),
    dates: plan.prefs.startDate ? `${plan.prefs.startDate} to ${plan.prefs.endDate}` : null,
    travellers: plan.prefs.travellers,
    pace: stats.pace?.label || null,
    interests: plan.prefs.interests,
    stops: plan.stops.map((s) => ({ city: name(s.cityId), nights: s.nights })),
    countries: stats.countries.map((c) => countryByCode[c]?.name),
    legs: planLegs(plan).map((l) => ({ from: l.from.name, to: l.to.name, minutes: l.minutes, mode: l.mode, estimate: l.source !== 'sample' })),
    travelMinutes: stats.travelMinutes,
    budget: { estimate: budget.total, budget: budget.budget, currency: budget.currency },
    days: days.slice(0, 21).map((d) => ({
      day: d.number,
      date: d.date || null,
      weekday: d.date ? WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()] : null,
      city: name(d.cityId),
      places: d.items.filter((it) => it.placeId).map((it) => placeById[it.placeId]?.name || it.label).slice(0, 6),
    })),
    savedPlaces: saved,
    weather,
  }
}

// `travel`: Travel Mode's context (travel/travelContext.js) when the copilot was opened there, else null.
export function appContext({ route, handle, today, memory = {}, travel = null }) {
  const ctx = {
    today,
    travelMode: travel || undefined,
    page: {
      name: route?.name || 'home',
      city: route?.name === 'city' && cityById[route.id] ? name(route.id) : null,
      country: route?.name === 'country' && countryByCode[route.code] ? countryByCode[route.code].name : null,
    },
    trip: tripContext(handle, today),
    recent: {
      lastShown: (memory.lastList || []).slice(0, 8).map((id) => cityById[id]?.name || placeById[id]?.name).filter(Boolean),
      trainsShown: memory.lastTrains ? { from: cityById[memory.lastTrains.from]?.name, to: cityById[memory.lastTrains.to]?.name, date: memory.lastTrains.date, leavingAfter: memory.lastTrains.time, lastDeparture: memory.lastTrains.lastDeparture, maxChanges: memory.lastTrains.transfers ?? undefined } : undefined,
      lastCity: memory.anchorCity ? name(memory.anchorCity) : null,
      pending: memory.draft ? { building: 'new trip', ...memory.draft } : null,
      exchanges: (memory.exchanges || []).slice(-3),
    },
    cities: cities.map((c) => c.name),
    countries: countries.map((c) => c.name),
  }
  // Keep it under the server's limit (14,000 characters): the day list goes first, then Travel Mode's extras.
  const steps = [
    () => ctx.trip?.days && (ctx.trip.days = ctx.trip.days.filter((d) => !d.date || (d.date >= today && d.date <= addDays(today, 3)))),
    () => ctx.travelMode && (ctx.travelMode.savedInCity = undefined),
    () => ctx.trip && (ctx.trip.savedPlaces = ctx.trip.savedPlaces.slice(0, 8)),
  ]
  for (const step of steps) if (JSON.stringify(ctx).length > 13500) step()
  return ctx
}
