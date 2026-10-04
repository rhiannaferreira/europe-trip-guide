// Answers and proposed changes for the open trip (My trip or the Build page's plan; see tripHandle.js).
// The planner (planner/) works out every change; this file only shapes the result: a before/after preview
// for each option, and the numbers behind it. Nothing is applied here; the panel applies an option when
// the traveller presses Apply, through the trip handle, so the real trip stays the only copy.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById, placesInCity } from '../data/places.js'
import { formatDuration, monthNames, monthRange } from '../lib/format.js'
import { formatMoney } from '../utils/budgetCalculations.js'
import { nearbyPlaces } from '../utils/nearby.js'
import { optimizeDay } from '../utils/routeOptimizer.js'
import { additionIdeas, alternativesFor, costlyStop, removalSavings } from '../planner/alternatives.js'
import { runAction } from '../planner/assistant/run.js'
import { planBudget } from '../planner/budget.js'
import { dayCapacity, dayLoad, planDays } from '../planner/dayPlanner.js'
import { computeStats, feasibilityWarnings } from '../planner/feasibility.js'
import { addStop, applyChange, changeNights, removeStop, replaceStop } from '../planner/modify.js'
import { planLegs, stopDays } from '../planner/plan.js'
import { classifyForecast } from '../planner/weatherPlan.js'
import { tripKey } from './tripHandle.js'
import { cityName, list } from './appRun.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const dayName = (d) => (d?.date ? `${WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()]} (day ${d.number})` : `Day ${d?.number}`)
const placeName = (id) => placeById[id]?.name || id
const hours = (m) => formatDuration(Math.round(m))

// Numbers for a before/after preview of a plan change.
export function preview(handle, next, nextDays = null) {
  const before = handle.plan
  const cost = (plan, days) => planBudget(plan, days).total
  const sameDays = next === before
  return {
    before: before.stops.map((s) => ({ cityId: s.cityId, nights: s.nights })),
    after: next.stops.map((s) => ({ cityId: s.cityId, nights: s.nights })),
    travel: [computeStats(before).travelMinutes, computeStats(next).travelMinutes],
    // Day plans only count when the change is to the days; otherwise compare stays and journeys alone.
    cost: [cost(before, sameDays ? handle.days : []), cost(next, sameDays ? nextDays || handle.days : [])],
    currency: before.prefs.currency,
    days: nextDays ? dayDiff(handle.days, nextDays) : null,
  }
}

function dayDiff(before, after) {
  return after
    .filter((d) => {
      const b = before.find((x) => x.number === d.number)
      return b && JSON.stringify(b.items.map((i) => i.placeId)) !== JSON.stringify(d.items.map((i) => i.placeId))
    })
    .map((d) => ({ number: d.number, date: d.date, cityId: d.cityId, before: before.find((x) => x.number === d.number).items.filter((i) => i.placeId).map((i) => placeName(i.placeId)), after: d.items.filter((i) => i.placeId).map((i) => placeName(i.placeId)) }))
}

const option = (handle, title, plan, days = null, detail = '') => ({ title, detail, plan, days, preview: preview(handle, plan, days) })
const optionsBlock = (handle, opts) => ({ type: 'options', key: tripKey(handle), options: dedupe(opts).slice(0, 3) })
const dedupe = (opts) => opts.filter((o, i) => opts.findIndex((x) => JSON.stringify(x.plan.stops.map((s) => [s.cityId, s.nights])) === JSON.stringify(o.plan.stops.map((s) => [s.cityId, s.nights])) && x.days === o.days) === i)
const savingText = (o, currency) => {
  const d = o.preview.cost[0] - o.preview.cost[1]
  return d > 0 ? `Saves about ${formatMoney(d, currency)} (estimate)` : ''
}
const travelSaving = (o) => {
  const d = o.preview.travel[0] - o.preview.travel[1]
  return d > 0 ? `About ${hours(d)} less travel` : d < 0 ? `About ${hours(-d)} more travel` : ''
}
const keep = { label: 'Keep current trip', effect: { type: 'dismiss' } }

// The planner's own assistant action (planner/assistant/run.js) for this copilot action, when there is one.
function legacy(a, handle) {
  const ids = handle.plan.stops.map((s) => s.cityId)
  const index = a.targetCity ? ids.indexOf(a.targetCity) : undefined
  const base = { reply: '', targetCity: a.targetCity, index }
  switch (a.action) {
    case 'replace_city':
      return { ...base, action: 'replace_city', city: a.city, lessTouristy: a.hiddenGems, cheaper: a.cheaper, maxAdditionalTravelMinutes: null }
    case 'change_nights':
      return { ...base, action: 'change_nights', delta: a.delta, nights: a.nights }
    case 'make_relaxed':
    case 'optimize_route':
    case 'lighten_day':
    case 'rain_plan':
      return { ...base, action: a.action, day: a.day }
    case 'more_interest':
      return { ...base, action: 'more_interest', interest: a.interests[0] }
    case 'move_category_to_day':
      return { ...base, action: 'move_category_to_day', day: a.day }
    default:
      return null
  }
}

