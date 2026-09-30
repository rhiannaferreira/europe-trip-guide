// Budget for a generated plan, using the app's existing estimates (utils/budgetCalculations.js,
// data/costs.js): rooms, food and local transport from each city's cost level, train fares from distance,
// entry fees from the places on the day plans. Rough planning numbers, never real prices.
//
//   Accommodation, Food, Transportation, Activities   from autoEstimates (same rules as the Budget tab)
//   Other                                             10% of those four, for extras (SIM, laundry, souvenirs)
//   Fits / tight / over                               estimate ≤ 90% of the budget / ≤ 100% / above it
import { cityById } from '../data/cities.js'
import { COST_LEVELS, CURRENCIES, perPersonDay } from '../data/costs.js'
import { autoEstimates, formatMoney } from '../utils/budgetCalculations.js'
import { planLegs, planTotals, stopDays } from './plan.js'

export const OTHER_SHARE = 0.1

export function planBudget(plan, dayPlans = [], { levelOverrides = {} } = {}) {
  const { prefs } = plan
  const legs = planLegs(plan)
  const days = stopDays(plan)
  const placeIdsByStop = plan.stops.map((s) => dayPlans.filter((d) => d.cityId === s.cityId).flatMap((d) => d.items.map((it) => it.placeId).filter(Boolean)))
  const stops = plan.stops.map((s, i) => ({ cityId: s.cityId, placeIds: placeIdsByStop[i], days: days[i] }))
  const { days: totalDays } = planTotals(plan)
  const auto = autoEstimates({ stops, totalDays, legs, levelOverrides, travellers: prefs.travellers, currency: prefs.currency })
  const main = [
    { id: 'accommodation', label: 'Accommodation', icon: '🛏️', ...auto.accommodation },
    { id: 'transportation', label: 'Transportation', icon: '🚆', ...auto.transportation },
    { id: 'food', label: 'Food', icon: '🍽️', ...auto.food },
    { id: 'activities', label: 'Activities', icon: '🎟️', amount: auto.attractions.amount, detail: auto.attractions.detail.replace('saved place', 'planned place') },
  ]
  if (legs.some((l) => l.mode === 'flight')) main[1].detail += '. Flight legs use the same rough distance rule; real fares vary a lot.'
  const subtotal = main.reduce((s, c) => s + c.amount, 0)
  const other = { id: 'other', label: 'Other', icon: '📦', amount: Math.round(subtotal * OTHER_SHARE), detail: '10% on top for extras like a SIM card, laundry and souvenirs' }
  const categories = [...main, other]
  const total = subtotal + other.amount
  const budget = prefs.budget
  const status = budget == null ? 'none' : total <= budget * 0.9 ? 'fits' : total <= budget ? 'tight' : 'over'
  const rate = CURRENCIES[prefs.currency]?.perEuro || 1
  const perCity = plan.stops.map((s, i) => {
    const level = COST_LEVELS[levelOverrides[s.cityId] ?? cityById[s.cityId].costLevel]
    return { cityId: s.cityId, nights: s.nights, level: level?.label || 'Unknown', perPersonDay: level ? Math.round(perPersonDay(level) * rate) : null, days: days[i] }
  })
  return {
    currency: prefs.currency,
    categories,
    total,
    perPerson: Math.round(total / Math.max(1, prefs.travellers)),
    budget,
    remaining: budget == null ? null : budget - total,
    status,
    perCity,
    missingCost: auto.missingCost,
    suggestions: status === 'tight' || status === 'over' ? budgetSuggestions(plan, { categories, total, perCity }) : [],
  }
}

function budgetSuggestions(plan, { categories, total, perCity }) {
  const out = []
  const money = (n) => formatMoney(n, plan.prefs.currency)
  const dear = perCity.filter((c) => c.perPersonDay && cityById[c.cityId].costLevel === 3 && c.nights > 0)
  if (dear.length) {
    const names = dear.map((c) => cityById[c.cityId].name)
    out.push({
      text: `${names.join(' and ')} ${names.length === 1 ? 'is' : 'are'} the priciest stop${names.length === 1 ? '' : 's'} (about ${money(dear[0].perPersonDay)} per person per day for a room share, food and local transport). Fewer nights there, or a cheaper city instead, saves the most.`,
      fix: { type: 'make_cheaper' },
    })
    const gems = dear.flatMap((c) => cityById[c.cityId].hiddenGems.map((g) => cityById[g]).filter(Boolean)).slice(0, 3)
    if (gems.length) out.push({ text: `Nearby hidden gems are usually cheaper: ${gems.map((g) => g.name).join(', ')}.`, fix: { type: 'more_gems' } })
  }
  const cheapest = [...perCity].filter((c) => c.perPersonDay).sort((a, b) => a.perPersonDay - b.perPersonDay)[0]
  if (cheapest && dear.length && cheapest.perPersonDay < dear[0].perPersonDay) {
    out.push({ text: `More nights in ${cityById[cheapest.cityId].name}, the lowest-cost stop, stretches the budget further.` })
  }
  const activities = categories.find((c) => c.id === 'activities')
  if (activities.amount > total * 0.1) out.push({ text: `Planned entry fees come to about ${money(activities.amount)}. Swapping a few paid sights for free ones (parks, viewpoints, old towns) helps.` })
  return out
}
