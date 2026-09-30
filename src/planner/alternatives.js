// Alternatives: other cities that could take a stop's place, cities worth adding, and the stop that costs
// the route the most travel. Every suggestion comes with short reasons drawn from the data.
//
// Ranking an alternative for a stop:
//   fit points (scoring.js)
//   − extra travel compared with the current stop, 1 point per 75 minutes (saving travel adds points)
//   + 1.5 when it's one of the current city's listed hidden gems
//   + goal points:  lessTouristy  hidden gem +3, famous −2
//                   cheaper       +2 per cost level below the current city, −2 per level above
//                   lessTravel    another point per 40 minutes saved
//                   interest      +3 when the city is known for it
//   A city that would create a journey over the preferred maximum loses 3 points.
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { distanceKm } from '../utils/distance.js'
import { builderInterestById } from './preferences.js'
import { additionGain, candidatePool, MINUTES_PER_POINT, orderCost } from './route.js'
import { interestFit, kindOf, scoreCity } from './scoring.js'
import { planCityIds } from './plan.js'
import { travelMinutes } from './transport.js'

const plainOpts = (plan) => ({ transport: plan.prefs.transport, returnTo: plan.prefs.roundTrip ? plan.prefs.startCityId : '' })

function travelText(delta) {
  if (delta <= -30) return `Saves about ${formatDuration(-delta)} of travel`
  if (delta < 30) return 'About the same travel time'
  if (delta <= 150) return `Adds only ~${formatDuration(delta)} of travel`
  return `Adds ~${formatDuration(delta)} of travel`
}

// Replacement ideas for the stop at `index`: [{ cityId, deltaMinutes, reasons, overLimit }], best first.
export function alternativesFor(plan, index, { goal = {}, exclude = [], limit = 4 } = {}) {
  const ids = planCityIds(plan)
  const current = cityById[ids[index]]
  if (!current) return []
  const opts = plainOpts(plan)
  const base = orderCost(ids, opts)
  const skip = new Set([...ids, ...exclude])
  const max = plan.prefs.maxLegMinutes
  const out = []
  for (const city of candidatePool(plan.prefs)) {
    if (skip.has(city.id)) continue
    const next = [...ids]
    next[index] = city.id
    const delta = orderCost(next, opts) - base
    const fit = scoreCity(city, plan.prefs)
    let value = fit.score - Math.max(-240, delta) / MINUTES_PER_POINT
    const reasons = [travelText(delta)]
    if (current.hiddenGems.includes(city.id)) {
      value += 1.5
      reasons.push(`A quieter alternative to ${current.name}`)
    }
    const kind = kindOf(city)
    if (goal.lessTouristy) {
      value += kind === 'gem' ? 3 : kind === 'famous' ? -2 : 0
      if (kind !== 'famous' && !reasons.some((r) => r.startsWith('A quieter'))) reasons.push(`Less tourist-heavy than ${current.name}`)
    }
    if (goal.cheaper) {
      const diff = current.costLevel - city.costLevel
      value += diff * 2
      if (diff > 0) reasons.push(`Day-to-day costs are usually lower than in ${current.name}`)
    }
    if (goal.lessTravel && delta < 0) value += -delta / 40
    if (goal.interest) {
      const def = builderInterestById[goal.interest]
      if (interestFit(city, goal.interest) === 'strong') {
        value += 3
        reasons.push(`Known for ${def?.label.toLowerCase() || goal.interest}`)
      }
    }
    const prev = ids[index - 1]
    const nextId = ids[index + 1]
    const legs = [prev && travelMinutes(prev, city.id, opts.transport), nextId && travelMinutes(city.id, nextId, opts.transport)].filter(Boolean)
    const overLimit = Boolean(max && legs.some((m) => m > max))
    if (overLimit) value -= 3
    for (const r of fit.reasons) if (!reasons.includes(r) && reasons.length < 4) reasons.push(r)
    if (goal.maxAdditionalTravelMinutes != null && delta > goal.maxAdditionalTravelMinutes) continue
    out.push({ cityId: city.id, deltaMinutes: Math.round(delta), reasons: reasons.slice(0, 4), overLimit, value })
  }
  return out.sort((a, b) => b.value - a.value || a.cityId.localeCompare(b.cityId)).slice(0, limit)
}

// Cities worth adding: [{ cityId, insertAt, extraMinutes, reasons }], best first.
export function additionIdeas(plan, { interest = null, gemsOnly = false, limit = 4 } = {}) {
  const ids = planCityIds(plan)
  if (ids.length === 0) return []
  const prefs = interest && !plan.prefs.interests.includes(interest) ? { ...plan.prefs, interests: [...plan.prefs.interests, interest] } : plan.prefs
  const out = []
  for (const city of candidatePool(prefs)) {
    if (ids.includes(city.id)) continue
    if (gemsOnly && !city.hiddenGem) continue
    if (interest && interestFit(city, interest) !== 'strong') continue
    const g = additionGain(city.id, ids, prefs)
    const reasons = [travelText(g.extraMinutes), ...g.fit.reasons].slice(0, 4)
    out.push({ cityId: city.id, insertAt: g.insertAt, extraMinutes: Math.round(g.extraMinutes), reasons, value: g.gain })
  }
  return out.sort((a, b) => b.value - a.value || a.cityId.localeCompare(b.cityId)).slice(0, limit)
}

// Travel saved by dropping each stop: [{ index, cityId, savedMinutes }]. The first stop is where the trip
// starts, so it isn't listed.
export function removalSavings(plan) {
  const ids = planCityIds(plan)
  const opts = plainOpts(plan)
  const base = orderCost(ids, opts)
  return ids
    .map((cityId, index) => ({ index, cityId, savedMinutes: index === 0 ? 0 : Math.round(base - orderCost(ids.filter((_, i) => i !== index), opts)) }))
    .filter((x) => x.index > 0)
}

// The stop that adds the most travel, when it adds a lot (at least 3 hours, and at least 40% of the trip's
// travel, or a journey over the preferred maximum). Null when the route has no such outlier.
export function costlyStop(plan) {
  if (plan.stops.length < 3) return null
  const ids = planCityIds(plan)
  const opts = plainOpts(plan)
  const total = orderCost(ids, opts)
  const worst = removalSavings(plan)
    .filter((x) => !['start', 'end'].includes(plan.stops[x.index].role))
    .sort((a, b) => b.savedMinutes - a.savedMinutes)[0]
  if (!worst || worst.savedMinutes < 180 || worst.savedMinutes < total * 0.4) return null
  const city = cityById[worst.cityId]
  return {
    ...worst,
    text: `${city.name} adds significant travel time to this route (about ${formatDuration(worst.savedMinutes)} more than skipping it).`,
    alternatives: alternativesFor(plan, worst.index, { goal: { lessTravel: true }, limit: 4 }),
  }
}

// The closest listed hidden gems to a city (used for "somewhere less touristy").
export const gemsNear = (cityId, limit = 3) => {
  const city = cityById[cityId]
  return Object.values(cityById)
    .filter((c) => c.hiddenGem && c.id !== cityId)
    .sort((a, b) => distanceKm(city, a) - distanceKm(city, b))
    .slice(0, limit)
    .map((c) => c.id)
}
