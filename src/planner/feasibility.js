// Trip statistics and feasibility warnings. Plain arithmetic on the plan, no AI and no guessing.
//
// How each number is worked out:
//   days, nights         a trip of N days has N − 1 nights (see plan.js)
//   transfers            journeys between stops, plus the journey home on a round trip
//   travel time          the sum of those journeys (sample times where Eurowander has them, labelled estimates otherwise)
//   days per city        trip days ÷ cities
//   pace                 the app's existing rule: under 2 days per city is fast-paced, 2–3 moderate, over 3 relaxed
//   share of waking time travel time ÷ (days × 16 waking hours)
//   travel days          days with an intercity journey
//   backtracking         how much longer this order is than the best order of the same cities (same start and end)
//
// Warnings are advice only; nothing stops the traveller from keeping the plan.
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { tripPace } from '../lib/trip.js'
import { planCityIds, planLegs, planTimeline, planTotals } from './plan.js'
import { bestOrder, orderCost, planRouteOptions } from './route.js'
import { LONG_LEG_MINUTES, VERY_LONG_LEG_MINUTES } from './transport.js'

export const WAKING_HOURS = 16
const PACE_ID = { 'Fast-paced': 'fast', Moderate: 'moderate', Relaxed: 'relaxed' }
const PACE_ORDER = { relaxed: 0, moderate: 1, fast: 2 }

// Extra travel minutes of the current order over the best order of the same cities.
export function backtracking(plan) {
  const ids = planCityIds(plan)
  if (ids.length < 3) return { extraMinutes: 0, betterOrder: null }
  const opts = planRouteOptions(plan)
  const { endCityId, roundTrip } = plan.prefs
  // The first stop stays first (it's where the traveller starts), and a chosen end stays last.
  const end = !roundTrip && endCityId && ids[ids.length - 1] === endCityId ? endCityId : ''
  const plain = { transport: opts.transport, returnTo: opts.returnTo }
  const best = bestOrder(ids, { start: ids[0], end, ...plain })
  const extra = orderCost(ids, plain) - orderCost(best, plain)
  return { extraMinutes: Math.max(0, Math.round(extra)), betterOrder: extra > 0.5 ? best : null }
}

export function computeStats(plan) {
  const legs = planLegs(plan)
  const { days, nights } = planTotals(plan)
  const ids = planCityIds(plan)
  const countries = [...new Set(ids.map((id) => cityById[id].country))]
  const travelMinutes = legs.reduce((s, l) => s + l.minutes, 0)
  const modes = {}
  for (const l of legs) modes[l.mode] = (modes[l.mode] || 0) + 1
  const timeline = planTimeline(plan, legs)
  const travelDayFlags = timeline.map((d) => Boolean(d.leg || d.departure))
  let run = 0
  let maxRun = 0
  for (const f of travelDayFlags) {
    run = f ? run + 1 : 0
    maxRun = Math.max(maxRun, run)
  }
  const pace = tripPace(days, ids.length)
  const limit = plan.prefs.maxLegMinutes
  return {
    days,
    nights,
    cities: ids.length,
    countries,
    transfers: legs.length,
    modes,
    travelMinutes,
    avgTransferMinutes: legs.length ? Math.round(travelMinutes / legs.length) : 0,
    longTransfers: legs.filter((l) => l.minutes >= LONG_LEG_MINUTES).length,
    overLimit: limit ? legs.filter((l) => l.minutes > limit) : [],
    estimatedLegs: legs.filter((l) => l.source !== 'sample').length,
    daysPerCity: ids.length ? days / ids.length : 0,
    pace: pace ? { label: pace.label, id: PACE_ID[pace.label], perCity: pace.perCity } : null,
    wakingShare: days ? travelMinutes / (days * WAKING_HOURS * 60) : 0,
    travelDays: travelDayFlags.filter(Boolean).length,
    maxConsecutiveTravelDays: maxRun,
    backtracking: backtracking(plan),
    legs,
  }
}

