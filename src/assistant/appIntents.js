// Rule-based reading of site-wide assistant requests. Works with no AI key, and is the fallback when the
// AI is unavailable. It only recognises clear phrasings; the output is a raw action for validateAppAction.
import { countries } from '../data/countries.js'
import { citiesIn } from '../planner/assistant/intents.js'
import { fold } from './appActions.js'

const INTEREST_WORDS = [
  ['food', /\b(food|foodie|eat|eating|restaurants?|cuisine|culinary|markets?|dinner|lunch|brunch|cafes?|coffee)\b/],
  ['nightlife', /\b(nightlife|night life|bars?|clubs?|clubbing|party|partying|drinks?|pubs?)\b/],
  ['museums', /\b(museums?|galler(y|ies)|art)\b/],
  ['history', /\b(history|historic|historical|castles?|ruins|ancient)\b/],
  ['beaches', /\b(beach(es)?|seaside|coast|coastal|swim(ming)?)\b/],
  ['nature', /\b(nature|outdoors?|hik(e|es|ing)|parks?|gardens?|mountains?|views?|viewpoints?)\b/],
  ['architecture', /\b(architecture|buildings|cathedrals?|churches|palaces?)\b/],
  ['shopping', /\b(shopping|shops?|boutiques?|vintage)\b/],
  ['culture', /\b(local culture|culture|cultural|neighbou?rhoods?)\b/],
]
const HELP_WORDS = [
  ['share', /\bshare|sharing|link\b/],
  ['accounts', /\b(account|sign ?in|log ?in|login|sign up|sync)\b/],
  ['print', /\b(print|pdf)\b/],
  ['compare', /\bcompar/],
  ['quiz', /\bquiz\b/],
  ['surprise', /\bsurprise\b/],
  ['budget', /\b(budget|costs?|expenses?|money)\b/],
  ['itinerary', /\b(itinerary|days?|schedule|timeline|dates?)\b/],
  ['offline', /\b(offline|install|app)\b/],
  ['weather', /\b(weather|forecast)\b/],
  ['gems', /\b(hidden gems?|gems?)\b/],
  ['dark_mode', /\b(dark|light) (mode|theme)|\btheme\b/],
  ['save_places', /\b(save|saving|heart|favou?rites?)\b/],
  ['build', /\b(build|builder|generate|plan (a|my) trip)\b/],
]
const PAGE_WORDS = [
  ['compare', /\bcompare\b/],
  ['quiz', /\bquiz\b/],
  ['surprise', /\bsurprise me\b/],
  ['build', /\b(trip )?builder\b|\bbuild (my|a) trip\b|\bbuild page\b/],
  ['trip', /\b(my|our) trip\b/],
  ['explore', /\b(the )?map\b|\bexplore\b/],
  ['home', /\b(home ?page|home|start page)\b/],
]
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, a: 1 }

const blank = { city: '', country: '', place: '', page: 'none', interest: 'none', hiddenGems: false, countries: [], cities: [], interests: [], tripDays: null, startDate: '', pace: 'none', budget: null, currency: 'none', travellers: null, startCity: '', topic: 'none', reply: '' }
const act = (action, extra = {}) => ({ ...blank, action, ...extra })

// Countries mentioned in the text (names and aliases), in the order they appear.
export function countriesIn(text) {
  const t = fold(text)
  return countries
    .map((c) => ({ code: c.code, at: Math.min(...[c.name, ...(c.aliases || [])].map((n) => t.search(new RegExp(`\\b${fold(n)}\\b`))).filter((i) => i >= 0), Infinity) }))
    .filter((x) => x.at < Infinity)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.code)
}

const interestsIn = (t) => INTEREST_WORDS.filter(([, re]) => re.test(t)).map(([id]) => id)

// "10 days", "two weeks", "a week", "5 nights" → days.
export function tripLengthIn(t) {
  const m = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|a)[\s-]*(days?|nights?|weeks?)\b/.exec(t)
  if (!m) return null
  const n = Number(m[1]) || NUMBER_WORDS[m[1]]
  if (!n) return null
  if (m[2].startsWith('week')) return n * 7
  if (m[2].startsWith('night')) return n + 1
  return n
}

const LESS_TOURISTY = /less touristy|less crowded|hidden gems?|off the beaten|fewer tourists|not (so |too )?touristy|underrated|quieter/

