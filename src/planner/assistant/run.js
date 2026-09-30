// Turns a validated assistant action into either an answer (worked out from the plan, never invented)
// or a proposed change for the traveller to confirm. Nothing here changes the plan in place.
//
// Result:
//   { kind: 'answer', text }
//   { kind: 'proposal', summary, plan, days, reasons, options }   plan/days are the proposed new versions
//   { kind: 'none', text }                                        nothing sensible to change
import { cityById } from '../../data/cities.js'
import { placeById, placesInCity } from '../../data/places.js'
import { formatDuration } from '../../lib/format.js'
import { formatMoney } from '../../utils/budgetCalculations.js'
import { additionIdeas, alternativesFor } from '../alternatives.js'
import { planBudget } from '../budget.js'
import { dayLoad, lightenDay, planDays } from '../dayPlanner.js'
import { computeStats } from '../feasibility.js'
import { addStop, applyChange, changeNights, removeStop, replaceStop, setNights } from '../modify.js'
import { builderInterestById } from '../preferences.js'
import { classifyForecast, moveCategoryToDay, rainSuggestions, applyRainSuggestion, weatherOutlook } from '../weatherPlan.js'

const name = (id) => cityById[id]?.name || id
const dayLabel = (d) => (d.date ? `${new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}` : `Day ${d.number}`)

function fromChange(r, { days = null } = {}) {
  if (!r.changed) return { kind: 'none', text: r.summary }
  return { kind: 'proposal', summary: r.summary, plan: r.plan, days, reasons: r.reasons || [] }
}

// `ctx`: { plan, days (day plans), weather (by day number), getPlace }
export function runAction(action, ctx) {
  const { plan, days = planDays(plan), weather = {}, getPlace = (id) => placeById[id] } = ctx
  const keepLength = Boolean(plan.prefs.startDate)
  switch (action.action) {
    case 'replace_city': {
      if (action.city) return fromChange(replaceStop(plan, action.index, action.city))
      const goal = { lessTouristy: action.lessTouristy, cheaper: action.cheaper, maxAdditionalTravelMinutes: action.maxAdditionalTravelMinutes, lessTravel: false }
      const alts = alternativesFor(plan, action.index, { goal, limit: 4 })
      if (!alts.length) return { kind: 'none', text: `No other city fits in place of ${name(action.targetCity)} with those limits.` }
      const r = replaceStop(plan, action.index, alts[0].cityId)
      return { ...fromChange(r), reasons: alts[0].reasons, options: alts.slice(1).map((a) => ({ cityId: a.cityId, reasons: a.reasons, change: { type: 'replace', index: action.index, cityId: a.cityId } })) }
    }
    case 'add_city': {
      if (action.city) return fromChange(addStop(plan, action.city, { nights: action.nights, keepLength }))
      const ideas = additionIdeas(plan, { interest: action.interest || null, limit: 4 })
      if (!ideas.length) return { kind: 'none', text: 'No city fits this route well enough to add.' }
      const r = addStop(plan, ideas[0].cityId, { keepLength })
      return { ...fromChange(r), reasons: ideas[0].reasons, options: ideas.slice(1).map((a) => ({ cityId: a.cityId, reasons: a.reasons, change: { type: 'add', cityId: a.cityId } })) }
    }
    case 'remove_city':
      return fromChange(removeStop(plan, action.index))
    case 'change_nights':
      return fromChange(action.nights != null ? setNights(plan, action.index, action.nights, { keepLength }) : changeNights(plan, action.index, action.delta, { keepLength }))
    case 'optimize_route':
      return fromChange(applyChange(plan, { type: 'optimize_order' }))
    case 'make_relaxed':
    case 'reduce_travel':
    case 'make_cheaper':
    case 'more_gems':
      return fromChange(applyChange(plan, { type: action.action }))
    case 'more_interest':
      return fromChange(applyChange(plan, { type: 'more_interest', interest: action.interest }))
    case 'lighten_day': {
      const r = lightenDay(days, action.day)
      return r.changed ? { kind: 'proposal', summary: r.summary, plan, days: r.days, reasons: [] } : { kind: 'none', text: r.summary }
    }
    case 'move_category_to_day': {
      const r = moveCategoryToDay(days, action.day, 'museums', { getPlace })
      return r.changed ? { kind: 'proposal', summary: r.summary, plan, days: r.days, reasons: [] } : { kind: 'none', text: r.summary }
    }
    case 'rain_plan':
      return rainPlan(plan, days, weather, action.day, getPlace)
    case 'answer':
      return { kind: 'answer', text: answer(action, { plan, days, weather }) }
    default:
      return {
        kind: 'none',
        text: 'I can change cities, nights, travel time, costs and day plans, or answer questions about this trip. Try “Reduce train time” or “Which day is busiest?”.',
      }
  }
}

