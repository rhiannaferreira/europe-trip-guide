import { countries, countryByCode } from '../data/countries.js'
import { cities, cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { places } from '../data/places.js'

const STOPWORDS = new Set(['in', 'the', 'and', 'of', 'near', 'a', 'to'])

// Lowercase and strip accents so "sibenik" finds "Šibenik".
export const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const tokens = (query) => normalize(query).split(/\s+/).filter((t) => t && !STOPWORDS.has(t))

const countryText = (code) => {
  const c = countryByCode[code]
  return [c.name, ...(c.aliases || [])].join(' ')
}

// Everything a place can be found by: its name, type, category (and synonyms), city and country.
const placeText = (p) => {
  const city = cityById[p.cityId]
  const interest = interestById[p.category]
  return normalize([p.name, p.type, p.description, interest.label, ...interest.keywords, city.name, countryText(city.country)].join(' '))
}
const cityText = (c) => normalize([c.name, countryText(c.country)].join(' '))

const placeIndex = places.map((p) => [p, placeText(p)])
const cityIndex = cities.map((c) => [c, cityText(c)])
const placeTextById = Object.fromEntries(placeIndex.map(([p, text]) => [p.id, text]))

const matchesAll = (text, ts) => ts.every((t) => text.includes(t))

// True when a place matches every word of the query (empty query matches everything).
export function placeMatches(place, query) {
  const ts = tokens(query)
  if (ts.length === 0) return true
  return matchesAll(placeTextById[place.id] ?? placeText(place), ts)
}

// Suggestions for the search dropdown, grouped by kind.
export function search(query, limit = 6) {
  const ts = tokens(query)
  if (ts.length === 0) return { countries: [], cities: [], places: [] }
  return {
    countries: countries.filter((c) => matchesAll(normalize(countryText(c.code)), ts)).slice(0, 3),
    cities: cityIndex.filter(([, text]) => matchesAll(text, ts)).map(([c]) => c).slice(0, limit),
    places: placeIndex.filter(([, text]) => matchesAll(text, ts)).map(([p]) => p).slice(0, limit),
  }
}
