// What the AI gets when it writes an answer: only what this request needs, from data the app has checked.
//
//   verified   what Eurowander's data and planner worked out for this request (cards, numbers, options)
//   trip       the open trip, compact; day plans only for the days the request is about
//   live       weather fetched just now, or a note that there isn't any
//   guide      Eurowander's facts and places for the cities the request is about
//   recent     the last few exchanges and what the chat last showed, for "which of those" and "the second one"
//
// No notes, expenses, account details or unrelated cities go in, and the whole thing is capped in size.
import { cities, cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { placeById, placesInCity } from '../data/places.js'
import { planBudget } from '../planner/budget.js'
import { computeStats } from '../planner/feasibility.js'
import { planLegs } from '../planner/plan.js'
import { rankCities } from './appRun.js'
import { tripMode } from './tripHandle.js'

export const MAX_AI_CONTEXT = 14000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const name = (id) => cityById[id]?.name || id
const months = (list) => (list || []).map((m) => MONTHS[m - 1]).join(', ')
const COST = { 1: 'budget-friendly', 2: 'mid-range', 3: 'expensive' }

// Requests the app answers fully from its own data, with no AI at all.
const FACT_ACTIONS = new Set(['open_city', 'open_country', 'open_page', 'show_on_map', 'help', 'my_trip', 'trains_from', 'route', 'save_place'])
const FACT_QUESTIONS = new Set(['budget_summary', 'travel_time', 'weather', 'busiest_day', 'budget_fit'])
export const isFactAction = (a) => Boolean(a && (FACT_ACTIONS.has(a.action) || (a.action === 'trip_question' && FACT_QUESTIONS.has(a.question))))

// Answers that are a simple confirmation or a single proposal speak for themselves.
const NO_ANSWER = new Set([...FACT_ACTIONS, 'build_trip', 'change_nights', 'optimize_day', 'move_place_to_day', 'move_category_to_day', 'unknown'])
export function needsAiAnswer(a, result) {
  if (!a || result?.now || result?.tone === 'error') return false
  if (a.action === 'open_question') return true
  if (NO_ANSWER.has(a.action) || isFactAction(a)) return false
  if ((a.action === 'add_city' && a.city) || (a.action === 'remove_city' && a.targetCity)) return false
  return true
}

export function cityFacts(id, extra = {}) {
  const c = cityById[id]
  if (!c) return null
  return {
    name: c.name,
    country: countryByCode[c.country]?.name,
    about: c.description,
    knownFor: c.interests.map((i) => interestById[i]?.label || i),
    cost: COST[c.costLevel] || 'unknown',
    bestWeather: months(c.seasons?.bestWeather),
    busy: months(c.seasons?.busy),
    typicalStay: c.recommendedDays ? `${c.recommendedDays[0]}-${c.recommendedDays[1]} days` : undefined,
    lessTouristy: Boolean(c.hiddenGem) || undefined,
    beach: c.beach || undefined,
    ...extra,
  }
}

const placeFacts = (p, extra = {}) => ({
  name: p.name,
  city: name(p.cityId),
  kind: interestById[p.category]?.label || p.category,
  type: p.type,
  rating: p.rating ?? undefined,
  cost: p.costLevel == null ? undefined : p.costLevel === 0 ? 'free' : '$'.repeat(p.costLevel),
  about: p.description ? p.description.slice(0, 140) : undefined,
  source: p.source === 'osm' ? 'OpenStreetMap' : 'Eurowander guide',
  ...extra,
})

const stayLine = (stops) => stops.map((s) => `${name(s.cityId)} ${s.nights}n`).join(' → ')

// The deterministic answer, as data the AI can explain (numbers included, exactly as the cards show them).
export function verifiedFacts(result) {
  if (!result) return null
  const out = { summary: result.text || undefined }
  for (const b of result.blocks || []) {
    switch (b.type) {
      case 'cities':
        out.cities = b.items.map((i) => cityFacts(i.cityId, { why: i.why, train: i.train ? `${Math.round(i.train.minutes)} min from ${name(i.train.from)} (${i.train.source === 'sample' ? 'Eurowander train data' : 'estimate'})` : undefined }))
        break
      case 'places':
        out.places = b.items.map((i) => placeById[i.placeId]).filter(Boolean).map((p, k) => placeFacts(p, { note: b.items[k].note || undefined }))
        break
      case 'route':
        out.route = { legs: b.legs.map((l) => `${name(l.from)} → ${name(l.to)}: ${Math.round(l.minutes)} min by ${l.mode}${l.source === 'sample' ? '' : ' (estimate)'}`), totalMinutes: b.total }
        break
      case 'compare':
        out.comparison = { cities: b.cities.map(name), rows: b.rows }
        break
      case 'stats':
        out.stats = Object.fromEntries(b.items.map((s) => [s.label, s.value]))
        break
      case 'list':
        out.notes = b.items
        break
      case 'budget':
        out.budget = { currency: b.currency, estimateTotal: b.total, budget: b.budget, remaining: b.remaining, byCategory: Object.fromEntries(b.rows.map((r) => [r.label, r.amount])), byCity: b.perCity?.map((c) => `${name(c.cityId)}: ${Math.round(c.amount)}`) }
        break
      case 'days':
        out.days = b.days.map((d) => ({ day: d.number, date: d.date || undefined, city: name(d.cityId), before: d.before, plan: d.after }))
        break
      case 'weather':
        out.forecast = b.days.map((d) => ({ day: d.number, date: d.date, city: name(d.cityId), maxC: d.weather.max, minC: d.weather.min, rainChance: d.weather.rain, rainy: d.weather.wet }))
        break
      case 'options':
        out.proposedChanges = b.options.map((o, i) => ({
          option: i + 1,
          title: o.title,
          detail: o.detail || undefined,
          now: stayLine(o.preview.before),
          after: stayLine(o.preview.after),
          travelMinutes: { now: Math.round(o.preview.travel[0]), after: Math.round(o.preview.travel[1]) },
          estimatedCost: { now: Math.round(o.preview.cost[0]), after: Math.round(o.preview.cost[1]), currency: o.preview.currency },
          dayChanges: o.preview.days?.map((d) => ({ day: d.number, before: d.before, after: d.after })),
        }))
        out.note = 'These are proposals. Nothing has changed; the traveller presses Apply on the one they want.'
        break
      case 'build':
        out.tripToBuild = { days: b.days, route: stayLine(b.stops) }
        break
      default:
        break
    }
  }
  if (result.facts) Object.assign(out, result.facts)
  return out
}

const mentionsNow = (t) => /\b(today|tonight|this (evening|afternoon|morning)|now|right now)\b/.test(t)
const mentionsTomorrow = (t) => /\b(tomorrow)\b/.test(t)

// The trip, compact. Day plans go in only for the days this request is about.
export function tripFacts(handle, { today, action, message = '' }) {
  if (!handle) return null
  const { plan, days } = handle
  const stats = computeStats(plan)
  const b = planBudget(plan, days)
  const t = message.toLowerCase()
  const mode = tripMode(handle, today)
  const todayDay = days.find((d) => d.date === today)
  const wanted = new Set()
  if (action?.day) wanted.add(action.day)
  if (todayDay && (mode === 'traveling' || mentionsNow(t))) wanted.add(todayDay.number)
  if (todayDay && mentionsTomorrow(t)) wanted.add(todayDay.number + 1)
  return {
    where: handle.kind === 'built' ? 'the Build page' : 'My trip',
    name: handle.name || undefined,
    mode,
    dates: plan.prefs.startDate ? `${plan.prefs.startDate} to ${plan.prefs.endDate}` : 'no dates yet',
    today: todayDay ? { day: todayDay.number, city: name(todayDay.cityId), arrivalDay: Boolean(todayDay.leg) } : undefined,
    travellers: plan.prefs.travellers,
    interests: plan.prefs.interests,
    pace: stats.pace?.label,
    stops: stayLine(plan.stops),
    legs: planLegs(plan).map((l) => `${l.from.name} → ${l.to.name}: ${Math.round(l.minutes)} min${l.source === 'sample' ? '' : ' (estimate)'}`),
    travelMinutes: Math.round(stats.travelMinutes),
    budget: { estimate: Math.round(b.total), budget: b.budget ?? undefined, currency: b.currency },
    savedPlaces: handle.trip ? Object.keys(handle.trip.statuses || {}).filter((id) => placeById[id]).slice(0, 12).map((id) => placeById[id].name) : undefined,
    days: days
      .filter((d) => wanted.has(d.number))
      .map((d) => ({
        day: d.number,
        date: d.date || undefined,
        weekday: d.date ? WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()] : undefined,
        city: name(d.cityId),
        travelDay: Boolean(d.leg) || undefined,
        plans: d.items.filter((i) => i.placeId).map((i) => placeById[i.placeId]?.name || i.label),
      })),
  }
}

