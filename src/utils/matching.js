// Simple, rule-based matching of cities to preferences, for the quiz and Surprise Me.
// Just points added up from the sample data. Every rule is listed here.
import { cities } from '../data/cities.js'
import { COST_LEVELS } from '../data/costs.js'
import { placesInCity } from '../data/places.js'
import { monthRange } from '../lib/format.js'

// Quiz and Surprise Me interests. Most map to an app interest; "beaches" uses the city's `beach` flag.
export const PREFERENCE_INTERESTS = [
  { id: 'food', label: 'Food', icon: '🍽️', interest: 'food' },
  { id: 'history', label: 'History', icon: '🏰', interest: 'history' },
  { id: 'museums', label: 'Museums', icon: '🖼️', interest: 'museums' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙', interest: 'nightlife' },
  { id: 'nature', label: 'Nature', icon: '🌳', interest: 'outdoors' },
  { id: 'beaches', label: 'Beaches', icon: '🏖️', beach: true },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', interest: 'shopping' },
]
const prefById = Object.fromEntries(PREFERENCE_INTERESTS.map((p) => [p.id, p]))

export const PACES = [
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'packed', label: 'Packed' },
]
export const BUDGETS = [
  { id: 'budget', label: 'Budget' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'flexible', label: 'Flexible' },
]
export const DESTINATION_TYPES = [
  { id: 'major', label: 'Major cities' },
  { id: 'smaller', label: 'Smaller cities' },
  { id: 'gems', label: 'Hidden gems' },
  { id: 'mix', label: 'Mix' },
]
export const SEASONS = [
  { id: 'spring', label: 'Spring', months: [3, 4, 5] },
  { id: 'summer', label: 'Summer', months: [6, 7, 8] },
  { id: 'autumn', label: 'Autumn', months: [9, 10, 11] },
  { id: 'winter', label: 'Winter', months: [12, 1, 2] },
]

// Does the city match one preference interest? 'strong' = known for it (or has a beach), 'some' = has sample places, null = no.
export function interestMatch(city, prefId) {
  const pref = prefById[prefId]
  if (!pref) return null
  if (pref.beach) return city.beach ? 'strong' : null
  if (city.interests.includes(pref.interest)) return 'strong'
  return placesInCity(city.id).some((p) => p.category === pref.interest) ? 'some' : null
}

const list = (words) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`)
const lower = (id) => prefById[id].label.toLowerCase()

// Quiz scoring. Points:
//   interest the city is known for (or beach for "Beaches")  +3
//   interest it only has sample places for                   +1
//   budget:    Budget → $ +3, $$ +1, $$$ −2 | Moderate → $$ +3, $ +2, $$$ −1 | Flexible → no change
//   type:      Major → major city +3 | Smaller → smaller city +3 | Hidden gems → hidden gem +4 | Mix → +1 for all
//   pace:      Relaxed → smaller city +1 | Packed → major city +1 | Balanced → no change
export function scoreCity(city, answers) {
  let score = 0
  const strong = []
  for (const id of answers.interests) {
    const m = interestMatch(city, id)
    if (m === 'strong') {
      score += 3
      strong.push(id)
    } else if (m === 'some') score += 1
  }

  const level = city.costLevel
  if (answers.budget === 'budget') score += level === 1 ? 3 : level === 2 ? 1 : -2
  if (answers.budget === 'moderate') score += level === 2 ? 3 : level === 1 ? 2 : -1

  const small = city.size === 'small'
  if (answers.type === 'major' && !small) score += 3
  if (answers.type === 'smaller' && small) score += 3
  if (answers.type === 'gems' && city.hiddenGem) score += 4
  if (answers.type === 'mix') score += 1

  if (answers.pace === 'relaxed' && small) score += 1
  if (answers.pace === 'packed' && !small) score += 1

  // Tie-breaker only: how many sample places the city has for the chosen interests.
  const depth = answers.interests.reduce((n, id) => n + placesInCity(city.id).filter((p) => p.category === prefById[id]?.interest).length, 0)
  return { city, score, strong, depth }
}

// A plain explanation of why a city matched, built only from what actually matched.
export function explainMatch({ city, strong }, answers) {
  const parts = []
  if (strong.length) parts.push(`you picked ${list(strong.map(lower))} (${strong.length === 1 ? 'something' : 'things'} ${city.name} is known for)`)
  const level = COST_LEVELS[city.costLevel]
  if (answers.budget === 'budget' && city.costLevel === 1) parts.push('you want to keep costs low and it is one of the cheaper sample cities')
  else if (answers.budget === 'moderate' && city.costLevel <= 2) parts.push(`you chose moderate costs and it has ${level.label.toLowerCase()} prices`)
  else if (answers.budget === 'flexible' && level) parts.push(`you're flexible on cost (it's ${level.label.toLowerCase()})`)
  if (answers.type === 'major' && city.size !== 'small') parts.push('you prefer major cities')
  if (answers.type === 'smaller' && city.size === 'small') parts.push("you prefer smaller cities and it's a smaller place")
  if (answers.type === 'gems' && city.hiddenGem) parts.push("you're after hidden gems and it's one of them")
  if (answers.type === 'mix') parts.push(`you like a mix of places (it's ${city.hiddenGem ? 'a hidden gem' : city.size === 'small' ? 'a smaller city' : 'a major city'})`)
  return parts.length ? `You may like ${city.name} because ${list(parts)}.` : `${city.name} is a partial match for your answers.`
}

