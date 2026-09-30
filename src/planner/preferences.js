// Trip builder preferences: the options, their defaults, and checking what the user typed.
// Nothing is required. Anything missing gets a sensible default, and every default is listed here.
import { cityById, cities } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { CURRENCIES } from '../data/costs.js'

export const BUILDER_INTERESTS = [
  // `interests` are the app's own interest ids (data/interests.js) that stand in for each option.
  // Architecture and local culture have no category of their own in the data, so they use the closest ones.
  { id: 'food', label: 'Food', icon: '🍽️', interests: ['food'] },
  { id: 'history', label: 'History', icon: '🏰', interests: ['history'] },
  { id: 'museums', label: 'Museums', icon: '🖼️', interests: ['museums'] },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙', interests: ['nightlife'] },
  { id: 'nature', label: 'Nature', icon: '🌳', interests: ['outdoors'] },
  { id: 'beaches', label: 'Beaches', icon: '🏖️', interests: ['outdoors'], beach: true },
  { id: 'architecture', label: 'Architecture', icon: '🏛️', interests: ['history'], placeTypes: ['landmark', 'church', 'palace', 'castle', 'neighbourhood'], approx: true },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', interests: ['shopping'] },
  { id: 'culture', label: 'Local culture', icon: '🎭', interests: ['food', 'history'], placeTypes: ['market', 'neighbourhood', 'cafe'], approx: true },
]
export const builderInterestById = Object.fromEntries(BUILDER_INTERESTS.map((i) => [i.id, i]))

// Nights per city each pace aims for. The existing trip rule (lib/trip.js) calls under 2 days per city
// fast-paced, 2–3 moderate and over 3 relaxed; these targets sit inside those bands.
export const PACES = [
  { id: 'relaxed', label: 'Relaxed', nightsPerCity: 3.5, activitiesPerDay: 2, hint: 'Fewer cities, 3–4 nights each' },
  { id: 'moderate', label: 'Moderate', nightsPerCity: 2.5, activitiesPerDay: 3, hint: '2–3 nights in most places' },
  { id: 'fast', label: 'Fast-paced', nightsPerCity: 1.75, activitiesPerDay: 4, hint: 'More cities, shorter stays' },
]
export const paceById = Object.fromEntries(PACES.map((p) => [p.id, p]))

export const TRANSPORT = [
  { id: 'train', label: 'Train-first', hint: 'Trains and buses only' },
  { id: 'mixed', label: 'Train, fly if long', hint: 'Suggest a flight on very long legs' },
  { id: 'fastest', label: 'Fastest', hint: 'Fly whenever it saves real time' },
]

export const DESTINATION_MIX = [
  { id: 'famous', label: 'Famous destinations' },
  { id: 'mostly-famous', label: 'Mostly famous' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'mostly-gems', label: 'Mostly hidden gems' },
  { id: 'gems', label: 'Hidden gems' },
]

export const MAX_LEG_OPTIONS = [120, 180, 240, 300, 360, null] // minutes; null = no limit

export const MIN_DAYS = 1
export const MAX_DAYS = 45
export const DEFAULT_DAYS = 10

export const defaultPreferences = () => ({
  startDate: '', // 'YYYY-MM-DD'
  endDate: '', // optional; sets the number of days when both dates are given
  month: null, // 1–12, used when there's no start date (seasons, weather history)
  days: DEFAULT_DAYS,
  startCityId: '',
  endCityId: '', // '' = end wherever the route ends; same as start = round trip
  includeCountries: [],
  avoidCountries: [],
  mustVisit: [],
  budget: '', // total for everyone, as typed
  currency: 'USD',
  travellers: 2,
  interests: [],
  pace: 'moderate',
  transport: 'train',
  maxLegMinutes: 240,
  mix: 'balanced',
})

