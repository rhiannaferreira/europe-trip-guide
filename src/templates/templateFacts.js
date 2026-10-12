// Small facts about a ready-made trip, from its own record and the city data only, so the home page cards
// and the Trip ideas list can use them without loading the planner.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { templateDayCount } from '../data/tripTemplates.js'
import { tripPace } from '../lib/trip.js'

const PACE_ID = { 'Fast-paced': 'fast', Moderate: 'moderate', Relaxed: 'relaxed' }

// The template's countries, in route order.
export const templateCountries = (t) => [...new Set(t.stops.map((s) => cityById[s.cityId]?.country).filter(Boolean))]
export const templateFlags = (t) => templateCountries(t).map((c) => countryByCode[c].flag).join(' ')
export const routeText = (stops) => stops.map((s) => cityById[s.cityId]?.name).join(' → ')

// "Rome, Florence & Venice"
export function cityList(stops) {
  const names = stops.map((s) => cityById[s.cityId]?.name)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0] || ''
}

// The pace the app's own rule gives this length and number of cities (lib/trip.js).
export function templatePace(t) {
  const p = tripPace(templateDayCount(t), t.stops.length)
  return p ? { id: PACE_ID[p.label], label: p.label } : null
}

// Filters for the Trip ideas page. Every filter is optional; '' or 'all' means any.
export const DURATIONS = [
  { id: '3-5', label: '3–5 days', min: 3, max: 5 },
  { id: '6-8', label: '6–8 days', min: 6, max: 8 },
  { id: '9-12', label: '9–12 days', min: 9, max: 12 },
  { id: '13+', label: '13+ days', min: 13, max: Infinity },
]
export const STYLES = [
  { id: 'food', label: 'Food', test: (t) => t.interests.includes('food') },
  { id: 'history', label: 'History', test: (t) => t.interests.includes('history') },
  { id: 'nature', label: 'Nature', test: (t) => t.interests.some((i) => i === 'nature' || i === 'beaches') || t.categories.includes('nature') },
  { id: 'nightlife', label: 'Nightlife', test: (t) => t.interests.includes('nightlife') },
  { id: 'train', label: 'Train', test: (t) => t.categories.includes('train') },
  { id: 'gems', label: 'Hidden gems', test: (t) => t.categories.includes('gems') },
]

export function filterTemplates(list, { category = 'all', duration = '', style = '', country = '', pace = '', countries = '' } = {}) {
  const span = DURATIONS.find((d) => d.id === duration)
  const s = STYLES.find((x) => x.id === style)
  return list.filter((t) => {
    const days = templateDayCount(t)
    const codes = templateCountries(t)
    if (category !== 'all' && category && !t.categories.includes(category)) return false
    if (span && (days < span.min || days > span.max)) return false
    if (s && !s.test(t)) return false
    if (country && !codes.includes(country)) return false
    if (pace && templatePace(t)?.id !== pace) return false
    if (countries === 'one' && codes.length !== 1) return false
    if (countries === 'multi' && codes.length < 2) return false
    return true
  })
}
