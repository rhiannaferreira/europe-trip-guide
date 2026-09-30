// Changes to a generated plan. Each one keeps the rest of the plan as it was wherever it can, and says
// what it did. Pure functions: they return { plan, summary, changed } and never change their input.
// `changed` is false (and the plan is the same object) when there was nothing sensible to do.
//
// Stops the traveller chose (start, end, must-visit) are never removed or replaced by the automatic
// changes ("more relaxed", "less train time"...); they can still be changed by hand.
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { alternativesFor, removalSavings } from './alternatives.js'
import { backtracking } from './feasibility.js'
import { planCityIds, planTotals, withStops } from './plan.js'
import { builderInterestById, paceById } from './preferences.js'
import { additionGain, allocateNights, bestOrder, candidatePool, cheapestInsertion, generatePlan, orderCost, targetStopCount } from './route.js'
import { interestFit, isFamous, scoreCity } from './scoring.js'

const name = (id) => cityById[id]?.name || id
const same = (plan, summary) => ({ plan, summary, changed: false })
const done = (plan, summary) => ({ plan, summary, changed: true })
const locked = (stop) => ['start', 'end', 'must'].includes(stop.role)
const plainOpts = (plan) => ({ transport: plan.prefs.transport, returnTo: plan.prefs.roundTrip ? plan.prefs.startCityId : '' })
const travelOf = (plan) => orderCost(planCityIds(plan), plainOpts(plan))
// Trips with fixed dates keep their length unless the traveller asks otherwise.
const keepsLength = (plan) => Boolean(plan.prefs.startDate)

// Give `n` nights to the neighbours of a removed stop, alternating previous / next.
function spreadNights(stops, index, n) {
  const out = stops.map((s) => ({ ...s }))
  const targets = [index - 1, index].filter((i) => i >= 0 && i < out.length)
  for (let k = 0; k < n && targets.length; k++) out[targets[k % targets.length]].nights++
  return out
}

// Take `n` nights from other stops (the longest stays first, never below 1 night).
function takeNights(stops, skipIndex, n) {
  const out = stops.map((s) => ({ ...s }))
  let taken = 0
  while (taken < n) {
    const donors = out.map((s, i) => ({ s, i })).filter(({ s, i }) => i !== skipIndex && s.nights > 1)
    if (!donors.length) break
    donors.sort((a, b) => b.s.nights - a.s.nights || b.i - a.i)[0].s.nights--
    taken++
  }
  return { stops: out, taken }
}

export function setNights(plan, index, nights, { keepLength = false } = {}) {
  const stop = plan.stops[index]
  if (!stop) return same(plan, 'That stop isn’t in the plan.')
  const target = Math.max(0, Math.min(30, Math.round(nights)))
  const delta = target - stop.nights
  if (delta === 0) return same(plan, `${name(stop.cityId)} already has ${target} night${target === 1 ? '' : 's'}.`)
  let stops = plan.stops.map((s, i) => (i === index ? { ...s, nights: target } : s))
  if (keepLength) {
    if (delta > 0) {
      const r = takeNights(stops, index, delta)
      if (r.taken < delta) return same(plan, 'There aren’t enough nights elsewhere to move without making the trip longer.')
      stops = r.stops
    } else {
      const giveTo = stops.map((s, i) => ({ s, i })).filter(({ i }) => i !== index).sort((a, b) => a.s.nights - b.s.nights)[0]
      if (!giveTo) return same(plan, 'A one-city trip can’t move nights elsewhere.')
      stops = stops.map((s, i) => (i === giveTo.i ? { ...s, nights: s.nights - delta } : s))
    }
  }
  const next = withStops(plan, stops)
  const { days } = planTotals(next)
  return done(
    next,
    `${name(stop.cityId)} now has ${target} night${target === 1 ? '' : 's'}.${keepLength ? ' Other stops were adjusted to keep the trip length.' : ` The trip is now ${days} days.`}`,
  )
}

