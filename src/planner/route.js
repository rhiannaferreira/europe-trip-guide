// Route planning: which cities, in what order, and how many nights in each.
// Plain functions, no React. Every rule is written out so the plan can be explained.
//
// Order: the travel time of the whole route (legs from transport.js), plus a penalty for every minute a
// leg goes over the traveller's preferred maximum, so over-long legs are avoided when there's a choice.
// Up to 10 cities between a fixed start and end are ordered exactly (every order is considered, via
// dynamic programming); longer routes use nearest neighbour, then 2-opt swaps until nothing improves.
//
// Choosing cities (generatePlan):
//   1. Start with the cities the traveller named (start, must-visits, end). With none, the best-scoring city.
//   2. Aim for a number of cities from the pace: nights ÷ nights-per-city (relaxed 3.5, moderate 2.5, fast 1.75),
//      rounded, at least 1, at most one per night.
//   3. First, one city for every country the traveller wants to visit that the route doesn't cover yet
//      (the best-fitting one by the rule below), as long as the target allows.
//   4. Then add cities one at a time: the one with the best "fit points − extra travel" wins, where extra travel
//      is the cheapest place to slot it into the route (1 point per 75 minutes). A city within 60 km of a stop
//      already chosen loses 1.5 points (it's a day trip), and one in a country the route doesn't visit yet gains
//      0.75 (2 for a country the traveller asked for).
//   5. Stop at the target, or earlier when every remaining option would cost more than 5 points.
//   6. Order the chosen cities (above) and share out the nights (allocateNights).
import { cities, cityById } from '../data/cities.js'
import { distanceKm } from '../utils/distance.js'
import { normalizePreferences, paceById } from './preferences.js'
import { scoreCity } from './scoring.js'
import { travelMinutes } from './transport.js'

export const MINUTES_PER_POINT = 75
export const DAY_TRIP_KM = 60
export const GIVE_UP_GAIN = -5
export const MAX_STOPS = 12
const EXACT_LIMIT = 10

// Cost of one leg for ordering: minutes, plus the minutes over the preferred maximum counted again.
export function legCost(a, b, { transport = 'train', maxLegMinutes = null } = {}) {
  const m = travelMinutes(a, b, transport)
  return m + (maxLegMinutes ? Math.max(0, m - maxLegMinutes) : 0)
}

// Total cost of a route (with the journey home for a round trip).
export function orderCost(ids, opts = {}) {
  let cost = 0
  for (let i = 1; i < ids.length; i++) cost += legCost(ids[i - 1], ids[i], opts)
  if (opts.returnTo && ids.length && ids[ids.length - 1] !== opts.returnTo) cost += legCost(ids[ids.length - 1], opts.returnTo, opts)
  return cost
}

// Exact order for small sets: Held–Karp over the cities between the fixed ends.
function exactOrder(middle, start, end, opts) {
  const n = middle.length
  if (n === 0) return []
  const cost = (a, b) => (a === null ? 0 : legCost(a, b, opts))
  const tail = (id) => (end ? legCost(id, end, opts) : opts.returnTo ? legCost(id, opts.returnTo, opts) : 0)
  const size = 1 << n
  const dp = new Float64Array(size * n).fill(Infinity)
  const parent = new Int16Array(size * n).fill(-1)
  for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = cost(start, middle[j])
  for (let mask = 1; mask < size; mask++) {
    for (let j = 0; j < n; j++) {
      const here = dp[mask * n + j]
      if (!(mask & (1 << j)) || here === Infinity) continue
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue
        const next = mask | (1 << k)
        const c = here + legCost(middle[j], middle[k], opts)
        if (c < dp[next * n + k]) {
          dp[next * n + k] = c
          parent[next * n + k] = j
        }
      }
    }
  }
  const full = size - 1
  let best = 0
  let bestCost = Infinity
  for (let j = 0; j < n; j++) {
    const c = dp[full * n + j] + tail(middle[j])
    if (c < bestCost - 1e-9) {
      bestCost = c
      best = j
    }
  }
  const order = []
  let mask = full
  let j = best
  while (j !== -1) {
    order.push(middle[j])
    const p = parent[mask * n + j]
    mask &= ~(1 << j)
    j = p
  }
  return order.reverse()
}

// Nearest neighbour, then 2-opt, for long routes. Fixed ends stay put.
function heuristicOrder(middle, start, end, opts) {
  const left = [...middle]
  const order = []
  let here = start ?? left.shift()
  if (start === null) order.push(here)
  while (left.length) {
    let best = 0
    for (let i = 1; i < left.length; i++) if (legCost(here, left[i], opts) < legCost(here, left[best], opts)) best = i
    here = left.splice(best, 1)[0]
    order.push(here)
  }
  const full = () => [...(start ? [start] : []), ...order, ...(end ? [end] : [])]
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const before = orderCost(full(), opts)
        const seg = order.slice(i, k + 1).reverse()
        order.splice(i, seg.length, ...seg)
        if (orderCost(full(), opts) < before - 1e-9) improved = true
        else order.splice(i, seg.length, ...seg.reverse())
      }
    }
  }
  return order
}

