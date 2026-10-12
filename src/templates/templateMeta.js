// Titles and descriptions for the trip ideas pages. Used by the app when a page opens and by
// scripts/prerender.mjs when it writes the static HTML for search engines, so both always agree.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { templateDayCount, templatePath, tripTemplates } from '../data/tripTemplates.js'

export const IDEAS_META = {
  title: 'Ready-made Europe trips',
  description: `${tripTemplates.length} ready-made Europe itineraries, mostly by train: routes, nights in each city and ideas for every day. Open one and make it yours.`,
  path: '/trip-ideas',
}

const countriesOf = (t) => [...new Set(t.stops.map((s) => cityById[s.cityId].country))]
const join = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0])
const joinAnd = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0])

// "10 Days in Italy: Rome, Florence & Venice"
// "Explore a 10-day Italy itinerary through Rome, Florence and Venice with train-first travel, ..."
export function templateMeta(t) {
  const names = t.stops.map((s) => cityById[s.cityId].name)
  const codes = countriesOf(t)
  const where = codes.length === 1 ? countryByCode[codes[0]].name : codes.length === 2 ? codes.map((c) => countryByCode[c].name).join(' and ') : 'Europe'
  const ground = t.categories.includes('train') ? 'train-first travel' : 'easy overland travel'
  return {
    title: `${t.title}: ${join(names)}`,
    description: `Explore a ${templateDayCount(t)}-day ${where} itinerary through ${joinAnd(names)} with ${ground}, daily ideas and easy customization in Eurowander.`,
    path: templatePath(t),
  }
}