export const changeNights = (plan, index, delta, opts) => setNights(plan, index, (plan.stops[index]?.nights ?? 0) + delta, opts)

export function moveStop(plan, index, delta) {
  const j = index + delta
  if (!plan.stops[index] || j < 0 || j >= plan.stops.length) return same(plan, 'That stop can’t move further.')
  const stops = [...plan.stops]
  ;[stops[index], stops[j]] = [stops[j], stops[index]]
  return done(withStops(plan, stops), `Moved ${name(plan.stops[index].cityId)} ${delta < 0 ? 'earlier' : 'later'}.`)
}

export function removeStop(plan, index, { keepLength = true } = {}) {
  const stop = plan.stops[index]
  if (!stop) return same(plan, 'That stop isn’t in the plan.')
  if (plan.stops.length === 1) return same(plan, 'A trip needs at least one city.')
  const rest = plan.stops.filter((_, i) => i !== index)
  const stops = keepLength ? spreadNights(rest, index, stop.nights) : rest
  const saved = travelOf(plan) - travelOf(withStops(plan, stops))
  return done(
    withStops(plan, stops),
    `Removed ${name(stop.cityId)}.${keepLength && stop.nights ? ` Its ${stop.nights} night${stop.nights === 1 ? '' : 's'} went to the neighbouring stop${index > 0 && index < rest.length ? 's' : ''}.` : ''}${saved >= 30 ? ` About ${formatDuration(saved)} less travel.` : ''}`,
  )
}

// Add a city at its cheapest place in the route (or at `index`).
export function addStop(plan, cityId, { nights = null, index = null, keepLength = keepsLength(plan) } = {}) {
  if (!cityById[cityId]) return same(plan, 'That city isn’t in Eurowander yet.')
  if (plan.stops.some((s) => s.cityId === cityId)) return same(plan, `${name(cityId)} is already in the plan.`)
  const ids = planCityIds(plan)
  const endFixed = !plan.prefs.roundTrip && plan.prefs.endCityId && ids[ids.length - 1] === plan.prefs.endCityId ? plan.prefs.endCityId : ''
  const at = index ?? cheapestInsertion(ids, cityId, { start: ids[0], end: endFixed, ...plainOpts(plan) }).index
  const [min, max] = cityById[cityId].recommendedDays || [2, 3]
  const want = nights ?? Math.max(1, Math.round(((min + max) / 2) * (plan.prefs.pace === 'relaxed' ? 1.3 : plan.prefs.pace === 'fast' ? 0.8 : 1)))
  let stops = [...plan.stops.slice(0, at), { cityId, nights: want, role: 'user', why: scoreCity(cityById[cityId], plan.prefs).reasons.slice(0, 3) }, ...plan.stops.slice(at)]
  let note = ''
  if (keepLength) {
    const r = takeNights(stops, at, want)
    stops = r.stops
    if (r.taken < want) {
      stops[at] = { ...stops[at], nights: r.taken || (planTotals(plan).nights === 0 ? 0 : 1) }
      note = r.taken ? ` Only ${r.taken} night${r.taken === 1 ? '' : 's'} could be freed up without making the trip longer.` : ''
    } else note = ' Nights were taken from the longest stays to keep the trip length.'
  }
  const next = withStops(plan, stops)
  const extra = travelOf(next) - travelOf(plan)
  const n = next.stops[at].nights
  return done(next, `Added ${name(cityId)} (${n} night${n === 1 ? '' : 's'}).${extra >= 30 ? ` About ${formatDuration(extra)} more travel.` : ''}${note}`)
}