function rainPlan(plan, days, weather, dayNumber, getPlace) {
  const target = dayNumber ? days.find((d) => d.number === dayNumber) : null
  if (dayNumber && !target) return { kind: 'none', text: 'That day isn’t in this trip.' }
  const suggestions = rainSuggestions(days, weather, { getPlace }).filter((s) => !dayNumber || s.wetDay === dayNumber)
  if (suggestions.length) {
    const next = suggestions.reduce((acc, s) => applyRainSuggestion(acc, s), days)
    return { kind: 'proposal', summary: suggestions.map((s) => s.text).join(' '), plan, days: next, reasons: ['Based on the live forecast'] }
  }
  const day = target || days[0]
  const forecast = weather[day.number]
  const kind = classifyForecast(forecast)
  const lead = forecast?.kind === 'forecast'
    ? kind === 'wet'
      ? `Rain is forecast for ${dayLabel(day)}, but there's no drier day in ${name(day.cityId)} to swap with.`
      : `The forecast for ${dayLabel(day)} doesn't show heavy rain right now.`
    : `There's no reliable forecast for ${dayLabel(day)} yet (forecasts only reach 16 days ahead).`
  const planned = new Set(days.flatMap((d) => d.items.map((it) => it.placeId)))
  const indoor = placesInCity(day.cityId).filter((p) => p.category === 'museums' && !planned.has(p.id)).slice(0, 3)
  const onDay = day.items.map((it) => getPlace(it.placeId)).filter((p) => p && p.category === 'outdoors')
  const tip = indoor.length
    ? ` If it does rain in ${name(day.cityId)}, indoor options not yet in your plan: ${indoor.map((p) => p.name).join(', ')}.`
    : ` If it does rain, the museums already in your ${name(day.cityId)} days can swap with outdoor plans.`
  const move = onDay.length ? ` Outdoor plans that day: ${onDay.map((p) => p.name).join(', ')}.` : ''
  return { kind: 'answer', text: lead + tip + move }
}

function answer(action, { plan, days, weather }) {
  switch (action.question) {
    case 'busiest_day': {
      const scored = days.map((d) => ({ d, load: dayLoad(d) })).sort((a, b) => b.load.score - a.load.score)
      const top = scored[0]
      if (!top) return 'There are no days planned yet.'
      const travel = top.load.travelMinutes ? ` plus about ${formatDuration(top.load.travelMinutes)} of travel` : ''
      return `Day ${top.d.number} (${dayLabel(top.d)}, ${name(top.d.cityId)}) is the busiest: ${top.load.activities} planned activit${top.load.activities === 1 ? 'y' : 'ies'}${travel}. Counted from the day plan, meals not included.`
    }
    case 'most_expensive': {
      const b = planBudget(plan, days)
      const cat = [...b.categories].sort((x, y) => y.amount - x.amount)[0]
      const city = [...b.perCity].filter((c) => c.perPersonDay).sort((x, y) => y.perPersonDay * y.days - x.perPersonDay * x.days)[0]
      const money = (n) => formatMoney(n, b.currency)
      const cityText = city ? ` By city, ${name(city.cityId)} costs the most (about ${money(city.perPersonDay * city.days * plan.prefs.travellers)} for rooms, food and local transport over ${city.days} day${city.days === 1 ? '' : 's'}).` : ''
      return `${cat.label} is the biggest cost, about ${money(cat.amount)} of an estimated ${money(b.total)}.${cityText} These are rough estimates from each city's cost level, not live prices.`
    }
    case 'budget_fit': {
      const b = planBudget(plan, days)
      const money = (n) => formatMoney(n, b.currency)
      if (b.budget == null) return `No budget is set. The rough estimate is ${money(b.total)} for ${plan.prefs.travellers} traveller${plan.prefs.travellers === 1 ? '' : 's'}.`
      return b.status === 'over'
        ? `The estimate (${money(b.total)}) is about ${money(-b.remaining)} over your ${money(b.budget)} budget. “Make it cheaper” can help.`
        : `The estimate (${money(b.total)}) fits your ${money(b.budget)} budget${b.status === 'tight' ? ', but only just' : ''}, leaving about ${money(b.remaining)}. Rough estimates, not live prices.`
    }
    case 'travel_time': {
      const s = computeStats(plan)
      if (!s.transfers) return 'This plan has no journeys between cities.'
      const longest = [...s.legs].sort((a, b) => b.minutes - a.minutes)[0]
      return `About ${formatDuration(s.travelMinutes)} in total over ${s.transfers} journey${s.transfers === 1 ? '' : 's'} (${Math.round(s.wakingShare * 100)}% of waking hours). The longest is ${longest.from.name} → ${longest.to.name}, ~${formatDuration(longest.minutes)}.${s.estimatedLegs ? ` ${s.estimatedLegs} of these are estimates rather than sample times.` : ''}`
    }
    case 'why_city': {
      const stop = plan.stops[action.index]
      const why = stop.role === 'start' ? ['You chose to start there'] : stop.role === 'end' ? ['You chose to end there'] : stop.role === 'must' ? ['You asked to visit it'] : stop.role === 'user' ? ['You added it'] : []
      const reasons = [...why, ...(stop.why || [])]
      return `${name(stop.cityId)}: ${reasons.length ? reasons.join('; ') : 'it fits the route between its neighbours'}.`
    }
    case 'weather': {
      const d = action.day ? days.find((x) => x.number === action.day) : null
      const w = d && weather[d.number]
      if (w?.kind === 'forecast') return `Forecast for ${dayLabel(d)} in ${name(d.cityId)}: ${Math.round(w.max)}° / ${Math.round(w.min)}°, ${w.rain ?? '?'}% chance of rain (Open-Meteo, live).`
      return weatherOutlook(plan, days, weather).lines.join(' ')
    }
    case 'pace': {
      const s = computeStats(plan)
      return s.pace ? `${s.pace.label}: ${s.pace.perCity.toFixed(1)} days per city, ${s.travelDays} travel day${s.travelDays === 1 ? '' : 's'} out of ${s.days}.` : 'Add some days to see the pace.'
    }
    default:
      return 'I don’t have an answer for that.'
  }
}

export const interestLabel = (id) => builderInterestById[id]?.label || id