// `ctx.pageCityId`: the city page the traveller is on.
export function parseAppIntent(text, ctx = {}) {
  const t = fold(text)
  const cityIds = citiesIn(text)
  const codes = countriesIn(text)
  const interests = interestsIn(t)
  const gems = LESS_TOURISTY.test(t)
  const city = cityIds[0] || ''

  // How-to questions about the app.
  if (/\b(what can you do|what do you do|help me\b.*\bapp|how does (this|eurowander) work)\b/.test(t) || /^help\b/.test(t)) return act('help', { topic: 'general' })
  if (/\b(how (do|can|should) (i|we)|how to|where (do|can) (i|we) (find|see)|is there a way to|can i)\b/.test(t) && !/\b(get|travel) (to|from|between)\b/.test(t)) {
    const hit = HELP_WORDS.find(([, re]) => re.test(t))
    if (hit) return act('help', { topic: hit[0] })
  }

  // A whole new trip.
  const days = tripLengthIn(t)
  if (/\b(plan|build|make|create|generate|design)\b.*\b(trip|itinerary|route|holiday|vacation|getaway)\b/.test(t) || (days && (codes.length || cityIds.length) && /\b(in|through|across|around|to)\b/.test(t) && !/\b(add|another|extra|more|fewer|less)\b/.test(t))) {
    const from = /\b(from|starting (in|from)|start in)\s+([a-zÀ-ɏ .'-]+)/.exec(t)
    const startCity = from ? citiesIn(from[3])[0] || '' : ''
    const pace = /\b(relax(ed|ing)?|slow)\b/.test(t) ? 'relaxed' : /\b(fast|packed|whirlwind|quick)\b/.test(t) ? 'fast' : 'none'
    const budget = /(?:[$€£]\s?(\d[\d,]{2,})|(\d[\d,]{2,})\s?(?:\$|€|£|eur|euros?|usd|dollars?|gbp|pounds?))/.exec(t)
    const people = /\b(\d|two|three|four|five|six)\s+(people|of us|travell?ers|adults|friends)\b/.exec(t)
    return act('build_trip', {
      tripDays: days,
      countries: codes,
      cities: cityIds.filter((c) => c !== startCity),
      startCity,
      interests,
      pace,
      budget: budget ? Number((budget[1] || budget[2]).replace(/,/g, '')) : null,
      currency: !budget ? 'none' : /€|eur/.test(budget[0]) ? 'EUR' : /£|gbp|pound/.test(budget[0]) ? 'GBP' : 'USD',
      travellers: people ? Number(people[1]) || NUMBER_WORDS[people[1]] || null : /\b(couple|two of us|my partner|my (wife|husband|girlfriend|boyfriend))\b/.test(t) ? 2 : /\b(solo|alone|by myself)\b/.test(t) ? 1 : null,
      hiddenGems: gems,
    })
  }

  // The saved trip.
  if (/\b(my|our) trip\b/.test(t) && /\b(what|what's|whats|how many|summar|status|so far|in it|show me what)\b/.test(t) && !cityIds.length) return act('my_trip')

  // Saving a place.
  const save = /\b(?:save|bookmark|favou?rite|heart)\s+(?:the\s+)?(.+?)(?:\s+(?:to|in|on)\s+(?:my|our|the)\s+(?:trip|list|board))?[.!?]*$/.exec(t)
  if (save) {
    const rest = save[1].replace(/\s+in\s+[a-zÀ-ɏ .'-]+$/, '')
    return act('save_place', { place: rest, city: /\bin\s/.test(save[1]) ? city : '' })
  }

  // Adding a city to the saved trip.
  if (city && /\b(add|put|include)\b/.test(t)) return act('add_city_to_trip', { city })

  // Opening a page.
  if (/\b(open|go to|show( me)?|take me to|bring up|start|launch|let'?s do)\b/.test(t) || /^(the )?(quiz|compare|surprise me|map|builder)\b/.test(t)) {
    const page = PAGE_WORDS.find(([, re]) => re.test(t))
    if (page && !(page[0] === 'explore' && city)) return act('open_page', { page: page[0] })
  }

  // Places in a city.
  const placeWords = /\b(things to do|what to (do|see)|where (to|should (i|we)|can (i|we)) (eat|go|drink|stay|visit)|must[- ]see|best (places|spots)|recommend|suggest|ideas|what's good|whats good|top)\b/
  // Beaches are about which city, so without a named city they go to city suggestions.
  const cityless = !city && interests[0] === 'beaches'
  if (!cityless && (city || ctx.pageCityId) && (interests.length || placeWords.test(t)) && !/\b(cities|city|towns?|where should (i|we) go)\b/.test(t)) {
    return act('suggest_places', { city: city || ctx.pageCityId, interest: interests[0] || 'none', hiddenGems: gems })
  }

  // Cities to visit.
  if (!city && (interests.length || gems || /\b(cities|city|towns?|destinations?|where (should|could|can) (i|we) go|where to go)\b/.test(t))) {
    if (interests.length || gems || codes.length || /\b(suggest|recommend|best|which|where)\b/.test(t)) return act('suggest_cities', { interest: interests[0] || 'none', country: codes[0] || '', hiddenGems: gems })
  }

  // About one city.
  if (city && /\b(tell me|about|worth|how long|how many days|when|best time|what'?s .* like|info|information|expensive|cheap|cost)\b/.test(t)) return act('city_info', { city })
  if (city) return act('open_city', { city })
  if (codes.length) return act('open_country', { country: codes[0] })
  return act('unknown')
}

export const APP_EXAMPLES = ['Plan 10 days in Italy and Greece for food', 'Where to eat in Lisbon?', 'Less touristy cities in Spain', 'Tell me about Porto', 'Save the Louvre', 'How do I share my trip?']