// Turn a planner result into options with previews.
function fromPlanner(r, handle, a) {
  if (r.kind === 'answer' || r.kind === 'none') return { text: r.text }
  const sameStops = (p) => JSON.stringify(p.stops.map((x) => [x.cityId, x.nights])) === JSON.stringify(handle.plan.stops.map((x) => [x.cityId, x.nights]))
  // A change that only touches preferences (e.g. "more nightlife" when every stop already has it) isn't a change to apply.
  if (sameStops(r.plan) && !(r.plan === handle.plan && r.days)) return { text: r.summary }
  const main = option(handle, r.summary, r.plan, r.plan === handle.plan ? r.days : null, (r.reasons || []).join(' · '))
  const alts = (r.options || []).map((o) => {
    const x = applyChange(handle.plan, o.change)
    return x.changed ? option(handle, x.summary, x.plan, null, o.reasons.join(' · ')) : null
  }).filter(Boolean)
  const opts = [main, ...alts]
  return {
    text: opts.length > 1 ? `Here’s my suggestion, with ${opts.length - 1} other option${opts.length === 2 ? '' : 's'}:` : 'Here’s what that would change:',
    blocks: [optionsBlock(handle, opts)],
    followUps: [keep, ...(a.action === 'replace_city' ? [{ label: 'Something quieter', prompt: `Replace ${cityName(a.targetCity)} with somewhere less touristy` }] : [])],
    sources: ['estimate'],
  }
}

// `ctx`: { handle, weatherByDay (by trip day; may be {}), today }
export function runTripAction(a, ctx) {
  const { handle } = ctx
  const { plan, days } = handle
  const currency = plan.prefs.currency
  const weather = ctx.weatherByDay || handle.weatherByDay || {}
  const L = legacy(a, handle)

  switch (a.action) {
    case 'add_city': {
      if (a.city) {
        const r = addStop(plan, a.city, { nights: a.nights })
        if (!r.changed) return { text: r.summary }
        return { text: `Adding ${cityName(a.city)}. Here’s how the trip would look:`, blocks: [optionsBlock(handle, [option(handle, r.summary, r.plan)])], followUps: [keep], sources: ['estimate'] }
      }
      const ideas = additionIdeas(plan, { interest: a.interests[0] || null, gemsOnly: a.hiddenGems, limit: 3 })
      if (!ideas.length) return { text: 'No city fits this route well enough to add.' }
      return {
        text: `${ideas.length === 1 ? 'One city fits' : `${ideas.length} cities fit`} your route:`,
        blocks: [optionsBlock(handle, ideas.map((i) => { const r = addStop(plan, i.cityId); return option(handle, `Add ${cityName(i.cityId)}`, r.plan, null, i.reasons.join(' · ')) }))],
        followUps: [keep],
        sources: ['estimate'],
      }
    }
    case 'more_gems': {
      const ideas = additionIdeas(plan, { gemsOnly: true, limit: 2 })
      const swap = applyChange(plan, { type: 'more_gems' })
      const opts = [...ideas.map((i) => { const r = addStop(plan, i.cityId); return option(handle, `Add ${cityName(i.cityId)}, a hidden gem`, r.plan, null, i.reasons.join(' · ')) }), ...(swap.changed ? [option(handle, swap.summary, swap.plan, null, (swap.reasons || []).join(' · '))] : [])]
      if (!opts.length) return { text: swap.summary }
      return { text: 'Quieter places that fit your route:', blocks: [optionsBlock(handle, opts)], followUps: [keep], sources: ['estimate'] }
    }
    case 'remove_city': {
      if (a.targetCity) {
        const r = removeStop(plan, plan.stops.findIndex((s) => s.cityId === a.targetCity))
        if (!r.changed) return { text: r.summary }
        return { text: `Removing ${cityName(a.targetCity)}:`, blocks: [optionsBlock(handle, [option(handle, r.summary, r.plan)])], followUps: [keep], sources: ['estimate'] }
      }
      if (plan.stops.length < 2) return { text: 'Your trip only has one city.' }
      const picks = removalSavings(plan).sort((x, y) => y.savedMinutes - x.savedMinutes).slice(0, 2)
      return {
        text: 'These are the easiest cities to drop:',
        blocks: [optionsBlock(handle, picks.map((p) => { const r = removeStop(plan, p.index); return option(handle, `Drop ${cityName(p.cityId)}`, r.plan) }))],
        followUps: [keep],
        sources: ['estimate'],
      }
    }
    case 'make_cheaper':
      return hasLimits(a.limits) ? withLimits(handle, a.limits, 'cost', a.amount) : cheaper(handle, a.amount)
    case 'reduce_travel': {
      if (hasLimits(a.limits)) return withLimits(handle, a.limits, 'travel')
      const opts = []
      const main = applyChange(plan, { type: 'reduce_travel' })
      if (main.changed) opts.push(option(handle, main.summary, main.plan, null, (main.reasons || []).join(' · ')))
      const order = applyChange(plan, { type: 'optimize_order' })
      if (order.changed) opts.push(option(handle, order.summary, order.plan))
      const worst = costlyStop(plan)
      if (worst) {
        const alt = worst.alternatives[0]
        if (alt) opts.push(option(handle, `Swap ${cityName(worst.cityId)} for ${cityName(alt.cityId)}`, replaceStop(plan, worst.index, alt.cityId).plan, null, alt.reasons.join(' · ')))
        opts.push(option(handle, `Drop ${cityName(worst.cityId)}`, removeStop(plan, worst.index).plan))
      }
      if (!opts.length) return { text: main.summary }
      for (const o of opts) o.detail = [travelSaving(o), o.detail].filter(Boolean).join(' · ')
      return { text: `You have about ${hours(computeStats(plan).travelMinutes)} of travel between cities. Ways to cut it:`, blocks: [optionsBlock(handle, opts)], followUps: [keep], sources: ['estimate'] }
    }
    case 'plan_day':
      return planDay(handle, a.day)
    case 'optimize_day':
      return optimizeOneDay(handle, a.day)
    case 'move_place_to_day':
      return movePlace(handle, a.place, a.day)
    case 'places_near':
      return nearPlaces(handle, a)
    case 'trip_question':
      return question(a, { ...ctx, weather })
    default:
      if (!L) return { text: 'I can’t do that to a trip yet.' }
      return fromPlanner(runAction(L, { plan, days, weather }), handle, a)
  }
}