// Which cities the request is about, for guide facts and places.
export function focusCities({ action, handle, today, pageCityId, memory = {}, message = '' }) {
  const ids = []
  const add = (id) => id && cityById[id] && !ids.includes(id) && ids.push(id)
  add(action?.city)
  ;(action?.cities || []).forEach(add)
  add(action?.targetCity)
  if (action?.place) add(placeById[action.place]?.cityId)
  const t = message.toLowerCase()
  const todayDay = handle?.days.find((d) => d.date === today)
  if (todayDay && (mentionsNow(t) || mentionsTomorrow(t) || tripMode(handle, today) === 'traveling')) add(todayDay.cityId)
  if (!ids.length) add(pageCityId)
  if (!ids.length && action?.action === 'open_question' && /\b(those|these|them|that one|which|second|first|third)\b/.test(t)) (memory.lastList || []).forEach(add)
  return ids.slice(0, 4)
}

// Data to look at for an open question that names no city: the guide's best matches.
export function candidateCities(action, { exclude = [] } = {}) {
  if (!action || action.action !== 'open_question' || action.city || action.cities?.length) return []
  if (!action.interests?.length && !action.month && !action.country && !action.hiddenGems) return []
  return rankCities({ interests: action.interests || [], month: action.month, country: action.country, hiddenGems: action.hiddenGems, exclude }).slice(0, 6).map((c) => c.id)
}