// The best order for a set of cities. `start`/`end` are fixed if given (and must be in `ids`).
// With no start, any city can go first. `returnTo` adds the journey home to the cost.
export function bestOrder(ids, { start = '', end = '', ...opts } = {}) {
  const unique = [...new Set(ids)]
  const s = start && unique.includes(start) ? start : null
  const e = end && end !== s && unique.includes(end) ? end : null
  const middle = unique.filter((id) => id !== s && id !== e)
  const order = middle.length <= EXACT_LIMIT ? exactOrder(middle, s, e, opts) : heuristicOrder(middle, s, e, opts)
  return [...(s ? [s] : []), ...order, ...(e ? [e] : [])]
}

// Cheapest place to slot a city into an existing order (never before a fixed start or after a fixed end).
// Returns { index, delta } where delta is the extra cost.
export function cheapestInsertion(order, id, { start = '', end = '', ...opts } = {}) {
  const from = start && order[0] === start ? 1 : 0
  const to = end && order[order.length - 1] === end ? order.length - 1 : order.length
  const base = orderCost(order, opts)
  let best = { index: to, delta: Infinity }
  for (let i = from; i <= to; i++) {
    const next = [...order.slice(0, i), id, ...order.slice(i)]
    const delta = orderCost(next, opts) - base
    if (delta < best.delta) best = { index: i, delta }
  }
  return best
}

// Cities the planner may pick from: not in an avoided country, and in a wanted country when some are listed.
export function candidatePool(prefs, { exclude = [] } = {}) {
  const skip = new Set(exclude)
  return cities.filter(
    (c) =>
      !skip.has(c.id) &&
      !prefs.avoidCountries.includes(c.country) &&
      (prefs.includeCountries.length === 0 || prefs.includeCountries.includes(c.country)),
  )
}

export function targetStopCount(prefs) {
  if (prefs.nights <= 0) return 1
  const per = paceById[prefs.pace]?.nightsPerCity || 2.5
  return Math.max(1, Math.min(MAX_STOPS, prefs.nights, Math.round(prefs.nights / per)))
}

const routeOpts = (prefs) => ({
  transport: prefs.transport,
  maxLegMinutes: prefs.maxLegMinutes,
  returnTo: prefs.roundTrip ? prefs.startCityId : '',
})

// How good it is to add a city to a route: fit points minus the extra travel, with the day-trip and
// country rules above. Used when building a plan and when suggesting a city to add.
export function additionGain(cityId, order, prefs, { scores } = {}) {
  const city = cityById[cityId]
  const fit = scores?.[cityId] ?? scoreCity(city, prefs)
  const ends = { start: prefs.startCityId && order[0] === prefs.startCityId ? prefs.startCityId : '', end: !prefs.roundTrip && prefs.endCityId ? prefs.endCityId : '' }
  const ins = cheapestInsertion(order, cityId, { ...routeOpts(prefs), ...ends })
  let gain = fit.score - ins.delta / MINUTES_PER_POINT
  const nearest = Math.min(...order.map((id) => distanceKm(city, cityById[id])))
  if (nearest < DAY_TRIP_KM) gain -= 1.5
  const covered = new Set(order.map((id) => cityById[id].country))
  if (!covered.has(city.country)) gain += prefs.includeCountries.includes(city.country) ? 2 : 0.75
  return { gain, insertAt: ins.index, extraMinutes: ins.delta, fit }
}