// Constraints from requests like "cheaper, but keep Italy and no more than an hour of extra train":
//   limits: { keepCities: [ids], keepCountries: [codes], maxExtraTravel: minutes | null }
export const hasLimits = (l) => Boolean(l && (l.keepCities?.length || l.keepCountries?.length || l.maxExtraTravel != null))
const countIn = (stops, code) => stops.filter((s) => cityById[s.cityId]?.country === code).length

export function meetsLimits(o, limits, plan) {
  const after = o.preview.after
  if ((limits.keepCities || []).some((id) => !after.some((s) => s.cityId === id))) return false
  // A kept country keeps as many stops as it had (a stop can still be swapped for another city there).
  if ((limits.keepCountries || []).some((code) => countIn(after, code) < countIn(plan.stops, code))) return false
  if (limits.maxExtraTravel != null && o.preview.travel[1] - o.preview.travel[0] > limits.maxExtraTravel) return false
  return true
}

export function limitsText(limits) {
  const keep = [...(limits.keepCities || []).map(cityName), ...(limits.keepCountries || []).map((c) => countryByCode[c]?.name || c)]
  return [keep.length ? `keeping ${list(keep)}` : '', limits.maxExtraTravel != null ? (limits.maxExtraTravel === 0 ? 'with no extra travel' : `with at most ${hours(limits.maxExtraTravel)} of extra travel`) : ''].filter(Boolean).join(' and ')
}

