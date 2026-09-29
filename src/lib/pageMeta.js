// Titles and descriptions for city and country pages. Used by the app when a page opens and by
// scripts/prerender.mjs when it writes the static HTML for search engines, so both always agree.
import { citiesInCountry } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { monthRange } from './format.js'
import { stayText } from '../utils/cityInfo.js'

export function cityMeta(city) {
  const country = countryByCode[city.country]
  return {
    title: `${city.name}, ${country.name}`,
    description: `${city.description} Best months: ${monthRange(city.bestMonths)}. Typical stay: ${stayText(city)}. Places to see, hidden gems and train links.`,
    path: `/city/${city.id}`,
  }
}

export function countryMeta(code) {
  const country = countryByCode[code]
  const n = citiesInCountry(code).length
  return {
    title: `${country.name} travel guide`,
    description: `${n} cities and towns in ${country.name}: places to see, local tips, hidden gems and train links for a multi-country trip.`,
    path: `/country/${code.toLowerCase()}`,
  }
}