export function replaceStop(plan, index, cityId) {
  const stop = plan.stops[index]
  if (!stop) return same(plan, 'That stop isn’t in the plan.')
  if (!cityById[cityId]) return same(plan, 'That city isn’t in Eurowander yet.')
  if (plan.stops.some((s, i) => s.cityId === cityId && i !== index)) return same(plan, `${name(cityId)} is already in the plan.`)
  const before = travelOf(plan)
  const stops = plan.stops.map((s, i) => (i === index ? { cityId, nights: s.nights, role: 'user', why: scoreCity(cityById[cityId], plan.prefs).reasons.slice(0, 3) } : s))
  const next = withStops(plan, stops)
  const delta = travelOf(next) - before
  const travel = Math.abs(delta) >= 30 ? ` ${delta > 0 ? 'Adds' : 'Saves'} about ${formatDuration(Math.abs(delta))} of travel.` : ''
  return done(next, `Replaced ${name(stop.cityId)} with ${name(cityId)} (${stop.nights} night${stop.nights === 1 ? '' : 's'}).${travel}`)
}

// "Give me another option": the best alternative not shown before.
export function anotherOption(plan, index, { seen = [], goal = {} } = {}) {
  const alt = alternativesFor(plan, index, { goal, exclude: seen, limit: 1 })[0]
  if (!alt) return same(plan, 'No other city fits this spot well.')
  const r = replaceStop(plan, index, alt.cityId)
  return { ...r, reasons: alt.reasons }
}

export function optimizeOrder(plan) {
  const { betterOrder, extraMinutes } = backtracking(plan)
  if (!betterOrder) return same(plan, 'The stops are already in the quickest order.')
  const byId = Object.fromEntries(plan.stops.map((s) => [s.cityId, s]))
  return done(withStops(plan, betterOrder.map((id) => byId[id])), `Reordered the stops to cut about ${formatDuration(extraMinutes)} of travel.`)
}

// Fewer stops: drop the stop that adds the least compared with the travel it costs.
export function makeRelaxed(plan) {
  if (plan.stops.length <= 1) return same(plan, 'This plan is already a single-city trip.')
  const savings = Object.fromEntries(removalSavings(plan).map((x) => [x.index, x.savedMinutes]))
  const candidates = plan.stops
    .map((s, index) => ({ s, index, value: scoreCity(cityById[s.cityId], plan.prefs).score - (savings[index] || 0) / 75 + s.nights * 0.3 }))
    .filter(({ s, index }) => index > 0 && !locked(s))
  if (!candidates.length) return same(plan, 'Every stop is one you chose, so none was removed. Remove one by hand, or add days.')
  const drop = candidates.sort((a, b) => a.value - b.value)[0]
  const r = removeStop(plan, drop.index, { keepLength: true })
  return done(r.plan, `For a more relaxed pace: ${r.summary}`)
}

// Less travel: first a better order, then swap the stop that costs the most travel for one nearer the
// route, or (with 6+ hours of travel) drop it.
export function reduceTravel(plan) {
  const order = optimizeOrder(plan)
  if (order.changed && backtracking(plan).extraMinutes >= 30) return order
  const worst = removalSavings(plan)
    .filter((x) => !locked(plan.stops[x.index]))
    .sort((a, b) => b.savedMinutes - a.savedMinutes)[0]
  if (!worst || worst.savedMinutes < 45) return same(plan, 'The route is already about as short as it can be with these cities.')
  const alt = alternativesFor(plan, worst.index, { goal: { lessTravel: true }, limit: 3 }).find((a) => a.deltaMinutes <= -45)
  if (alt) {
    const r = replaceStop(plan, worst.index, alt.cityId)
    return { ...r, reasons: alt.reasons }
  }
  // Only drop a city when travel is a real share of the trip (6 hours or more in total).
  if (plan.stops.length > 2 && travelOf(plan) >= 360) return removeStop(plan, worst.index, { keepLength: true })
  return same(plan, `Travel is already light (about ${formatDuration(travelOf(plan))} in total) and no nearby swap cuts it much.`)
}