// Every single-step change worth trying (swap any stop, drop it, a night fewer, reorder), checked
// against the limits and ranked by the goal: 'cost' (money saved) or 'travel' (time saved).
function withLimits(handle, limits, goal, amount = null) {
  const { plan } = handle
  const currency = plan.prefs.currency
  const kept = (id) => (limits.keepCities || []).includes(id)
  const cands = []
  const push = (title, r, detail = '') => r?.changed !== false && r?.plan && cands.push(option(handle, title, r.plan, null, detail))
  const main = applyChange(plan, { type: goal === 'cost' ? 'make_cheaper' : 'reduce_travel' })
  push(main.summary, main, (main.reasons || []).join(' · '))
  if (goal === 'travel') push('Reorder the route', applyChange(plan, { type: 'optimize_order' }))
  plan.stops.forEach((s, index) => {
    if (kept(s.cityId)) return
    const sameCountry = (limits.keepCountries || []).includes(cityById[s.cityId]?.country)
    const alts = alternativesFor(plan, index, { goal: goal === 'cost' ? { cheaper: true } : {}, limit: 6 })
      .filter((x) => !sameCountry || cityById[x.cityId].country === cityById[s.cityId].country)
      .slice(0, 2)
    for (const alt of alts) push(`Replace ${cityName(s.cityId)} with ${cityName(alt.cityId)}`, replaceStop(plan, index, alt.cityId), alt.reasons.join(' · '))
    if (plan.stops.length > 2) push(`Drop ${cityName(s.cityId)}`, removeStop(plan, index))
    if (goal === 'cost' && s.nights > 1) push(`One night fewer in ${cityName(s.cityId)}, one more somewhere cheaper`, changeNights(plan, index, -1, { keepLength: true }))
  })
  const gain = (o) => (goal === 'cost' ? o.preview.cost[0] - o.preview.cost[1] : o.preview.travel[0] - o.preview.travel[1])
  const ok = dedupe(cands.filter((o) => gain(o) > 0 && meetsLimits(o, limits, plan))).sort((x, y) => gain(y) - gain(x)).slice(0, 3)
  const how = limitsText(limits)
  if (!ok.length) {
    return {
      text: `I couldn’t find a ${goal === 'cost' ? 'cheaper' : 'faster'} version ${how}. Want to relax one of those?`,
      followUps: [{ label: goal === 'cost' ? 'Show all cheaper options' : 'Show all faster options', prompt: goal === 'cost' ? 'Make my trip cheaper' : 'Reduce my train time' }],
      sources: ['estimate'],
      facts: { limits: how, found: 0 },
    }
  }
  for (const o of ok) o.detail = [goal === 'cost' ? savingText(o, currency) : travelSaving(o), goal === 'cost' ? travelSaving(o) : savingText(o, currency), o.detail].filter(Boolean).join(' · ')
  const best = gain(ok[0])
  return {
    text:
      goal === 'cost'
        ? amount && best < amount
          ? `The biggest cut ${how} is about ${formatMoney(best, currency)}, short of ${formatMoney(amount, currency)}:`
          : `${ok.length === 1 ? 'One way' : `${ok.length} ways`} to lower the cost ${how}:`
        : `${ok.length === 1 ? 'One way' : `${ok.length} ways`} to cut travel time ${how}:`,
    blocks: [optionsBlock(handle, ok)],
    followUps: [keep],
    sources: ['estimate'],
  }
}

function cheaper(handle, amount) {
  const { plan } = handle
  const currency = plan.prefs.currency
  const opts = []
  const main = applyChange(plan, { type: 'make_cheaper' })
  if (main.changed) opts.push(option(handle, main.summary, main.plan, null, (main.reasons || []).join(' · ')))
  // The priciest stop swapped for the cheapest nearby alternative.
  const pricey = plan.stops.map((s, index) => ({ s, index, level: cityById[s.cityId].costLevel || 0 })).filter((x) => x.index > 0 || plan.stops.length === 1).sort((x, y) => y.level - x.level || y.s.nights - x.s.nights)[0]
  if (pricey) {
    const alt = alternativesFor(plan, pricey.index, { goal: { cheaper: true }, limit: 5 }).find((x) => (cityById[x.cityId].costLevel || 9) < pricey.level)
    if (alt) opts.push(option(handle, `Replace ${cityName(pricey.s.cityId)} with ${cityName(alt.cityId)}`, replaceStop(plan, pricey.index, alt.cityId).plan, null, alt.reasons.join(' · ')))
    if (pricey.s.nights > 1) {
      const r = changeNights(plan, pricey.index, -1, { keepLength: true })
      if (r.changed) opts.push(option(handle, `One night fewer in ${cityName(pricey.s.cityId)}, one more somewhere cheaper`, r.plan))
    }
  }
  // A target amount: keep cutting until it's reached (up to three steps).
  if (amount) {
    let p = plan
    for (let i = 0; i < 3; i++) {
      const r = applyChange(p, { type: 'make_cheaper' })
      if (!r.changed) break
      p = r.plan
      if (planBudget(plan, []).total - planBudget(p, []).total >= amount) break
    }
    if (p !== plan) opts.unshift(option(handle, `Cut about ${formatMoney(amount, currency)}`, p, null, 'Several cheaper swaps together'))
  }
  if (!opts.length) return { text: `${main.summary} Choosing free sights (parks, viewpoints, churches) over paid ones would help the Activities line.` }
  const ranked = dedupe(opts).sort((x, y) => (y.preview.cost[0] - y.preview.cost[1]) - (x.preview.cost[0] - x.preview.cost[1]))
  for (const o of ranked) o.detail = [savingText(o, currency), o.detail].filter(Boolean).join(' · ')
  const best = ranked[0].preview.cost[0] - ranked[0].preview.cost[1]
  return {
    text: amount && best < amount ? `The biggest cut I can find is about ${formatMoney(best, currency)}, short of ${formatMoney(amount, currency)}:` : `I found ${ranked.length === 1 ? 'one way' : `${ranked.length} ways`} to lower the estimated cost:`,
    blocks: [optionsBlock(handle, ranked)],
    followUps: [keep, { label: 'Where am I spending most?', prompt: 'Where am I spending the most?' }],
    sources: ['estimate'],
  }
}

