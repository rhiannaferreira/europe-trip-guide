// How well a city fits the traveller's preferences, as points with plain-language reasons.
// Points only rank cities against each other; they're never shown as a score.
//
//   interest the city is known for                        +3 each (beaches: the city has a beach)
//   interest it only has sample places for                +1 each
//   architecture / local culture (closest match in data)  +2 known for history or food, +1 with matching places
//   no interests picked                                   +1 for big-name cities
//   destination mix  famous:        famous +3, hidden gem −2
//                    mostly famous: famous +2, gem +0.5
//                    balanced:      famous +1, gem +1, other small towns +0.5
//                    mostly gems:   gem +2, small town +1, famous +0.5
//                    gems:          gem +3, small town +1.5, famous −1
//   month in the city's best-weather months                +1; busy season −0.5; cheaper season +0.5 with a budget
//   daily costs vs budget  over what the budget allows      −1.5 × how far over; well under +0.5
//   train-first: direct sample rail links                  +0.25 each, up to +1
//   in a country the traveller wants to visit               +2
import { placesInCity } from '../data/places.js'
import { COST_LEVELS, CURRENCIES, perPersonDay } from '../data/costs.js'
import { monthNames } from '../lib/format.js'
import { builderInterestById } from './preferences.js'

export const isFamous = (city) => city.size === 'major' && !city.hiddenGem
export const kindOf = (city) => (city.hiddenGem ? 'gem' : isFamous(city) ? 'famous' : 'small')

const MIX_POINTS = {
  famous: { famous: 3, gem: -2, small: 0 },
  'mostly-famous': { famous: 2, gem: 0.5, small: 0.5 },
  balanced: { famous: 1, gem: 1, small: 0.5 },
  'mostly-gems': { famous: 0.5, gem: 2, small: 1 },
  gems: { famous: -1, gem: 3, small: 1.5 },
}

const join = (words) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`)

// Per person per day the budget allows for rooms, food and local transport, in euros, or null without a budget.
// 80% of the total is assumed to go on days in cities; the rest covers journeys and entry fees.
export function dailyAllowanceEur(prefs) {
  if (!prefs.budget) return null
  const eur = prefs.budget / (CURRENCIES[prefs.currency]?.perEuro || 1)
  return (eur * 0.8) / Math.max(1, prefs.travellers) / Math.max(1, prefs.days)
}

// How a city matches one builder interest: 'strong', 'some' or null.
export function interestFit(city, builderId) {
  const def = builderInterestById[builderId]
  if (!def) return null
  if (def.beach) return city.beach ? 'strong' : null
  const places = placesInCity(city.id)
  const known = def.interests.some((i) => city.interests.includes(i))
  const hasPlaces = places.some((p) => def.interests.includes(p.category) || def.placeTypes?.includes(p.type))
  if (def.approx) return known && hasPlaces ? 'strong' : known || hasPlaces ? 'some' : null
  if (known) return 'strong'
  return hasPlaces ? 'some' : null
}

export function scoreCity(city, prefs) {
  let score = 0
  const reasons = []
  const strong = []

  for (const id of prefs.interests) {
    const fit = interestFit(city, id)
    const def = builderInterestById[id]
    if (fit === 'strong') {
      score += def.approx ? 2 : 3
      strong.push(def.label.toLowerCase())
    } else if (fit === 'some') score += 1
  }
  if (strong.length) reasons.push(`Matches your ${join(strong)} interest${strong.length === 1 ? '' : 's'}`)
  if (prefs.interests.length === 0 && isFamous(city)) score += 1

  const kind = kindOf(city)
  score += MIX_POINTS[prefs.mix]?.[kind] ?? 0
  if (kind === 'gem' && ['balanced', 'mostly-gems', 'gems'].includes(prefs.mix)) reasons.push('A hidden gem: fewer crowds than the big names')
  if (kind === 'famous' && ['famous', 'mostly-famous'].includes(prefs.mix)) reasons.push('One of Europe’s headline cities')

  if (prefs.month) {
    const s = city.seasons
    if (s.bestWeather?.includes(prefs.month)) {
      score += 1
      reasons.push(`Usually good weather in ${monthNames[prefs.month - 1]} (seasonal guide)`)
    }
    if (s.busy?.includes(prefs.month)) score -= 0.5
    if (prefs.budget && s.lowerCost?.includes(prefs.month)) {
      score += 0.5
      reasons.push(`Usually cheaper in ${monthNames[prefs.month - 1]}`)
    }
  }

  const allowance = dailyAllowanceEur(prefs)
  const level = COST_LEVELS[city.costLevel]
  if (allowance && level) {
    const need = perPersonDay(level)
    if (need > allowance) score -= 1.5 * Math.min(2, need / allowance - 1 + 0.5)
    else if (need < allowance * 0.75) {
      score += 0.5
      reasons.push('Easy on your budget')
    }
  }

  if (prefs.transport === 'train' && city.trainConnectivity) {
    score += Math.min(1, city.trainConnectivity * 0.25)
    if (city.trainConnectivity >= 3) reasons.push('Well connected by train')
  }

  if (prefs.includeCountries.includes(city.country)) score += 2

  return { score, reasons, kind }
}
