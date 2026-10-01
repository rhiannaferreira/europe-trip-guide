// What the copilot can ask the app to do, and the check every request goes through.
//
// The rules in appIntents.js, or the AI model behind /api/assistant, only name ONE of these actions with
// its fields. validateAppAction checks it against Eurowander's data and the open trip; appRun.js and
// tripRun.js work out every answer and every proposed change from the app's own data and planner; and a
// change to a trip only happens when the traveller presses Apply.
import { cities, cityById } from '../data/cities.js'
import { countries } from '../data/countries.js'
import { places } from '../data/places.js'
import { BUILDER_INTERESTS, PACES, builderInterestById } from '../planner/preferences.js'

export const DISCOVERY_ACTIONS = [
  'suggest_cities',
  'suggest_places',
  'city_info',
  'compare_cities',
  'trains_from',
  'next_after',
  'alternatives_to',
  'route',
  'surprise',
  'pick_from_list',
  'build_trip',
  'open_city',
  'open_country',
  'open_page',
  'show_on_map',
  'help',
  // Anything that isn't one of the app's actions: a travel question the AI answers, using whatever
  // verified Eurowander data fits (see aiContext.js). The rules never produce it.
  'open_question',
]
// Need a trip open (My trip, or the Build page's plan).
export const TRIP_ACTIONS = [
  'add_city',
  'remove_city',
  'replace_city',
  'change_nights',
  'optimize_route',
  'make_relaxed',
  'reduce_travel',
  'make_cheaper',
  'more_gems',
  'more_interest',
  'lighten_day',
  'plan_day',
  'optimize_day',
  'move_place_to_day',
  'rain_plan',
  'move_category_to_day',
  'places_near',
  'trip_question',
]
export const APP_ACTIONS = [...DISCOVERY_ACTIONS, 'save_place', 'my_trip', ...TRIP_ACTIONS, 'unknown']
export const PAGES = ['home', 'explore', 'trip', 'build', 'compare', 'quiz']
export const HELP_TOPICS = ['share', 'accounts', 'build', 'itinerary', 'budget', 'compare', 'quiz', 'surprise', 'print', 'offline', 'weather', 'gems', 'dark_mode', 'save_places', 'general']
export const INTERESTS = BUILDER_INTERESTS.map((i) => i.id)
export const CATEGORIES = ['food', 'outdoors', 'museums', 'nightlife', 'history', 'shopping']
export const QUESTIONS = ['rushed', 'busiest_day', 'most_expensive', 'budget_fit', 'budget_summary', 'travel_time', 'weather', 'why_city', 'best_outdoor_day', 'next_step', 'route_check']
export const CRITERIA = ['cheapest', 'most_expensive', 'least_touristy', 'closest', 'best_weather', 'best_for_interest']
const PACE_IDS = PACES.map((p) => p.id)

const str = (description) => ({ type: 'string', description })
const list = (description, items = { type: 'string' }) => ({ type: 'array', items, description })
const num = (description) => ({ type: ['integer', 'null'], description })

// JSON schema for the AI model's structured output. Every field is always present: '' / 'none' / []
// / null / false when it doesn't apply.
export const APP_ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'city', 'cities', 'country', 'countries', 'place', 'page', 'interests', 'category', 'hiddenGems', 'month', 'tripDays', 'startDate', 'pace', 'budget', 'currency', 'travellers', 'startCity', 'targetCity', 'day', 'nights', 'delta', 'amount', 'question', 'criterion', 'topic', 'keepCities', 'keepCountries', 'maxExtraTravelMinutes', 'reply'],
  properties: {
    action: { type: 'string', enum: APP_ACTIONS },
    city: str('The one city the request is about (or the new city to add / use as a replacement), or empty'),
    cities: list('Several cities: to compare, for a route in order, or must-visit cities for build_trip'),
    country: str('One country, or empty'),
    countries: list('build_trip: countries to include'),
    place: str('A place name as the traveller wrote it, or empty'),
    page: { type: 'string', enum: [...PAGES, 'none'] },
    interests: list('Interests mentioned', { type: 'string', enum: INTERESTS }),
    category: { type: 'string', enum: [...CATEGORIES, 'none'], description: 'Kind of place: suggest_places, places_near, move_category_to_day' },
    hiddenGems: { type: 'boolean', description: 'They want less touristy / quieter / underrated' },
    month: num('A month 1-12 they mentioned, e.g. October = 10'),
    tripDays: num('build_trip: trip length in days (weeks × 7)'),
    startDate: str('build_trip: YYYY-MM-DD for a specific date, else empty'),
    pace: { type: 'string', enum: [...PACE_IDS, 'none'] },
    budget: num('build_trip: total budget for everyone'),
    currency: { type: 'string', enum: ['EUR', 'USD', 'GBP', 'none'] },
    travellers: num('build_trip: number of travellers'),
    startCity: str('build_trip: where the trip starts, or empty'),
    targetCity: str('A city already in the open trip that the change or question is about, or empty'),
    day: num('Trip day number (1-based); convert weekdays, dates, "today", "tomorrow" using trip.days'),
    nights: num('change_nights: an exact number of nights'),
    delta: num('change_nights: change in nights, e.g. 1 or -1'),
    amount: num('make_cheaper: how much cheaper, in the trip currency'),
    question: { type: 'string', enum: [...QUESTIONS, 'none'] },
    criterion: { type: 'string', enum: [...CRITERIA, 'none'], description: 'pick_from_list: how to choose among recent.lastShown' },
    topic: { type: 'string', enum: [...HELP_TOPICS, 'none'] },
    keepCities: list('make_cheaper / reduce_travel: cities in the trip they said to keep'),
    keepCountries: list('make_cheaper / reduce_travel: countries they said to keep'),
    maxExtraTravelMinutes: num('make_cheaper / reduce_travel: the most extra travel time they will accept, in minutes (0 for none)'),
    reply: str('One short, friendly sentence saying what you understood; no facts, prices, times or recommendations'),
  },
}