const dayOf = (handle, n) => handle.days.find((d) => d.number === n)
const withDay = (days, n, items) => days.map((d) => (d.number === n ? { ...d, items } : d))
const dayChange = (handle, title, nextDays) => ({ type: 'options', key: tripKey(handle), options: [option(handle, title, handle.plan, nextDays)] })

function planDay(handle, n) {
  const day = dayOf(handle, n)
  const generated = planDays(handle.plan).find((d) => d.number === n)
  const planned = new Set(handle.days.filter((d) => d.number !== n).flatMap((d) => d.items.map((i) => i.placeId)))
  const fresh = (generated?.items || []).filter((i) => i.placeId && !planned.has(i.placeId) && !day.items.some((x) => x.placeId === i.placeId))
  const cap = dayCapacity(day, { pace: handle.plan.prefs.pace, totalDays: handle.days.length }) + 1
  const room = Math.max(0, cap - day.items.filter((i) => i.placeId).length)
  if (!fresh.length || !room) {
    return { text: `${dayName(day)} in ${cityName(day.cityId)} is already planned${day.items.length ? '' : ', and Eurowander has nothing more to add there'}.`, blocks: [{ type: 'days', days: [{ number: n, date: day.date, cityId: day.cityId, after: day.items.filter((i) => i.placeId).map((i) => placeName(i.placeId)) }] }], followUps: [{ label: 'Make it lighter', prompt: `Make day ${n} less busy` }, { label: 'Optimise the route', prompt: `Optimise day ${n}` }] }
  }
  const items = [...day.items, ...fresh.slice(0, room)]
  return {
    text: `A plan for ${dayName(day)} in ${cityName(day.cityId)}, from Eurowander’s top places${handle.plan.prefs.interests.length ? ' for your interests' : ''}:`,
    blocks: [dayChange(handle, `Plan ${dayName(day)}`, withDay(handle.days, n, items))],
    followUps: [keep, { label: 'Find lunch nearby', prompt: `Find lunch near my plans on day ${n}` }],
    sources: ['sample'],
  }
}

function optimizeOneDay(handle, n) {
  const day = dayOf(handle, n)
  const stops = day.items.filter((i) => i.placeId && placeById[i.placeId])
  if (stops.length < 3) return { text: `${dayName(day)} has ${stops.length} place${stops.length === 1 ? '' : 's'}, so there’s no order to improve.` }
  const r = optimizeDay(stops.map((i) => placeById[i.placeId]))
  if (!r.changed) return { text: `${dayName(day)} is already in a sensible order (about ${r.before.toFixed(1)} km between stops, straight-line).` }
  const byId = Object.fromEntries(stops.map((i) => [i.placeId, i]))
  const items = [...r.order.map((p) => byId[p.id]), ...day.items.filter((i) => !i.placeId || !placeById[i.placeId])]
  return { text: `A shorter order for ${dayName(day)}: about ${r.after.toFixed(1)} km instead of ${r.before.toFixed(1)} km (straight-line, not streets).`, blocks: [dayChange(handle, `Reorder ${dayName(day)}`, withDay(handle.days, n, items))], followUps: [keep], sources: ['estimate'] }
}

function movePlace(handle, placeId, n) {
  const p = placeById[placeId]
  const day = dayOf(handle, n)
  if (p.cityId !== day.cityId) return { text: `On ${dayName(day)} you’re in ${cityName(day.cityId)}, but ${p.name} is in ${cityName(p.cityId)}.` }
  const from = handle.days.find((d) => d.items.some((i) => i.placeId === placeId))
  if (from?.number === n) return { text: `${p.name} is already on ${dayName(day)}.` }
  const item = from?.items.find((i) => i.placeId === placeId) || { slot: 'afternoon', placeId, label: p.name, reasons: [] }
  let next = from ? withDay(handle.days, from.number, from.items.filter((i) => i.placeId !== placeId)) : handle.days
  next = withDay(next, n, [...day.items, item])
  return { text: `Moving ${p.name} to ${dayName(day)}${from ? ` from ${dayName(from)}` : ''}:`, blocks: [dayChange(handle, `Move ${p.name} to ${dayName(day)}`, next)], followUps: [keep] }
}

