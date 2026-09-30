// What the site-wide assistant can ask the app to do, and the check every request goes through.
//
// Like the trip assistant (planner/assistant/actions.js), the rules in appIntents.js or the AI model
// behind /api/assistant only name ONE of these actions. validateAppAction checks it against the app's
// own data; appRun.js works out the answer from that data; anything that changes a saved trip only
// happens when the traveller presses a button. Requests about a trip open in the trip builder become
// 'plan_request' and go through the trip assistant's own actions instead.
import { cities, cityById } from '../data/cities.js'
import { countries } from '../data/countries.js'
import { places } from '../data/places.js'
import { BUILDER_INTERESTS, PACES, builderInterestById } from '../planner/preferences.js'

export const APP_ACTIONS = [
  'plan_request',
  'build_trip',
  'open_city',
  'open_country',
  'open_page',
  'add_city_to_trip',
  'save_place',
  'suggest_places',
  'suggest_cities',
  'city_info',
  'my_trip',
  'help',
  'unknown',
]
export const PAGES = ['home', 'explore', 'trip', 'build', 'compare', 'quiz', 'surprise']
export const HELP_TOPICS = ['share', 'accounts', 'build', 'itinerary', 'budget', 'compare', 'quiz', 'surprise', 'print', 'offline', 'weather', 'gems', 'dark_mode', 'save_places', 'general']
export const INTERESTS = BUILDER_INTERESTS.map((i) => i.id)
const PACE_IDS = PACES.map((p) => p.id)

const str = (description) => ({ type: 'string', description })
const names = (description) => ({ type: 'array', items: { type: 'string' }, description })

// JSON schema for the AI model's structured output. Every field is always present: '' / 'none' / []
// / null / false when it doesn't apply.
export const APP_ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'city', 'country', 'place', 'page', 'interest', 'hiddenGems', 'countries', 'cities', 'interests', 'tripDays', 'startDate', 'pace', 'budget', 'currency', 'travellers', 'startCity', 'topic', 'reply'],
  properties: {
    action: { type: 'string', enum: APP_ACTIONS },
    city: str('One city the request is about, or empty'),
    country: str('One country the request is about, or empty'),
    place: str('A place name as the traveller wrote it (save_place), or empty'),
    page: { type: 'string', enum: [...PAGES, 'none'] },
    interest: { type: 'string', enum: [...INTERESTS, 'none'] },
    hiddenGems: { type: 'boolean', description: 'They want less touristy places' },
    countries: names('build_trip: countries to include'),
    cities: names('build_trip: cities they want to visit'),
    interests: { type: 'array', items: { type: 'string', enum: INTERESTS }, description: 'build_trip: interests' },
    tripDays: { type: ['integer', 'null'], description: 'build_trip: trip length in days' },
    startDate: str('build_trip: YYYY-MM-DD when they gave a date, else empty'),
    pace: { type: 'string', enum: [...PACE_IDS, 'none'] },
    budget: { type: ['integer', 'null'], description: 'build_trip: total budget for everyone' },
    currency: { type: 'string', enum: ['EUR', 'USD', 'GBP', 'none'], description: 'build_trip: currency of the budget' },
    travellers: { type: ['integer', 'null'] },
    startCity: str('build_trip: where the trip starts, or empty'),
    topic: { type: 'string', enum: [...HELP_TOPICS, 'none'] },
    reply: str('One short sentence for the traveller; no facts, prices, times or recommendations'),
  },
}

export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const cityByName = Object.fromEntries(cities.flatMap((c) => [[fold(c.name), c.id], [c.id, c.id]]))
const countryByName = Object.fromEntries(countries.flatMap((c) => [[fold(c.name), c.code], [fold(c.code), c.code], ...(c.aliases || []).map((a) => [fold(a), c.code])]))
export const resolveCity = (v) => (v ? cityByName[fold(v)] || null : null)
export const resolveCountry = (v) => (v ? countryByName[fold(v)] || null : null)

// A place by name, preferring an exact name, then a name that starts with or contains what was typed
// (optionally only in one city). Only Eurowander's own places, never invented ones.
export function resolvePlace(text, cityId = null) {
  const q = fold(text).replace(/^the\s+/, '')
  if (q.length < 3) return null
  const pool = cityId ? places.filter((p) => p.cityId === cityId) : places
  const n = (p) => fold(p.name).replace(/^the\s+/, '')
  return pool.find((p) => n(p) === q) || pool.find((p) => n(p).startsWith(q)) || pool.find((p) => n(p).includes(q)) || null
}