const hours = (m) => formatDuration(m)
// 240 → "4-hour", 150 → "2h 30m"
const limitText = (m) => (m % 60 === 0 ? `${m / 60}-hour` : formatDuration(m))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Warnings: [{ id, level: 'warn' | 'info', text, fix? }]. `fix` names a plan change from modify.js.
export function feasibilityWarnings(plan, stats = computeStats(plan)) {
  const out = []
  const { prefs } = plan
  const n = stats.cities
  if (n >= 3 && stats.daysPerCity < 1.5) {
    out.push({ id: 'rushed', level: 'warn', text: `${n} cities in ${stats.days} days may feel rushed.`, fix: { type: 'make_relaxed' } })
  }
  if (stats.travelMinutes >= 12 * 60 || stats.wakingShare > 0.15) {
    out.push({
      id: 'travel-heavy',
      level: 'warn',
      text: `Approximately ${hours(stats.travelMinutes)} of this trip would be spent traveling (about ${Math.round(stats.wakingShare * 100)}% of waking hours).`,
      fix: { type: 'reduce_travel' },
    })
  }
  if (stats.backtracking.extraMinutes >= 60 && stats.backtracking.extraMinutes >= stats.travelMinutes * 0.12) {
    out.push({
      id: 'backtracking',
      level: 'warn',
      text: `This route includes significant geographic backtracking. Reordering the stops saves about ${hours(stats.backtracking.extraMinutes)} of travel.`,
      fix: { type: 'optimize_order' },
    })
  }
  if (stats.maxConsecutiveTravelDays >= 3) {
    const words = { 3: 'Three', 4: 'Four', 5: 'Five' }
    out.push({
      id: 'travel-days',
      level: 'warn',
      text: `${words[stats.maxConsecutiveTravelDays] || stats.maxConsecutiveTravelDays} consecutive travel days may make this itinerary tiring.`,
      fix: { type: 'make_relaxed' },
    })
  }
  for (const leg of stats.overLimit) {
    const index = plan.stops.findIndex((s) => s.cityId === leg.to.id)
    out.push({
      id: `limit-${leg.from.id}-${leg.to.id}`,
      level: 'warn',
      text: `${leg.from.name} → ${leg.to.name} exceeds your preferred ${limitText(prefs.maxLegMinutes)} travel limit (~${hours(leg.minutes)}${leg.source === 'sample' ? '' : ', estimated'}).`,
      fix: leg.isReturn ? null : { type: 'alternatives', index },
    })
  }
  for (const leg of stats.legs) {
    if (leg.mode !== 'flight' && leg.minutes >= VERY_LONG_LEG_MINUTES) {
      out.push({
        id: `very-long-${leg.from.id}-${leg.to.id}`,
        level: 'info',
        text: `${leg.from.name} → ${leg.to.name} takes most of a day on the ground. A night train (where one runs) or a flight could save a day.`,
      })
    }
  }
  if (stats.pace && PACE_ORDER[stats.pace.id] !== PACE_ORDER[prefs.pace]) {
    const faster = PACE_ORDER[stats.pace.id] > PACE_ORDER[prefs.pace]
    out.push({
      id: 'pace',
      level: faster ? 'warn' : 'info',
      text: `This plan works out ${stats.pace.label.toLowerCase()} (${stats.pace.perCity.toFixed(1)} days per city), ${faster ? 'faster' : 'slower'} than the ${prefs.pace === 'fast' ? 'fast-paced' : prefs.pace} pace you chose.`,
      fix: faster ? { type: 'make_relaxed' } : null,
    })
  }
  plan.stops.forEach((s, i) => {
    if (s.nights === 0 && plan.stops.length > 1 && i < plan.stops.length - 1) {
      out.push({ id: `day-visit-${s.cityId}`, level: 'info', text: `${cityById[s.cityId].name} has no night, so it's a stop on the way rather than a stay.` })
    }
  })
  if (n === 1 && stats.days > 3) {
    out.push({ id: 'single-city', level: 'info', text: `One city for ${stats.days} days: no intercity travel. Its hidden gems or nearby towns could make good day trips.` })
  }
  if (stats.estimatedLegs > 0) {
    out.push({
      id: 'estimates',
      level: 'info',
      text: `${plural(stats.estimatedLegs, 'journey')} ${stats.estimatedLegs === 1 ? 'uses an estimate' : 'use estimates'} rather than a sample time. Check timetables before booking.`,
    })
  }
  return out
}