export function nearPlaces(handle, a) {
  let anchors = []
  let where = ''
  if (a.place) {
    anchors = [placeById[a.place]]
    where = `near ${placeById[a.place].name}`
  } else if (a.day) {
    anchors = dayOf(handle, a.day).items.map((i) => placeById[i.placeId]).filter(Boolean)
    where = `near your plans on ${dayName(dayOf(handle, a.day))}`
    // Nothing (left) planned that day: around the city centre.
    if (!anchors.length) {
      const c = cityById[dayOf(handle, a.day).cityId]
      anchors = [{ ...c, name: `the centre of ${c.name}` }]
      where = `in central ${c.name}`
    }
  } else {
    anchors = Object.keys(handle?.trip?.statuses || {}).map((id) => placeById[id]).filter(Boolean)
    if (!anchors.length) anchors = (handle?.days || []).flatMap((d) => d.items.map((i) => placeById[i.placeId])).filter(Boolean)
    where = 'near your saved places'
  }
  if (!anchors.length) return { text: 'Save a few places first, and I can find things near them.' }
  const have = new Set([...Object.keys(handle?.trip?.statuses || {}), ...(handle?.days || []).flatMap((d) => d.items.map((i) => i.placeId))])
  const found = new Map()
  for (const anc of anchors) {
    for (const n of nearbyPlaces(anc, { radiusKm: 2.5, limit: 20 })) {
      if (have.has(n.place.id) || (a.category && n.place.category !== a.category)) continue
      const prev = found.get(n.place.id)
      if (!prev || prev.km > n.km) found.set(n.place.id, { ...n, anchor: anc })
    }
  }
  let picks = [...found.values()].sort((x, y) => x.km - y.km).slice(0, 4)
  // Nothing close by: the best of the same kind elsewhere in those cities.
  const wide = !picks.length
  let wideTrip = false
  if (wide) {
    const inCities = [...new Set(anchors.map((p) => p.cityId))]
    const best = (ids) => ids.flatMap((c) => placesInCity(c)).filter((p) => !have.has(p.id) && (!a.category || p.category === a.category)).sort((x, y) => (y.rating || 0) - (x.rating || 0)).slice(0, 4).map((p) => ({ place: p, km: null, anchor: null }))
    picks = best(inCities)
    // Still nothing: the rest of the trip's cities.
    if (!picks.length) {
      picks = best((handle?.plan.stops || []).map((s) => s.cityId).filter((c) => !inCities.includes(c)))
      if (picks.length) wideTrip = true
    }
  }
  const what = a.category ? { food: 'Food spots', museums: 'Museums', outdoors: 'Outdoor places', nightlife: 'Bars and nightlife', history: 'Historic sights', shopping: 'Shops' }[a.category] : 'Places'
  if (!picks.length) return { text: `${what} ${where}: nothing else in Eurowander’s guide yet.` }
  const day = a.day || (a.place && handle ? handle.days.find((d) => d.items.some((i) => i.placeId === a.place))?.number : null)
  return {
    text: wideTrip ? `You’ve already saved the ${what.toLowerCase()} Eurowander lists near your saved places. These are the best elsewhere on your route:` : wide ? `Nothing new within walking distance ${where.replace('near', 'of')}, but these are nearby in the same city:` : `${what} ${where}:`,
    blocks: [{ type: 'places', items: picks.map((x) => ({ placeId: x.place.id, note: x.km == null ? '' : `${x.km < 1 ? `${Math.round(x.km * 1000)} m` : `${x.km.toFixed(1)} km`} from ${x.anchor.name}` })), day }],
    sources: ['sample'],
    memory: { lastList: picks.map((x) => x.place.id) },
  }
}

// ----- Questions about the trip -----

