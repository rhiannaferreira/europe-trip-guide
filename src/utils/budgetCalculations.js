// Budget maths. Every number here is a rough planning estimate from hardcoded sample data.
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { BUDGET_CATEGORIES, COST_LEVELS, CURRENCIES, TRAIN_EUR_PER_KM, TRAIN_MIN_EUR } from '../data/costs.js'
import { allocateDays } from './tripCalculations.js'

// Turn user input into a money amount. Returns null for empty, negative or non-numeric input.
export function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(String(value).replace(/[, ]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export const currencyOf = (code) => CURRENCIES[code] || CURRENCIES.EUR

export function formatMoney(amount, code = 'EUR') {
  const { symbol } = currencyOf(code)
  const sign = amount < 0 ? '−' : ''
  return `${sign}${symbol}${Math.round(Math.abs(amount)).toLocaleString('en-GB')}`
}

// The cost level used for a city: the user's override, else the city's sample costLevel, else null (no data).
export function cityCostLevel(cityId, overrides = {}) {
  const level = overrides[cityId] ?? cityById[cityId]?.costLevel
  return COST_LEVELS[level] || null
}

export const trainFareEur = (km) => Math.max(TRAIN_MIN_EUR, Math.round(km * TRAIN_EUR_PER_KM))

// Built-in estimates for the four categories we can guess from the trip, in the chosen currency.
// Returns { accommodation, food, transportation, attractions }, each { amount, detail }, plus `missingCost`
// (cities with no cost data, which are left out rather than guessed).
export function autoEstimates({ stops, totalDays, legs, levelOverrides, travellers, currency }) {
  const rate = currencyOf(currency).perEuro
  const people = Math.max(1, travellers || 1)
  const rooms = Math.ceil(people / 2)
  const counts = allocateDays(totalDays || 0, stops)
  const missingCost = []
  let nights = 0
  let accommodation = 0
  let food = 0
  let local = 0

  stops.forEach((stop, i) => {
    const level = cityCostLevel(stop.cityId, levelOverrides)
    const days = counts[i]
    // Nights: each day of a stop is a night there, except the very last day of the trip.
    const stopNights = i === stops.length - 1 ? Math.max(0, days - 1) : days
    if (!level) {
      if (days > 0) missingCost.push(cityById[stop.cityId]?.name || stop.cityId)
      return
    }
    nights += stopNights
    accommodation += stopNights * level.room * rooms
    food += days * level.food * people
    local += days * level.local * people
  })

  const fares = legs.reduce((sum, leg) => sum + trainFareEur(leg.km), 0) * people
  const savedIds = stops.flatMap((s) => s.placeIds)
  const entries = savedIds.reduce((sum, id) => sum + (placeById[id]?.estimatedCost || 0), 0) * people

  const r = (eur) => Math.round(eur * rate)
  const who = people === 1 ? '1 person' : `${people} people`
  const noDates = !totalDays
  return {
    accommodation: {
      amount: r(accommodation),
      detail: noDates ? 'Add trip dates to estimate nights.' : `${nights} night${nights === 1 ? '' : 's'}, ${rooms} room${rooms === 1 ? '' : 's'} at each city's cost level`,
    },
    food: { amount: r(food), detail: noDates ? 'Add trip dates to estimate meals.' : `${totalDays} days of meals for ${who}` },
    transportation: {
      amount: r(fares + local),
      detail: `${legs.length} train journey${legs.length === 1 ? '' : 's'} (rough fares from distance)${noDates ? '' : ' plus local transport'} for ${who}`,
    },
    attractions: { amount: r(entries), detail: `Entry to ${savedIds.length} saved place${savedIds.length === 1 ? '' : 's'} for ${who}` },
    missingCost,
  }
}

// Totals for the planner. For each category:
//   estimate  the built-in estimate, or the user's own estimate if they typed one, or 0 if they switched it off
//   expenses  the sum of expenses the user added in that category
//   total     estimate + expenses
// Budget, estimated spending and remaining come from these. `remaining` is null when no valid budget is set.
export function summarizeBudget(budget, autos) {
  const categories = BUDGET_CATEGORIES.map((cat) => {
    const auto = autos[cat.id]
    const setting = budget.estimates?.[cat.id] || {}
    const own = parseAmount(setting.amount)
    const estimate = setting.off ? 0 : own ?? auto?.amount ?? 0
    const items = budget.expenses.filter((e) => e.category === cat.id)
    const expenses = items.reduce((sum, e) => sum + (parseAmount(e.amount) || 0), 0)
    return { ...cat, auto, own, off: Boolean(setting.off), estimate, items, expenses, total: estimate + expenses }
  })
  const estimated = categories.reduce((sum, c) => sum + c.total, 0)
  const paid = budget.expenses.filter((e) => e.kind === 'paid').reduce((sum, e) => sum + (parseAmount(e.amount) || 0), 0)
  const total = parseAmount(budget.total)
  return { categories, estimated, paid, total, remaining: total === null ? null : total - estimated }
}