export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const cityByName = Object.fromEntries(cities.flatMap((c) => [[fold(c.name), c.id], [c.id, c.id]]))
const countryByName = Object.fromEntries(countries.flatMap((c) => [[fold(c.name), c.code], [fold(c.code), c.code], ...(c.aliases || []).map((a) => [fold(a), c.code])]))
export const resolveCity = (v) => (v ? cityByName[fold(v)] || null : null)
export const resolveCountry = (v) => (v ? countryByName[fold(v)] || null : null)

// A place by name, preferring an exact name, then a name that starts with or contains what was typed.
// `prefer` (city ids) are searched first. Only Eurowander's own places, never invented ones.
export function resolvePlace(text, { cityId = null, prefer = [] } = {}) {
  const q = fold(text).replace(/^(the|a)\s+/, '')
  if (q.length < 3) return null
  const n = (p) => fold(p.name).replace(/^the\s+/, '')
  const find = (pool) => pool.find((p) => n(p) === q) || pool.find((p) => n(p).startsWith(q)) || pool.find((p) => n(p).includes(q)) || pool.find((p) => q.includes(n(p)))
  if (cityId) return find(places.filter((p) => p.cityId === cityId)) || null
  return (prefer.length && find(places.filter((p) => prefer.includes(p.cityId)))) || find(places) || null
}

const given = (v) => v !== undefined && v !== null && v !== '' && v !== 'none'
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null)
const isoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
const cut = (v) => String(v).slice(0, 40)
const arr = (v) => (Array.isArray(v) ? v.filter(given).slice(0, 12) : [])

