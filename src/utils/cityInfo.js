// Facts about a city, derived from the sample data, for comparison, the quiz and Surprise Me.
import { cityById, gemAlternativeTo, hiddenGemsFor } from '../data/cities.js'
import { COST_LEVELS, perPersonDay } from '../data/costs.js'
import { placesInCity } from '../data/places.js'
import { trainTimes } from '../data/trainTimes.js'

// Direct sample connections from a city, quickest first: [{ city, minutes, mode }].
export function connectionsFrom(cityId) {
  return trainTimes
    .filter((t) => t.from === cityId || t.to === cityId)
    .map((t) => ({ city: cityById[t.from === cityId ? t.to : t.from], minutes: t.minutes, mode: t.mode }))
    .filter((c) => c.city)
    .sort((a, b) => a.minutes - b.minutes)
}

// Plain-language rail connectivity from the number of direct sample connections.
export function connectivityLabel(count) {
  if (count >= 5) return 'Very well connected'
  if (count >= 3) return 'Well connected'
  if (count >= 1) return 'A few direct links'
  return 'No direct links in the sample data'
}

// How a city does on one interest: whether it's one of the things it's known for, and how many sample places it has.
export function interestStrength(city, interestId) {
  return { known: city.interests.includes(interestId), places: placesInCity(city.id).filter((p) => p.category === interestId).length }
}

export const costLevelOf = (city) => COST_LEVELS[city.costLevel] || null
export const dailyCostEur = (city) => (costLevelOf(city) ? perPersonDay(costLevelOf(city)) : null)

export const stayText = (city) => {
  const [min, max] = city.recommendedDays || []
  if (!min) return 'No suggestion yet'
  return min === max ? `${min} day${min === 1 ? '' : 's'}` : `${min}–${max} days`
}

// Hidden gem alternatives, or for a gem, the famous cities it's an alternative to.
export function gemLinks(city) {
  return city.hiddenGem ? { kind: 'alternativeTo', cities: gemAlternativeTo(city.id) } : { kind: 'gems', cities: hiddenGemsFor(city) }
}