const DAY_MS = 86400000
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const validIso = (s) => typeof s === 'string' && isoDate.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime())
const toDate = (s) => new Date(`${s}T00:00:00`)
export const addDaysIso = (iso, n) => {
  const d = toDate(iso)
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, '0')}-${String(out.getDate()).padStart(2, '0')}`
}
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const uniq = (list) => [...new Set(list)]

// Checks and fills in preferences. Never throws: problems come back as notes, with a fallback applied.
// Returns { prefs, notes: [{ level: 'error' | 'warn' | 'info', field, text }] }.
// `today` ('YYYY-MM-DD') can be passed for tests.
export function normalizePreferences(input = {}, { today = todayIso() } = {}) {
  const d = defaultPreferences()
  const notes = []
  const note = (level, field, text) => notes.push({ level, field, text })

  // Dates and length.
  let startDate = validIso(input.startDate) ? input.startDate : ''
  let endDate = validIso(input.endDate) ? input.endDate : ''
  if (input.startDate && !startDate) note('error', 'startDate', 'The start date isn’t a real date, so it was left out.')
  if (input.endDate && !endDate) note('error', 'endDate', 'The end date isn’t a real date, so it was left out.')
  let days = Number.isFinite(Number(input.days)) && Number(input.days) > 0 ? Math.round(Number(input.days)) : d.days
  if (startDate && endDate) {
    const span = Math.round((toDate(endDate) - toDate(startDate)) / DAY_MS) + 1
    if (span < 1) {
      note('error', 'endDate', 'The end date is before the start date, so it was ignored and the trip length used instead.')
      endDate = ''
    } else days = span
  }
  if (days > MAX_DAYS) {
    note('warn', 'days', `Trips are planned up to ${MAX_DAYS} days, so this one was shortened to ${MAX_DAYS}.`)
    days = MAX_DAYS
  }
  days = Math.max(MIN_DAYS, days)
  if (startDate) endDate = addDaysIso(startDate, days - 1)
  if (startDate && startDate < today) note('warn', 'startDate', 'The start date is in the past. The plan still works, but weather and seasons are based on those dates.')
  let month = Number.isInteger(Number(input.month)) && Number(input.month) >= 1 && Number(input.month) <= 12 ? Number(input.month) : null
  if (startDate) month = toDate(startDate).getMonth() + 1

  // Cities and countries: anything unknown is dropped with a note.
  const city = (id, field) => {
    if (!id) return ''
    if (cityById[id]) return id
    note('warn', field, `“${id}” isn’t one of Eurowander’s cities yet, so it was left out.`)
    return ''
  }
  const startCityId = city(input.startCityId, 'startCityId')
  const endCityId = city(input.endCityId, 'endCityId')
  const countriesOf = (list, field) =>
    uniq((Array.isArray(list) ? list : []).filter((c) => {
      if (countryByCode[c]) return true
      note('warn', field, `Unknown country “${c}” was left out.`)
      return false
    }))
  let includeCountries = countriesOf(input.includeCountries, 'includeCountries')
  const avoidCountries = countriesOf(input.avoidCountries, 'avoidCountries')
  const both = includeCountries.filter((c) => avoidCountries.includes(c))
  if (both.length) {
    note('warn', 'avoidCountries', `${both.map((c) => countryByCode[c].name).join(', ')} was both wanted and avoided; it’s treated as avoided.`)
    includeCountries = includeCountries.filter((c) => !both.includes(c))
  }
  const mustVisit = uniq((Array.isArray(input.mustVisit) ? input.mustVisit : []).map((id) => city(id, 'mustVisit')).filter(Boolean)).filter(
    (id) => id !== startCityId && id !== endCityId,
  )
  for (const id of [startCityId, endCityId, ...mustVisit]) {
    if (id && avoidCountries.includes(cityById[id].country)) {
      note('warn', 'avoidCountries', `${cityById[id].name} is in a country you want to avoid, but you picked it, so it stays.`)
    }
  }
  if (includeCountries.length && !cities.some((c) => includeCountries.includes(c.country))) includeCountries = []

  // Money and people.
  const rawBudget = String(input.budget ?? '').replace(/[, ]/g, '')
  const budget = rawBudget === '' ? null : Number(rawBudget)
  if (rawBudget !== '' && !(Number.isFinite(budget) && budget > 0)) note('warn', 'budget', 'The budget isn’t a number above zero, so the plan ignores it.')
  const currency = CURRENCIES[input.currency] ? input.currency : d.currency
  const travellers = Number.isInteger(Number(input.travellers)) && Number(input.travellers) >= 1 ? Math.min(20, Number(input.travellers)) : d.travellers

  const interests = uniq((Array.isArray(input.interests) ? input.interests : []).filter((i) => builderInterestById[i]))
  const pace = paceById[input.pace] ? input.pace : d.pace
  const transport = TRANSPORT.some((t) => t.id === input.transport) ? input.transport : d.transport
  const maxLegMinutes =
    input.maxLegMinutes === null ? null : Number.isFinite(Number(input.maxLegMinutes)) && Number(input.maxLegMinutes) >= 30 ? Math.round(Number(input.maxLegMinutes)) : d.maxLegMinutes
  const mix = DESTINATION_MIX.some((m) => m.id === input.mix) ? input.mix : d.mix

  if (days === 1) note('info', 'days', 'A one-day trip stays in one city.')

  return {
    prefs: {
      startDate,
      endDate,
      month,
      days,
      nights: days - 1,
      startCityId,
      endCityId,
      roundTrip: Boolean(startCityId && endCityId && startCityId === endCityId),
      includeCountries,
      avoidCountries,
      mustVisit,
      budget: Number.isFinite(budget) && budget > 0 ? budget : null,
      currency,
      travellers,
      interests,
      pace,
      transport,
      maxLegMinutes,
      mix,
    },
    notes,
  }
}

// The app interest ids behind a set of builder interests, e.g. ['nature', 'food'] → ['outdoors', 'food'].
export function appInterests(builderIds) {
  return uniq(builderIds.flatMap((id) => builderInterestById[id]?.interests || []))
}