// `ctx`: { handle (the open trip, or null), pageCityId, memory: { lastList, anchorCity } }
// Returns { ok: true, action } with ids in place of names, or { ok: false, error }.
export function validateAppAction(raw, ctx = {}) {
  const { handle = null, pageCityId = null, memory = {} } = ctx
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Not an action' }
  if (!APP_ACTIONS.includes(raw.action)) return { ok: false, error: `Unknown action “${cut(raw.action)}”` }
  const a = { action: raw.action, reply: typeof raw.reply === 'string' ? raw.reply.slice(0, 300) : '' }
  const tripIds = handle ? handle.plan.stops.map((s) => s.cityId) : []

  // An open question may be about anywhere; it just gets less Eurowander data to work with.
  const open = raw.action === 'open_question'
  const city = given(raw.city) ? resolveCity(raw.city) : null
  if (given(raw.city) && !city && !open) return { ok: false, error: `${cut(raw.city)} isn’t one of Eurowander’s cities yet.` }
  const country = given(raw.country) ? resolveCountry(raw.country) : null
  if (given(raw.country) && !country && !open) return { ok: false, error: `${cut(raw.country)} isn’t one of Eurowander’s countries yet.` }
  const cityList = [...new Set(arr(raw.cities).map(resolveCity).filter(Boolean))]
  const badCities = arr(raw.cities).filter((c) => !resolveCity(c)).map(cut)
  a.interests = [...new Set(arr(raw.interests).filter((i) => builderInterestById[i]))]
  a.category = CATEGORIES.includes(raw.category) ? raw.category : null
  a.hiddenGems = raw.hiddenGems === true
  a.month = int(raw.month, 1, 12)
  const anchor = city || pageCityId || memory.anchorCity || null

  // Places near a named place, and adding a named city to an empty My trip, don't need a trip open.
  if (TRIP_ACTIONS.includes(a.action) && !handle && !(a.action === 'places_near' && given(raw.place)) && !(a.action === 'add_city' && city)) {
    return { ok: false, error: 'That needs a trip. Build one (try “Plan 10 days in Italy”), or add cities to My trip first.', noTrip: true }
  }
  const target = given(raw.targetCity) ? resolveCity(raw.targetCity) : null
  const inTrip = (id) => id && tripIds.includes(id)
  const dayCount = handle ? handle.days.length : 0
  const day = raw.day == null ? null : int(raw.day, 1, Math.max(1, dayCount))
  if (raw.day != null && day === null && handle) return { ok: false, error: 'That day isn’t in this trip.' }
  const needsDates = () => handle.kind === 'saved' && !handle.trip.startDate

  switch (a.action) {
    case 'open_city':
    case 'city_info':
    case 'trains_from':
    case 'next_after':
    case 'alternatives_to':
      a.city = city || (a.action === 'next_after' && tripIds.length ? tripIds[tripIds.length - 1] : anchor)
      if (!a.city) return { ok: false, error: 'Which city?' }
      break
    case 'show_on_map': {
      const place = given(raw.place) ? resolvePlace(raw.place, { prefer: tripIds }) : null
      a.place = place?.id || null
      a.city = place ? place.cityId : anchor
      if (!a.city) return { ok: false, error: 'Which city or place?' }
      break
    }
    case 'open_country':
      if (!country) return { ok: false, error: 'Which country?' }
      a.country = country
      break
    case 'open_page':
      if (!PAGES.includes(raw.page)) return { ok: false, error: 'Which page?' }
      a.page = raw.page
      break
    case 'help':
      a.topic = HELP_TOPICS.includes(raw.topic) ? raw.topic : 'general'
      break
    case 'suggest_places':
      a.city = city || pageCityId || memory.anchorCity || null
      if (!a.city) return { ok: false, error: 'Which city?' }
      a.category ||= a.interests.length ? builderInterestById[a.interests[0]].interests[0] : null
      break
    case 'suggest_cities':
    case 'surprise':
      a.country = country
      break
    case 'compare_cities': {
      const ids = cityList.length ? cityList : (memory.lastList || []).filter((id) => cityById[id])
      if (city && !ids.includes(city)) ids.unshift(city)
      a.cities = ids.slice(0, 4)
      if (a.cities.length < 2) return { ok: false, error: badCities.length ? `${badCities.join(', ')} isn’t in Eurowander yet.` : 'Which cities should I compare?' }
      break
    }
    case 'route':
      a.cities = cityList
      if (a.cities.length < 2) return { ok: false, error: badCities.length ? `${badCities.join(', ')} isn’t in Eurowander yet.` : 'Which cities should the route go through?' }
      break
    case 'pick_from_list':
      a.list = (memory.lastList || []).filter((id) => cityById[id])
      if (a.list.length < 2) return { ok: false, error: 'Which ones? Ask me for a few cities first, then I can pick between them.' }
      a.criterion = CRITERIA.includes(raw.criterion) ? raw.criterion : 'cheapest'
      break
    case 'build_trip':
      a.cities = cityList
      a.countries = [...new Set(arr(raw.countries).map(resolveCountry).filter(Boolean))]
      if (country && !a.countries.includes(country)) a.countries.push(country)
      a.skipped = [...badCities, ...arr(raw.countries).filter((c) => !resolveCountry(c)).map(cut)]
      a.tripDays = int(raw.tripDays, 1, 45)
      a.startDate = isoDate(raw.startDate) ? raw.startDate : null
      a.pace = PACE_IDS.includes(raw.pace) ? raw.pace : null
      a.budget = int(raw.budget, 1, 10_000_000)
      a.currency = ['EUR', 'USD', 'GBP'].includes(raw.currency) ? raw.currency : null
      a.travellers = int(raw.travellers, 1, 20)
      a.startCity = given(raw.startCity) ? resolveCity(raw.startCity) : null
      if (a.startCity) a.cities = a.cities.filter((c) => c !== a.startCity)
      if (city && !a.cities.includes(city) && city !== a.startCity) a.cities.push(city)
      break
    case 'save_place': {
      if (!given(raw.place)) return { ok: false, error: 'Which place?' }
      const place = resolvePlace(raw.place, { cityId: city, prefer: [...tripIds, pageCityId].filter(Boolean) })
      if (!place) return { ok: false, error: `I couldn’t find “${cut(raw.place)}” in Eurowander’s places${city ? ` in ${cityById[city].name}` : ''}.` }
      a.place = place.id
      break
    }
    case 'my_trip':
      break

    // ----- Trip changes and questions -----
    case 'add_city':
      if (!city && !a.interests.length && !a.hiddenGems) return { ok: false, error: 'Which city should I add?' }
      if (city && inTrip(city)) return { ok: false, error: `${cityById[city].name} is already in your trip.` }
      a.city = city
      a.nights = int(raw.nights, 1, 14)
      break
    case 'remove_city':
      if (target && !inTrip(target)) return { ok: false, error: `${cityById[target].name} isn’t in your trip.` }
      a.targetCity = target || (inTrip(city) ? city : null)
      if (given(raw.targetCity) && !target) return { ok: false, error: `${cut(raw.targetCity)} isn’t in your trip.` }
      break
    case 'replace_city':
    case 'change_nights': {
      const t = target || (inTrip(city) ? city : null)
      if (!t) return { ok: false, error: given(raw.targetCity) || given(raw.city) ? `${cut(raw.targetCity || raw.city)} isn’t in your trip.` : 'Which city in your trip?' }
      a.targetCity = t
      if (a.action === 'replace_city') {
        a.city = city && city !== t ? city : null
        if (a.city && inTrip(a.city)) return { ok: false, error: `${cityById[a.city].name} is already in your trip.` }
        a.cheaper = /cheap/.test(String(raw.criterion)) || raw.cheaper === true
      } else {
        a.delta = int(raw.delta, -10, 10)
        a.nights = int(raw.nights, 0, 30)
        if (a.delta === null && a.nights === null) a.delta = 1
        if (a.delta === 0) return { ok: false, error: 'No change in nights.' }
      }
      break
    }
    case 'more_interest':
      if (!a.interests.length) return { ok: false, error: 'More of what? Food, nightlife, museums, nature…' }
      break
    case 'make_cheaper':
    case 'reduce_travel': {
      if (a.action === 'make_cheaper') a.amount = int(raw.amount, 1, 1_000_000)
      const keepCities = [...new Set(arr(raw.keepCities).map(resolveCity).filter(inTrip))]
      const keepCountries = [...new Set(arr(raw.keepCountries).map(resolveCountry).filter((c) => c && tripIds.some((id) => cityById[id].country === c)))]
      const maxExtraTravel = int(raw.maxExtraTravelMinutes, 0, 24 * 60)
      a.limits = keepCities.length || keepCountries.length || maxExtraTravel != null ? { keepCities, keepCountries, maxExtraTravel } : null
      break
    }
    case 'open_question':
      a.city = city
      a.cities = cityList
      a.country = country
      a.place = given(raw.place) ? resolvePlace(raw.place, { cityId: city, prefer: tripIds })?.id || null : null
      break
    case 'lighten_day':
    case 'plan_day':
    case 'optimize_day':
    case 'move_place_to_day':
    case 'move_category_to_day':
      if (needsDates()) return { ok: false, error: 'Add dates to My trip first, so it has days to plan. They’re at the top of the Trip tab.', needsDates: true }
      if (!day) return { ok: false, error: 'Which day?' }
      a.day = day
      if (a.action === 'move_place_to_day') {
        const place = given(raw.place) ? resolvePlace(raw.place, { prefer: tripIds }) : null
        if (!place) return { ok: false, error: given(raw.place) ? `I couldn’t find “${cut(raw.place)}” in Eurowander’s places.` : 'Which place?' }
        a.place = place.id
      }
      if (a.action === 'move_category_to_day') a.category ||= 'museums'
      break
    case 'rain_plan':
      if (needsDates()) return { ok: false, error: 'Add dates to My trip first; the weather depends on them.', needsDates: true }
      a.day = day
      break
    case 'places_near': {
      a.category ||= a.interests.length ? builderInterestById[a.interests[0]].interests[0] : null
      const place = given(raw.place) ? resolvePlace(raw.place, { prefer: tripIds }) : null
      if (given(raw.place) && !place) return { ok: false, error: `I couldn’t find “${cut(raw.place)}” in Eurowander’s places.` }
      a.place = place?.id || null
      a.day = day
      break
    }
    case 'trip_question':
      a.question = QUESTIONS.includes(raw.question) ? raw.question : 'next_step'
      a.day = day
      a.targetCity = target && inTrip(target) ? target : inTrip(city) ? city : null
      if (a.question === 'why_city' && !a.targetCity) return { ok: false, error: 'Which city in your trip?' }
      break
    default:
      break
  }
  return { ok: true, action: a }
}
