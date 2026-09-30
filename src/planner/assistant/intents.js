// Rule-based reading of assistant requests. Works with no AI key, and is the fallback when the AI is
// unavailable. It only recognises clear phrasings; anything else comes back as 'unknown' with examples.
// The output is a raw action, checked by validateAction like the AI's.
import { cities } from '../../data/cities.js'

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const NUMBER_WORDS = { a: 1, an: 1, one: 1, another: 1, two: 2, three: 3, four: 4, five: 5 }
const INTEREST_WORDS = [
  ['nightlife', /nightlife|night life|bars?|clubs?|party|going out/],
  ['nature', /nature|outdoors?|hiking|parks?|green/],
  ['food', /food|restaurants?|eating|culinary|markets?/],
  ['museums', /museums?|galler(y|ies)|art/],
  ['history', /history|historic|castles?|ruins/],
  ['beaches', /beach(es)?|seaside|coast/],
  ['shopping', /shopping|shops/],
  ['architecture', /architecture|buildings/],
  ['culture', /local culture|culture/],
]

// Cities mentioned in the text, in the order they appear.
export function citiesIn(text) {
  const t = fold(text)
  return cities
    .map((c) => ({ id: c.id, at: t.search(new RegExp(`\\b${fold(c.name)}\\b`)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.id)
}

// "day 3" → 3; "tuesday" → the first trip day on a Tuesday. `timeline` is [{ number, date }].
export function dayIn(text, timeline = []) {
  const t = fold(text)
  const n = /\bday\s*(\d{1,2})\b/.exec(t)
  if (n) return Number(n[1])
  const w = WEEKDAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(t))
  if (w >= 0) {
    const hit = timeline.find((d) => d.date && new Date(`${d.date}T00:00:00`).getDay() === w)
    return hit ? hit.number : -1
  }
  if (/\b(first|1st) day\b/.test(t)) return 1
  if (/\blast day\b/.test(t)) return timeline.length || null
  return null
}

const countIn = (t) => {
  const m = /\b(\d+|a|an|one|another|two|three|four|five)\s+(more\s+|extra\s+|fewer\s+|less\s+)?(day|night)s?\b/.exec(t)
  if (!m) return 1
  return Number(m[1]) || NUMBER_WORDS[m[1]] || 1
}

const blank = { targetCity: '', city: '', day: null, nights: null, delta: null, interest: 'none', question: 'none', lessTouristy: false, cheaper: false, maxAdditionalTravelMinutes: null, reply: '' }
const act = (action, extra = {}) => ({ ...blank, action, ...extra })

// Returns a raw action for validateAction.
export function parseIntent(text, { plan, timeline = [] }) {
  const t = fold(text)
  const inTrip = citiesIn(text).filter((id) => plan.stops.some((s) => s.cityId === id))
  const notInTrip = citiesIn(text).filter((id) => !plan.stops.some((s) => s.cityId === id))
  const target = inTrip[0] || ''
  const day = dayIn(text, timeline)
  const dayField = day === -1 ? 999 : day

  // Questions first.
  if (/\b(which|what)\b.*\bbusiest\b|\bbusiest day\b/.test(t)) return act('answer', { question: 'busiest_day' })
  if (/(where|what|which).*(spend|spending|money|cost).*most|most (money|expensive)|biggest (cost|expense)/.test(t)) return act('answer', { question: 'most_expensive' })
  if (/(within|fit|over|under).*budget|\bbudget\b.*\?|can we afford/.test(t) && !/cheaper|less|reduce|cut/.test(t)) return act('answer', { question: 'budget_fit' })
  if (/how (long|much time|many hours).*(train|travel|journey|transit)|total travel time/.test(t)) return act('answer', { question: 'travel_time' })
  if (/\bwhy\b/.test(t) && target) return act('answer', { question: 'why_city', targetCity: target })
  if (/(what|how).*(pace|rushed|too much)/.test(t)) return act('answer', { question: 'pace' })

  // Rain.
  if (/\b(rain|rains|raining|rainy|wet|storm)\b/.test(t)) {
    if (/museum/.test(t) && dayField) return act('move_category_to_day', { day: dayField })
    if (/weather|forecast/.test(t) && !/what should|what do|if it/.test(t)) return act('answer', { question: 'weather', day: dayField })
    return act('rain_plan', { day: dayField })
  }
  if (/\b(move|put|shift)\b.*museums?/.test(t) && dayField) return act('move_category_to_day', { day: dayField })
  if (/\bweather|forecast\b/.test(t)) return act('answer', { question: 'weather', day: dayField })

  // A single day.
  if (dayField && /(less busy|lighter|quieter|more relaxed|easier|too (busy|much)|fewer (things|activities))/.test(t)) return act('lighten_day', { day: dayField })

  // Nights in a city.
  if (target && /\b(add|another|extra|one more|more|longer|stay)\b.*\b(day|night)s?\b|\b(day|night)s?\b.*\b(longer|more)\b/.test(t) && !/\bfewer|less\b/.test(t)) {
    return act('change_nights', { targetCity: target, delta: countIn(t) })
  }
  if (target && /\b(fewer|less|one less|shorter|cut)\b.*\b(day|night)s?\b|\b(day|night)s?\b.*\b(fewer|less)\b/.test(t)) {
    return act('change_nights', { targetCity: target, delta: -countIn(t) })
  }

  // Replacing, removing, adding cities.
  const lessTouristy = /less touristy|less crowded|quieter|hidden gem|off the beaten|fewer tourists|not so touristy/.test(t)
  if (target && /\b(replace|swap|instead of|change|alternative to|something else than|other than)\b/.test(t)) {
    return act('replace_city', { targetCity: target, city: notInTrip[0] || '', lessTouristy, cheaper: /cheaper|less expensive/.test(t) })
  }
  if (target && /\b(remove|drop|skip|cut|delete|get rid of|without)\b/.test(t)) return act('remove_city', { targetCity: target })
  if (lessTouristy) return target ? act('replace_city', { targetCity: target, lessTouristy: true }) : act('more_gems')
  if (notInTrip[0] && /\b(add|include|visit|see|go to|stop in|also)\b/.test(t)) return act('add_city', { city: notInTrip[0] })

  // Whole-trip changes.
  if (/(spend less|cheaper|save money|less expensive|cut costs?|lower (the )?cost|over budget|too expensive|budget)/.test(t)) return act('make_cheaper')
  if (/(reduce|less|fewer|cut|shorter|minimi[sz]e).*(train|travel|transit|journey|time on)|(train|travel) time.*(less|shorter|reduce)/.test(t)) return act('reduce_travel')
  if (/(optimi[sz]e|reorder|better order|backtrack|re-?order)/.test(t)) return act('optimize_route')
  if (/(relax|slower|less rushed|fewer cities|more time in each|slow down|too rushed)/.test(t)) return act('make_relaxed')
  if (/\b(more|add|extra|want)\b/.test(t)) {
    const hit = INTEREST_WORDS.find(([, re]) => re.test(t))
    if (hit) return act('more_interest', { interest: hit[0] })
    if (/\b(city|stop|destination|place)\b/.test(t)) return act('add_city')
  }
  if (/hidden gems?|\bgems\b/.test(t)) return act('more_gems')
  return act('unknown')
}

export const EXAMPLES = [
  'Make day 3 less busy',
  'Replace Amsterdam with somewhere less touristy',
  'Add another day in Paris',
  'Can we spend less?',
  'Reduce train time',
  'What should we do if it rains Tuesday?',
  'Which day is busiest?',
  'Where are we spending the most money?',
]