// Cheaper: swap the priciest stop for a cheaper city nearby, or move a night to a cheaper stop.
export function makeCheaper(plan) {
  const priciest = plan.stops
    .map((s, index) => ({ s, index, level: cityById[s.cityId].costLevel }))
    .filter(({ s }) => !locked(s))
    .sort((a, b) => b.level - a.level || b.s.nights - a.s.nights)[0]
  if (priciest && priciest.level >= 2) {
    const alt = alternativesFor(plan, priciest.index, { goal: { cheaper: true }, limit: 5 }).find(
      (a) => cityById[a.cityId].costLevel < priciest.level && a.deltaMinutes <= 120,
    )
    if (alt) {
      const r = replaceStop(plan, priciest.index, alt.cityId)
      return { ...r, reasons: alt.reasons }
    }
  }
  const byCost = plan.stops.map((s, index) => ({ s, index, level: cityById[s.cityId].costLevel }))
  const dear = [...byCost].filter((x) => x.s.nights > 1).sort((a, b) => b.level - a.level)[0]
  const cheap = [...byCost].sort((a, b) => a.level - b.level)[0]
  if (dear && cheap && dear.level > cheap.level) {
    const stops = plan.stops.map((s, i) => (i === dear.index ? { ...s, nights: s.nights - 1 } : i === cheap.index ? { ...s, nights: s.nights + 1 } : s))
    return done(withStops(plan, stops), `Moved a night from ${name(dear.s.cityId)} to ${name(cheap.s.cityId)}, where day-to-day costs are usually lower.`)
  }
  return same(plan, 'Every stop already has similar day-to-day costs. Fewer paid sights or cheaper rooms would help most.')
}

// More hidden gems: swap the most famous stop for a quieter alternative.
export function moreGems(plan) {
  const famous = plan.stops.map((s, index) => ({ s, index })).filter(({ s }) => !locked(s) && isFamous(cityById[s.cityId]))
  for (const { index } of famous.sort((a, b) => b.s.nights - a.s.nights)) {
    const alt = alternativesFor(plan, index, { goal: { lessTouristy: true }, limit: 5 }).find((a) => cityById[a.cityId].hiddenGem && a.deltaMinutes <= 150)
    if (alt) {
      const r = replaceStop(plan, index, alt.cityId)
      return { ...r, reasons: alt.reasons }
    }
  }
  return same(plan, 'No hidden gem fits this route without a lot more travel. Try adding one from the ideas list.')
}

// More of one interest: note it in the preferences, and swap the stop weakest in it for a city known for it.
export function moreInterest(plan, interest) {
  const def = builderInterestById[interest]
  if (!def) return same(plan, 'That interest isn’t one Eurowander knows.')
  const prefs = plan.prefs.interests.includes(interest) ? plan.prefs : { ...plan.prefs, interests: [...plan.prefs.interests, interest] }
  const withPref = { ...plan, prefs }
  const strong = plan.stops.filter((s) => interestFit(cityById[s.cityId], interest) === 'strong').length
  if (strong >= Math.ceil(plan.stops.length / 2)) {
    return done(withPref, `${strong} of your ${plan.stops.length} stops are already known for ${def.label.toLowerCase()}. Day plans will now include more of it.`)
  }
  const weakest = plan.stops
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => !locked(s) && interestFit(cityById[s.cityId], interest) !== 'strong')
    .sort((a, b) => scoreCity(cityById[a.s.cityId], prefs).score - scoreCity(cityById[b.s.cityId], prefs).score)[0]
  if (weakest) {
    const alt = alternativesFor(withPref, weakest.index, { goal: { interest }, limit: 5 }).find(
      (a) => interestFit(cityById[a.cityId], interest) === 'strong' && a.deltaMinutes <= 150,
    )
    if (alt) {
      const r = replaceStop(withPref, weakest.index, alt.cityId)
      return { ...r, reasons: alt.reasons }
    }
  }
  return done(withPref, `No nearby swap adds much ${def.label.toLowerCase()}, so the cities stay. Day plans will now include more of it.`)
}