// Share nights between stops.
// Each stop's weight is the middle of its typical stay (cities.js recommendedDays), times 1.3 for a relaxed
// pace or 0.8 for a fast one, plus 0.1 per fit point. Every stop gets 1 night first; the rest go out in
// proportion to the weights (largest remainders first). With fewer nights than stops, the earliest stops
// get one night each and the rest are day visits (0 nights).
// No stop gets more than its typical stay's upper end plus one (plus two when relaxed) while another stop
// still has room; spare nights move to the stop with the most room.
export function allocateNights(cityIds, totalNights, prefs, { fixed = {} } = {}) {
  const n = cityIds.length
  if (n === 0) return []
  if (totalNights <= 0) return cityIds.map(() => 0)
  const factor = prefs.pace === 'relaxed' ? 1.3 : prefs.pace === 'fast' ? 0.8 : 1
  const weight = cityIds.map((id) => {
    const c = cityById[id]
    const [min, max] = c.recommendedDays || [2, 3]
    return Math.max(0.5, ((min + max) / 2) * factor + 0.1 * scoreCity(c, prefs).score)
  })
  const nights = cityIds.map((id) => (Number.isInteger(fixed[id]) ? fixed[id] : null))
  const fixedSum = nights.reduce((s, v) => s + (v ?? 0), 0)
  const free = nights.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0)
  let left = totalNights - fixedSum
  if (free.length === 0) return nights
  if (left < free.length) {
    // Not enough for one night each.
    free.forEach((i) => {
      nights[i] = left > 0 ? 1 : 0
      left--
    })
    return nights
  }
  free.forEach((i) => (nights[i] = 1))
  left -= free.length
  const wSum = free.reduce((s, i) => s + weight[i], 0)
  const share = free.map((i) => ({ i, exact: (left * weight[i]) / wSum }))
  share.forEach(({ i, exact }) => (nights[i] += Math.floor(exact)))
  let rest = left - share.reduce((s, x) => s + Math.floor(x.exact), 0)
  share
    .sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || a.i - b.i)
    .forEach(({ i }) => {
      if (rest > 0) {
        nights[i]++
        rest--
      }
    })
  const cap = (i) => (cityById[cityIds[i]].recommendedDays?.[1] || 3) + (prefs.pace === 'relaxed' ? 2 : 1)
  for (let guard = 0; guard < totalNights; guard++) {
    const over = free.find((i) => nights[i] > cap(i))
    const room = free.filter((i) => nights[i] < cap(i)).sort((a, b) => cap(b) - nights[b] - (cap(a) - nights[a]))[0]
    if (over === undefined || room === undefined) break
    nights[over]--
    nights[room]++
  }
  return nights
}

// Builds a plan from preferences.
// Returns { plan, notes } where plan = { version, prefs, stops: [{ cityId, nights, role, why }] }.
// `exclude` keeps cities out (used for "try another plan"). Never throws on bad input.
export function generatePlan(input, { exclude = [], today } = {}) {
  const { prefs, notes } = normalizePreferences(input, today ? { today } : undefined)
  const opts = routeOpts(prefs)
  const pool = candidatePool(prefs, { exclude })
  const scores = Object.fromEntries(cities.map((c) => [c.id, scoreCity(c, prefs)]))

  const required = [...new Set([prefs.startCityId, ...prefs.mustVisit, prefs.roundTrip ? '' : prefs.endCityId].filter(Boolean))]
  let chosen = [...required]
  if (chosen.length === 0) {
    const best = [...pool].sort((a, b) => scores[b.id].score - scores[a.id].score || a.name.localeCompare(b.name))[0] || cities[0]
    chosen = [best.id]
  }
  const target = Math.max(targetStopCount(prefs), Math.min(chosen.length, MAX_STOPS))
  if (required.length > Math.max(1, prefs.nights)) {
    notes.push({ level: 'warn', field: 'mustVisit', text: `You picked ${required.length} cities for ${prefs.nights} night${prefs.nights === 1 ? '' : 's'}, so some will be short visits.` })
  }

  const ends = () => ({ start: prefs.startCityId || '', end: prefs.roundTrip ? '' : prefs.endCityId || '' })
  let order = bestOrder(chosen, { ...ends(), ...opts })
  const pick = (list) => {
    let best = null
    for (const c of list) {
      if (order.includes(c.id)) continue
      const g = additionGain(c.id, order, prefs, { scores })
      if (!best || g.gain > best.gain) best = { id: c.id, ...g }
    }
    return best
  }
  // Wanted countries first.
  for (const code of prefs.includeCountries) {
    if (order.length >= target) break
    if (order.some((id) => cityById[id].country === code)) continue
    const best = pick(pool.filter((c) => c.country === code))
    if (best) order = bestOrder([...order, best.id], { ...ends(), ...opts })
  }
  while (order.length < target) {
    const best = pick(pool)
    if (!best || best.gain < GIVE_UP_GAIN) break
    order = bestOrder([...order, best.id], { ...ends(), ...opts })
  }
  if (order.length < target && prefs.nights > 0) {
    notes.push({ level: 'info', field: 'pace', text: 'Fewer cities than your pace allows fitted well, so each stop gets more time.' })
  }
  if (pool.length === 0) notes.push({ level: 'warn', field: 'includeCountries', text: 'No cities match those countries, so only the cities you named are used.' })

  const nights = allocateNights(order, prefs.nights, prefs)
  const stops = order.map((cityId, i) => ({
    cityId,
    nights: nights[i],
    role: cityId === prefs.startCityId ? 'start' : cityId === prefs.endCityId && !prefs.roundTrip ? 'end' : prefs.mustVisit.includes(cityId) ? 'must' : 'pick',
    why: scores[cityId].reasons.slice(0, 3),
  }))
  return { plan: { version: 1, prefs, stops }, notes }
}

// The plan's cities in order, and the options used for ordering, for other modules.
export const planIds = (plan) => plan.stops.map((s) => s.cityId)
export const planRouteOptions = (plan) => routeOpts(plan.prefs)