const given = (v) => v !== undefined && v !== null && v !== '' && v !== 'none'
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null)
const isoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
const cut = (v) => String(v).slice(0, 40)

// `ctx.pageCityId`: the city page the traveller is on, used when they don't name one.
// Returns { ok: true, action } with ids in place of names, or { ok: false, error }.
export function validateAppAction(raw, ctx = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Not an action' }
  if (!APP_ACTIONS.includes(raw.action)) return { ok: false, error: `Unknown action “${cut(raw.action)}”` }
  const a = { action: raw.action, reply: typeof raw.reply === 'string' ? raw.reply.slice(0, 300) : '' }

  const city = given(raw.city) ? resolveCity(raw.city) : null
  const unknownCity = given(raw.city) && !city ? `${cut(raw.city)} isn’t one of Eurowander’s cities yet` : null
  const country = given(raw.country) ? resolveCountry(raw.country) : null
  const interest = INTERESTS.includes(raw.interest) ? raw.interest : null

  switch (a.action) {
    case 'open_city':
    case 'add_city_to_trip':
    case 'city_info':
      if (unknownCity) return { ok: false, error: unknownCity }
      a.city = city || (a.action === 'add_city_to_trip' ? null : ctx.pageCityId || null)
      if (!a.city) return { ok: false, error: 'Which city?' }
      break
    case 'open_country':
      if (!country) return { ok: false, error: given(raw.country) ? `${cut(raw.country)} isn’t one of Eurowander’s countries yet` : 'Which country?' }
      a.country = country
      break
    case 'open_page':
      if (!PAGES.includes(raw.page)) return { ok: false, error: 'Which page?' }
      a.page = raw.page
      break
    case 'save_place': {
      if (unknownCity) return { ok: false, error: unknownCity }
      if (!given(raw.place)) return { ok: false, error: 'Which place?' }
      const place = resolvePlace(raw.place, city) || (city ? null : resolvePlace(raw.place, ctx.pageCityId || null))
      if (!place) return { ok: false, error: `I couldn’t find “${cut(raw.place)}” in Eurowander’s places${city ? ` in ${cityById[city].name}` : ''}.` }
      a.place = place.id
      break
    }
    case 'suggest_places':
      if (unknownCity) return { ok: false, error: unknownCity }
      a.city = city || ctx.pageCityId || null
      if (!a.city) return { ok: false, error: 'Which city?' }
      a.interest = interest
      a.hiddenGems = raw.hiddenGems === true
      break
    case 'suggest_cities':
      a.interest = interest
      a.country = country
      a.hiddenGems = raw.hiddenGems === true
      break
    case 'build_trip': {
      const list = (v) => (Array.isArray(v) ? v.filter(given).slice(0, 12) : [])
      const badCities = list(raw.cities).filter((c) => !resolveCity(c))
      const badCountries = list(raw.countries).filter((c) => !resolveCountry(c))
      a.cities = [...new Set(list(raw.cities).map(resolveCity).filter(Boolean))]
      a.countries = [...new Set(list(raw.countries).map(resolveCountry).filter(Boolean))]
      a.skipped = [...badCities, ...badCountries].map(cut)
      a.interests = [...new Set(list(raw.interests).filter((i) => builderInterestById[i]))]
      a.tripDays = int(raw.tripDays, 1, 45)
      a.startDate = isoDate(raw.startDate) ? raw.startDate : null
      a.pace = PACE_IDS.includes(raw.pace) ? raw.pace : null
      a.budget = int(raw.budget, 1, 10_000_000)
      a.currency = ['EUR', 'USD', 'GBP'].includes(raw.currency) ? raw.currency : null
      a.travellers = int(raw.travellers, 1, 20)
      a.startCity = given(raw.startCity) ? resolveCity(raw.startCity) : null
      if (a.startCity) a.cities = a.cities.filter((c) => c !== a.startCity)
      break
    }
    case 'help':
      a.topic = HELP_TOPICS.includes(raw.topic) ? raw.topic : 'general'
      break
    default:
      break
  }
  return { ok: true, action: a }
}