export function liveFacts({ weatherByDay, weatherFailed, handle }) {
  const fc = Object.entries(weatherByDay || {}).filter(([, w]) => w.kind === 'forecast')
  if (fc.length) {
    return {
      weather: fc.slice(0, 8).map(([n, w]) => {
        const d = handle?.days.find((x) => x.number === Number(n))
        return { day: Number(n), date: d?.date, city: d ? name(d.cityId) : undefined, maxC: Math.round(w.max), minC: Math.round(w.min), rainChance: w.rain ?? null }
      }),
      source: 'Open-Meteo forecast, fetched just now',
    }
  }
  return { weather: weatherFailed ? 'The weather service could not be reached just now.' : 'No live forecast available for this (forecasts only reach 16 days ahead).' }
}

// Everything the AI gets for one answer.
export function buildAIContext({ message, action, result, handle, memory = {}, today, timeOfDay = null, pageCityId = null, weatherByDay = null, weatherFailed = false, note = '', travel = null }) {
  const focus = focusCities({ action, handle, today, pageCityId, memory, message })
  const tripIds = handle ? handle.plan.stops.map((s) => s.cityId) : []
  const shownCities = new Set((result?.blocks || []).filter((b) => b.type === 'cities').flatMap((b) => b.items.map((i) => i.cityId)))
  const shownPlaces = new Set((result?.blocks || []).filter((b) => b.type === 'places').flatMap((b) => b.items.map((i) => i.placeId)))
  const candidates = candidateCities(action, { exclude: tripIds })
  const category = action?.category || null
  const guide = {
    cities: [...focus, ...candidates].filter((id) => !shownCities.has(id)).slice(0, 6).map((id) => cityFacts(id, candidates.includes(id) && !focus.includes(id) ? { match: 'guide suggestion for this request' } : {})),
    // Places in the cities in focus: the request's kind first, then the best rated, so the AI can point at real ones.
    places: focus
      .slice(0, 2)
      .flatMap((id) =>
        placesInCity(id)
          .filter((p) => !shownPlaces.has(p.id))
          .sort((a, b) => (category ? (b.category === category) - (a.category === category) : 0) || (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 12),
      )
      .map((p) => placeFacts(p)),
  }
  const ctx = {
    today,
    timeOfDay: timeOfDay || undefined,
    // In Travel Mode: they're on the trip right now. Today's plan, the local time, weather and journey.
    travelMode: travel || undefined,
    request: action ? { understoodAs: action.action, interests: action.interests?.length ? action.interests : undefined, category: category || undefined, month: action.month ? MONTHS[action.month - 1] : undefined } : undefined,
    verified: verifiedFacts(result),
    note: note || undefined,
    trip: tripFacts(handle, { today, action, message }),
    live: liveFacts({ weatherByDay, weatherFailed, handle }),
    guide,
    coverage: `Eurowander's guide covers ${cities.length} cities. Others can be discussed from general knowledge, but have no cards or data.`,
    recent: {
      lastShown: (memory.lastList || []).slice(0, 8).map((id) => cityById[id]?.name || placeById[id]?.name).filter(Boolean),
      exchanges: (memory.exchanges || []).slice(-3),
    },
  }
  return trimContext(ctx)
}

// Keep the context under the size limit, dropping the least important parts first.
export function trimContext(ctx) {
  const size = () => JSON.stringify(ctx).length
  const steps = [
    () => ctx.guide.places.splice(8),
    () => ctx.recent.exchanges.splice(0, Math.max(0, ctx.recent.exchanges.length - 2)),
    () => ctx.guide.cities.splice(3),
    () => ctx.trip?.days?.splice(2),
    () => ctx.guide.places.splice(4),
    () => ctx.trip && (ctx.trip.legs = undefined),
    () => ctx.verified?.places?.forEach((p) => (p.about = undefined)),
    () => ctx.guide.places.splice(0),
    () => ctx.travelMode && (ctx.travelMode.savedInCity = undefined),
    () => ctx.trip && (ctx.trip.days = undefined),
    () => ctx.travelMode?.today?.splice(10),
  ]
  for (const step of steps) {
    if (size() <= MAX_AI_CONTEXT) break
    step()
  }
  return ctx
}