// Re-plan every stop from `index` on, keeping the ones before it (and a chosen end city).
export function regenerateFrom(plan, index) {
  if (index <= 0) {
    const exclude = plan.stops.filter((s) => !locked(s)).map((s) => s.cityId)
    const { plan: fresh } = generatePlan({ ...plan.prefs, days: planTotals(plan).days }, { exclude })
    return done({ ...fresh, prefs: { ...fresh.prefs, interests: plan.prefs.interests } }, 'Made a new plan with different cities.')
  }
  const keep = plan.stops.slice(0, index)
  const old = plan.stops.slice(index)
  const keptEnd = old.find((s) => s.role === 'end')
  const keptMust = old.filter((s) => s.role === 'must')
  const nightsLeft = old.reduce((n, s) => n + s.nights, 0)
  const prefs = { ...plan.prefs, nights: nightsLeft }
  const target = Math.max(keptMust.length + (keptEnd ? 1 : 0), targetStopCount(prefs))
  const exclude = new Set([...plan.stops.map((s) => s.cityId)])
  const opts = { transport: plan.prefs.transport, maxLegMinutes: plan.prefs.maxLegMinutes, returnTo: plan.prefs.roundTrip ? plan.prefs.startCityId : '' }
  const from = keep[keep.length - 1].cityId
  let tail = [...keptMust.map((s) => s.cityId), ...(keptEnd ? [keptEnd.cityId] : [])]
  const orderTail = (ids) => bestOrder([from, ...ids], { start: from, end: keptEnd?.cityId || '', ...opts }).slice(1)
  tail = orderTail(tail)
  const pool = candidatePool(plan.prefs).filter((c) => !exclude.has(c.id))
  while (tail.length < target) {
    let best = null
    for (const c of pool) {
      if (tail.includes(c.id)) continue
      const g = additionGain(c.id, [from, ...tail], { ...plan.prefs, startCityId: from, endCityId: keptEnd?.cityId || '', roundTrip: false })
      if (!best || g.gain > best.gain) best = { id: c.id, gain: g.gain }
    }
    if (!best || best.gain < -5) break
    tail = orderTail([...tail, best.id])
  }
  if (tail.length === 0) return same(plan, 'No other cities fit after this point.')
  const nights = allocateNights(tail, nightsLeft, plan.prefs)
  const roles = Object.fromEntries(old.map((s) => [s.cityId, s.role]))
  const stops = [
    ...keep,
    ...tail.map((cityId, i) => ({ cityId, nights: nights[i], role: roles[cityId] || 'pick', why: scoreCity(cityById[cityId], plan.prefs).reasons.slice(0, 3) })),
  ]
  return done(withStops(plan, stops), `Re-planned from ${name(tail[0])} on; the stops before it stayed the same.`)
}

// Apply a named change (the `fix` of a warning, a quick-action button, or a validated assistant action).
export function applyChange(plan, change) {
  switch (change?.type) {
    case 'make_relaxed':
      return makeRelaxed(plan)
    case 'reduce_travel':
      return reduceTravel(plan)
    case 'optimize_order':
      return optimizeOrder(plan)
    case 'make_cheaper':
      return makeCheaper(plan)
    case 'more_gems':
      return moreGems(plan)
    case 'more_interest':
      return moreInterest(plan, change.interest)
    case 'set_nights':
      return setNights(plan, change.index, change.nights, { keepLength: change.keepLength })
    case 'change_nights':
      return changeNights(plan, change.index, change.delta, { keepLength: change.keepLength })
    case 'remove':
      return removeStop(plan, change.index)
    case 'add':
      return addStop(plan, change.cityId, { nights: change.nights ?? null })
    case 'replace':
      return replaceStop(plan, change.index, change.cityId)
    case 'another':
      return anotherOption(plan, change.index, { seen: change.seen || [], goal: change.goal || {} })
    case 'move':
      return moveStop(plan, change.index, change.delta)
    case 'regenerate_from':
      return regenerateFrom(plan, change.index)
    default:
      return same(plan, 'Nothing to change.')
  }
}

export const paceLabel = (id) => paceById[id]?.label || id