function question(a, { handle, weather, today }) {
  const { plan, days } = handle
  const stats = computeStats(plan)
  const currency = plan.prefs.currency
  const money = (n) => formatMoney(n, currency)
  switch (a.question) {
    case 'rushed': {
      const counts = stopDays(plan)
      const legs = planLegs(plan)
      // Effective days in each city: arrival days count as half.
      const eff = plan.stops.map((s, i) => ({ cityId: s.cityId, days: counts[i] - (i > 0 ? 0.5 : 0) - (i === plan.stops.length - 1 && i > 0 ? 0.5 : 0) }))
      const shortest = [...eff].sort((x, y) => x.days - y.days)[0]
      let busiest = null
      for (let i = 0; i + 1 < legs.length; i++) {
        const mins = legs[i].minutes + legs[i + 1].minutes
        const span = counts[i + 1]
        const load = mins / 60 / Math.max(1, span)
        if (!busiest || load > busiest.load) busiest = { load, cities: [legs[i].from.name, legs[i].to.name, legs[i + 1].to.name] }
      }
      const pace = stats.pace?.id
      const verdict = pace === 'fast' || stats.wakingShare > 0.15 ? 'Your trip is fairly fast-paced.' : pace === 'relaxed' ? 'Your trip is relaxed.' : 'Your trip has a comfortable, moderate pace.'
      const detail = []
      if (busiest && legs.length >= 2) detail.push(`The busiest section is ${busiest.cities.join(' → ')}.`)
      if (shortest && plan.stops.length > 1 && shortest.days < 2) detail.push(`You only have about ${shortest.days.toString().replace('.5', '½')} day${shortest.days === 1 ? '' : 's'} in ${cityName(shortest.cityId)}.`)
      return {
        text: `${verdict} ${detail.join(' ')}`,
        blocks: [{ type: 'stats', items: [{ label: 'Days', value: String(stats.days) }, { label: 'Cities', value: String(stats.cities) }, { label: 'Countries', value: String(stats.countries.length) }, { label: 'Intercity travel', value: `~${hours(stats.travelMinutes)}` }] }],
        followUps: pace === 'relaxed' ? [{ label: 'Add a hidden gem', prompt: 'Add a hidden gem' }] : [{ label: 'Make trip more relaxed', prompt: 'Make my trip more relaxed' }, { label: 'Reduce train time', prompt: 'Reduce my train time' }, keep],
        sources: ['estimate'],
      }
    }
    case 'most_expensive':
    case 'budget_fit':
    case 'budget_summary': {
      const b = planBudget(plan, days)
      const city = [...b.perCity].filter((c) => c.perPersonDay).sort((x, y) => y.perPersonDay * y.days - x.perPersonDay * x.days)[0]
      const lead =
        a.question === 'most_expensive'
          ? `${city ? `${cityName(city.cityId)} is your most expensive city (about ${money(city.perPersonDay)} per person per day). ` : ''}${[...b.categories].sort((x, y) => y.amount - x.amount)[0].label} is the biggest cost.`
          : b.budget == null
            ? `The rough estimate is ${money(b.total)} for ${plan.prefs.travellers} traveller${plan.prefs.travellers === 1 ? '' : 's'}. There’s no budget set${handle.kind === 'saved' ? ' (add one in the Budget tab)' : ''}.`
            : b.status === 'over'
              ? `Not quite: the estimate is about ${money(-b.remaining)} over your ${money(b.budget)} budget.`
              : `Yes${b.status === 'tight' ? ', just' : ''}: about ${money(b.remaining)} left of ${money(b.budget)}.`
      return {
        text: lead,
        blocks: [{ type: 'budget', rows: b.categories.map((c) => ({ label: c.label, icon: c.icon, amount: c.amount })), total: b.total, budget: b.budget, remaining: b.remaining, currency: b.currency, perCity: b.perCity.filter((c) => c.perPersonDay).map((c) => ({ cityId: c.cityId, amount: c.perPersonDay * c.days * plan.prefs.travellers })) }],
        followUps: [...(b.status === 'over' || b.status === 'tight' || a.question === 'most_expensive' ? [{ label: 'Make it cheaper', prompt: 'Make my trip cheaper' }] : []), ...(handle.kind === 'saved' ? [{ label: 'Open Budget tab', effect: { type: 'navigate', to: '/trip', tab: 'budget' } }] : [])],
        sources: ['estimate'],
      }
    }
    case 'travel_time':
    case 'route_check': {
      const legs = planLegs(plan)
      const warnings = a.question === 'route_check' ? feasibilityWarnings(plan, stats) : []
      const text = a.question === 'route_check'
        ? warnings.length ? `A few things to look at: ${warnings.slice(0, 2).map((w) => w.text).join(' ')}` : 'Your route looks good: no backtracking or very long journeys.'
        : `About ${hours(stats.travelMinutes)} of travel over ${stats.transfers} journey${stats.transfers === 1 ? '' : 's'}.`
      return {
        text,
        blocks: legs.length ? [{ type: 'route', legs: legs.map((l) => ({ from: l.from.id, to: l.to.id, minutes: l.minutes, mode: l.mode, source: l.source })), total: stats.travelMinutes }] : [],
        followUps: [...(warnings.some((w) => w.fix?.type === 'optimize_order') || stats.backtracking?.betterOrder ? [{ label: 'Fix the order', prompt: 'Optimise my route' }] : []), { label: 'Reduce train time', prompt: 'Reduce my train time' }],
        sources: [legs.some((l) => l.source !== 'sample') ? 'estimate' : 'sample'],
      }
    }
    case 'busiest_day': {
      if (!days.some((d) => d.items.length)) return { text: 'Your days aren’t planned yet, so none is busy.', followUps: [{ label: 'Plan my next day', prompt: 'Plan my next day' }] }
      const top = days.map((d) => ({ d, load: dayLoad(d) })).sort((x, y) => y.load.score - x.load.score)[0]
      return {
        text: `${dayName(top.d)} in ${cityName(top.d.cityId)} is the busiest: ${top.load.activities} activit${top.load.activities === 1 ? 'y' : 'ies'}${top.load.travelMinutes ? ` plus ~${hours(top.load.travelMinutes)} of travel` : ''}.`,
        blocks: [{ type: 'days', days: [{ number: top.d.number, date: top.d.date, cityId: top.d.cityId, after: top.d.items.filter((i) => i.placeId).map((i) => placeName(i.placeId)) }] }],
        followUps: [{ label: 'Make it lighter', prompt: `Make day ${top.d.number} less busy` }],
      }
    }
    case 'weather':
    case 'best_outdoor_day': {
      const inTrip = days.filter((d) => !a.targetCity || d.cityId === a.targetCity)
      const fc = inTrip.filter((d) => weather[d.number]?.kind === 'forecast')
      if (!fc.length) {
        const month = plan.prefs.month || (plan.prefs.startDate ? Number(plan.prefs.startDate.slice(5, 7)) : null)
        const lines = [...new Set(plan.stops.map((s) => s.cityId))].map((id) => {
          const c = cityById[id]
          return `${c.name}: usually best ${monthRange(c.seasons?.bestWeather) || 'in summer'}${month && c.seasons?.bestWeather?.includes(month) ? ` (${monthNames[month - 1]} is one of them)` : ''}`
        })
        return {
          text: plan.prefs.startDate ? 'Your trip is too far ahead for a reliable forecast (forecasts reach 16 days), so here’s the seasonal picture instead:' : 'Without dates there’s no forecast. The usual seasons:',
          blocks: [{ type: 'list', items: lines }],
          sources: ['seasonal'],
        }
      }
      if (a.question === 'best_outdoor_day') {
        const dry = fc.filter((d) => classifyForecast(weather[d.number]) === 'dry').sort((x, y) => (weather[x.number].rain ?? 0) - (weather[y.number].rain ?? 0))
        const best = dry[0] || [...fc].sort((x, y) => (weather[x.number].rain ?? 100) - (weather[y.number].rain ?? 100))[0]
        const w = weather[best.number]
        return { text: `${dayName(best)} in ${cityName(best.cityId)} looks best for being outside: ${Math.round(w.max)}°, ${w.rain ?? '?'}% chance of rain.`, sources: ['live'] }
      }
      const rows = (a.day ? fc.filter((d) => d.number === a.day) : fc).slice(0, 8).map((d) => {
        const w = weather[d.number]
        return { number: d.number, date: d.date, cityId: d.cityId, weather: { max: Math.round(w.max), min: Math.round(w.min), rain: w.rain, code: w.code, wet: classifyForecast(w) === 'wet' } }
      })
      if (!rows.length) return { text: `There’s no forecast for day ${a.day} yet; forecasts reach 16 days ahead.`, sources: ['seasonal'] }
      const wet = rows.filter((r) => r.weather.wet)
      return {
        text: a.day ? (wet.length ? `Rain is likely on ${dayName(dayOf(handle, a.day))}.` : `${dayName(dayOf(handle, a.day))} doesn’t look rainy right now.`) : wet.length ? `Rain is likely on ${wet.length} of the forecast days.` : 'No heavy rain in the forecast.',
        blocks: [{ type: 'weather', days: rows }],
        followUps: wet.length ? [{ label: 'Move outdoor plans off rainy days', prompt: 'Move outdoor activities off the rainy day' }] : [],
        sources: ['live'],
      }
    }
    case 'why_city':
      return { text: runAction({ action: 'answer', question: 'why_city', index: plan.stops.findIndex((s) => s.cityId === a.targetCity), targetCity: a.targetCity }, { plan, days, weather }).text }
    case 'next_step':
    default:
      return nextStep(handle, { stats, today })
  }
}