// Suggested stay for the chosen pace, from the city's recommendedDays.
export function stayForPace(city, pace) {
  const [min, max] = city.recommendedDays || [1, 2]
  const days = pace === 'relaxed' ? max : pace === 'packed' ? min : Math.round((min + max) / 2)
  return `${days} day${days === 1 ? '' : 's'}`
}

// Top quiz matches (score above zero), best first. Ties go to the city with more matching sample places, then by name.
export function quizResults(answers, limit = 5) {
  return cities
    .map((c) => scoreCity(c, answers))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.depth - a.depth || a.city.name.localeCompare(b.city.name))
    .slice(0, limit)
}

// ----- Surprise Me -----
// Filters are all optional:
//   interests  the city must match at least one (known for it, or beach for Beaches)
//   budget     Budget → $ only, Moderate → $ or $$, Flexible → any
//   season     the city has good weather or a special season in one of the season's months
const budgetOk = (city, budget) => (budget === 'budget' ? city.costLevel === 1 : budget === 'moderate' ? city.costLevel <= 2 : true)
const seasonMonths = (id) => SEASONS.find((s) => s.id === id)?.months || []
const seasonOk = (city, season) => {
  if (!season) return true
  const months = seasonMonths(season)
  const special = (city.seasons.special || []).some((s) => s.months.some((m) => months.includes(m)))
  return city.bestMonths.some((m) => months.includes(m)) || special
}
const interestsOk = (city, interests) => interests.length === 0 || interests.some((id) => interestMatch(city, id) === 'strong')

// Cities matching the filters. If nothing matches, filters are relaxed one at a time (season, then budget,
// then interests) and `relaxed` says which were dropped, so the UI can be honest about it.
export function surpriseCandidates({ interests = [], budget = '', season = '' }) {
  const attempts = [
    { relaxed: [], f: { interests, budget, season } },
    { relaxed: ['season'], f: { interests, budget, season: '' } },
    { relaxed: ['season', 'budget'], f: { interests, budget: '', season: '' } },
    { relaxed: ['season', 'budget', 'interests'], f: { interests: [], budget: '', season: '' } },
  ]
  for (const { relaxed, f } of attempts) {
    const found = cities.filter((c) => interestsOk(c, f.interests) && budgetOk(c, f.budget) && seasonOk(c, f.season))
    if (found.length) return { cities: found, relaxed: relaxed.filter((r) => (r === 'interests' ? interests.length : r === 'budget' ? budget : season)) }
  }
  return { cities: [], relaxed: [] }
}

// Random pick, avoiding the previous one when there's a choice.
export function pickRandom(list, previousId, random = Math.random) {
  const pool = list.length > 1 ? list.filter((c) => c.id !== previousId) : list
  return pool[Math.floor(random() * pool.length)] || null
}

export function explainSurprise(city, { interests = [], budget = '', season = '' }) {
  const parts = []
  const known = interests.filter((id) => id !== 'beaches' && interestMatch(city, id) === 'strong')
  if (known.length) parts.push(`it's known for ${list(known.map(lower))}`)
  if (interests.includes('beaches') && city.beach) parts.push('there are beaches close by')
  const level = COST_LEVELS[city.costLevel]
  if (budget && level) parts.push(`day-to-day costs are in the ${level.label} band`)
  if (season) {
    const months = seasonMonths(season).filter((m) => city.bestMonths.includes(m))
    const special = (city.seasons.special || []).filter((s) => s.months.some((m) => seasonMonths(season).includes(m)))
    if (months.length) parts.push(`${monthRange(months)} is a good weather window there`)
    if (special.length) parts.push(`${special.map((s) => s.label).join(' and ')} happens in ${SEASONS.find((s) => s.id === season).label.toLowerCase()}`)
  }
  if (city.hiddenGem) parts.push("it's a hidden gem, so expect fewer crowds")
  return parts.length ? `Why it fits: ${list(parts)}.` : city.description
}