// "What should I do next?": the first gap worth filling, in a sensible order.
function nextStep(handle, { stats, today }) {
  const { plan, days } = handle
  const warn = feasibilityWarnings(plan, stats).find((w) => w.level === 'warn')
  const empty = days.find((d) => !d.items.some((i) => i.placeId) && (!today || !d.date || d.date >= today))
  const b = planBudget(plan, days)
  if (handle.kind === 'saved' && !handle.trip.startDate) return { text: 'Add dates to My trip. Then I can plan each day, check the weather and estimate the budget properly.', followUps: [{ label: 'Open My trip', effect: { type: 'navigate', to: '/trip' } }] }
  if (warn) return { text: `First, one thing in the route: ${warn.text}`, followUps: [warn.fix ? { label: 'Fix it', prompt: warn.fix.type === 'optimize_order' ? 'Optimise my route' : warn.fix.type === 'make_relaxed' ? 'Make my trip more relaxed' : 'Reduce my train time' } : { label: 'Check my route', prompt: 'Check my route' }] }
  if (b.status === 'over') return { text: `The estimate is about ${formatMoney(-b.remaining, b.currency)} over budget. Want some cheaper options?`, followUps: [{ label: 'Make it cheaper', prompt: 'Make my trip cheaper' }] }
  if (empty) return { text: `${dayName(empty)} in ${cityName(empty.cityId)} has nothing planned yet.`, followUps: [{ label: `Plan ${dayName(empty)}`, prompt: `Plan day ${empty.number}` }] }
  return { text: 'Your trip is in good shape: the route works and every day has plans. Want to add something quieter, or check the weather?', followUps: [{ label: 'Add a hidden gem', prompt: 'Add a hidden gem' }, { label: 'Weather', prompt: 'What’s the weather during my trip?' }] }
}

