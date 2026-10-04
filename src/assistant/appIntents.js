// Rule-based reading of copilot requests. Works with no AI key, and is the fallback when the AI is
// unavailable. It recognises clear phrasings only; the output is a raw action for validateAppAction.
// `ctx`: { handle (open trip or null), pageCityId, memory: { lastList, anchorCity, draft }, today }
import { cityById } from '../data/cities.js'
import { countries } from '../data/countries.js'
import { citiesIn, dayIn, parseIntent } from '../planner/assistant/intents.js'
import { fold, resolvePlace } from './appActions.js'

const INTEREST_WORDS = [
  ['food', /\b(food|foodie|eat|eating|restaurants?|cuisine|culinary|markets?|dinner|lunch|brunch|cafes?|coffee)\b/],
  ['nightlife', /\b(nightlife|night life|bars?|clubs?|clubbing|party|partying|drinks?|pubs?)\b/],
  ['museums', /\b(museums?|galler(y|ies)|art)\b/],
  ['history', /\b(history|historic|historical|castles?|ruins|ancient)\b/],
  ['beaches', /\b(beach(es)?|seaside|coast|coastal|swim(ming)?)\b/],
  ['nature', /\b(nature|outdoors?|outdoor|hik(e|es|ing)|parks?|gardens?|mountains?|lakes?|views?|viewpoints?)\b/],
  ['architecture', /\b(architecture|buildings|cathedrals?|churches|palaces?)\b/],
  ['shopping', /\b(shopping|shops?|boutiques?|vintage)\b/],
  ['culture', /\b(local culture|culture|cultural)\b/],
]
const CATEGORY_OF = { food: 'food', nightlife: 'nightlife', museums: 'museums', history: 'history', nature: 'outdoors', beaches: 'outdoors', architecture: 'history', shopping: 'shopping', culture: 'food' }
const HELP_WORDS = [
  ['share', /\bshare|sharing\b/],
  ['accounts', /\b(account|sign ?in|log ?in|login|sign up|sync)\b/],
  ['print', /\b(print|pdf)\b/],
  ['offline', /\b(offline|install)\b/],
  ['dark_mode', /\b(dark|light) (mode|theme)|\btheme\b/],
  ['compare', /\bcompar/],
  ['quiz', /\bquiz\b/],
  ['budget', /\bbudget\b/],
  ['itinerary', /\b(itinerary|days?|schedule|timeline|dates?)\b/],
  ['weather', /\b(weather|forecast)\b/],
  ['gems', /\b(hidden gems?|gems?)\b/],
  ['save_places', /\b(save|saving|heart|favou?rites?)\b/],
  ['build', /\b(build|builder|generate|plan (a|my) trip)\b/],
]
const PAGE_WORDS = [
  ['compare', /\bcompare (page|tool)\b|^(open )?compare$/],
  ['quiz', /\bquiz\b/],
  ['build', /\b(trip )?builder\b|\bbuild page\b/],
  ['trip', /\b(my|our) trip\b/],
  ['explore', /\bthe map\b|\bexplore\b/],
  ['home', /\b(home ?page|start page)\b/],
]
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, a: 1 }
const LESS_TOURISTY = /less touristy|less crowded|hidden gems?|off the beaten|fewer tourists|not (so |too )?touristy|underrated|quieter|quiet|lesser[- ]known/

const blank = { city: '', cities: [], country: '', countries: [], place: '', page: 'none', interests: [], category: 'none', hiddenGems: false, month: null, tripDays: null, startDate: '', pace: 'none', budget: null, currency: 'none', travellers: null, startCity: '', targetCity: '', day: null, nights: null, delta: null, amount: null, question: 'none', criterion: 'none', topic: 'none', keepCities: [], keepCountries: [], maxExtraTravelMinutes: null, reply: '' }
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

// Interests mentioned, minus ones the text rules out ("she hates museums but I love history" → history).
// A clause that says no to something before naming it drops it.
const DISLIKE = /\b(hates?|hated|dislikes?|can'?t stand|(does|do|did)n'?t (like|love|enjoy|want|care for)|not (into|a fan of|keen on|big on|interested in)|isn'?t into|bored (by|of)|sick of|tired of|avoid|skip|no more|without|no)\b/
const interestsIn = (t) => {
  const clauses = t.split(/\bbut\b|\bwhile\b|\bwhereas\b|\bthough\b|[,;.!?]/)
  const ruledOut = new Set()
  for (const c of clauses) {
    const no = c.search(DISLIKE)
    if (no < 0) continue
    for (const [id, re] of INTEREST_WORDS) {
      const at = c.search(re)
      if (at > no) ruledOut.add(id)
    }
  }
  return INTEREST_WORDS.filter(([id, re]) => re.test(t) && !ruledOut.has(id)).map(([id]) => id)
}
export const monthIn = (t) => {
  const i = MONTHS.findIndex((m) => new RegExp(`\\b(${m}|${m.slice(0, 3)})\\b`).test(t) && !(m === 'may' && /\bmay (i|we|be)\b/.test(t)))
  return i >= 0 ? i + 1 : null
}

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

// A trip day from "day 3", a weekday, "today", "tomorrow" or "my next day".
export function tripDayIn(t, { handle, today }) {
  if (!handle) return null
  const days = handle.days
  const byDate = (iso) => days.find((d) => d.date === iso)?.number ?? null
  if (/\btoday\b/.test(t)) return today ? byDate(today) ?? -1 : -1
  if (/\btomorrow\b/.test(t) && today) {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() + 1)
    return byDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) ?? -1
  }
  if (/\b(next|upcoming) day\b|\bmy next day\b/.test(t)) {
    const ahead = days.filter((d) => !today || !d.date || d.date >= today)
    return (ahead.find((d) => !d.items.some((i) => i.placeId)) || ahead[0] || days[0])?.number ?? null
  }
  const n = dayIn(t, days)
  return n === -1 ? -1 : n
}

const OLD_TO_NEW = {
  replace_city: (r) => act('replace_city', { targetCity: r.targetCity, city: r.city, hiddenGems: r.lessTouristy, criterion: r.cheaper ? 'cheapest' : 'none' }),
  add_city: (r) => act('add_city', { city: r.city, interests: r.interest !== 'none' ? [r.interest] : [] }),
  remove_city: (r) => act('remove_city', { targetCity: r.targetCity }),
  change_nights: (r) => act('change_nights', { targetCity: r.targetCity, delta: r.delta, nights: r.nights }),
  more_interest: (r) => act('more_interest', { interests: [r.interest] }),
  answer: (r) => act('trip_question', { question: r.question === 'pace' ? 'rushed' : r.question, day: r.day, targetCity: r.targetCity }),
}

export function parseAppIntent(text, ctx = {}) {
  const { handle = null, pageCityId = null, memory = {}, today = '' } = ctx
  const t = fold(text).replace(/[’']/g, "'")
  const cityIds = citiesIn(text)
  const codes = countriesIn(text)
  const interests = interestsIn(t)
  const gems = LESS_TOURISTY.test(t)
  const month = monthIn(t)
  const city = cityIds[0] || ''
  const name = (id) => cityById[id]?.name || ''
  const tripIds = handle ? handle.plan.stops.map((s) => s.cityId) : []
  const inTrip = cityIds.filter((id) => tripIds.includes(id))
  const notInTrip = cityIds.filter((id) => !tripIds.includes(id))
  const day = tripDayIn(t, { handle, today })
  const dayField = day === -1 ? 999 : day

  // How-to questions about the app.
  if (/\b(what can you do|what do you do|how does (this|eurowander) work|who are you)\b/.test(t) || /^help\b/.test(t)) return act('help', { topic: 'general' })
  if (/\b(how (do|can|should) (i|we)|how to|where (do|can) (i|we) (find|see)|is there a way to)\b/.test(t) && !/\b(get|travel|go) (to|from|between)\b/.test(t) && !cityIds.length) {
    const hit = HELP_WORDS.find(([, re]) => re.test(t))
    if (hit) return act('help', { topic: hit[0] })
  }

  // In Travel Mode, short in-the-moment requests mean today, where they are.
  if (ctx.travel && handle) {
    const todayN = tripDayIn('today', { handle, today })
    const n = day != null && day !== -1 ? day : todayN
    if (n != null && n !== -1 && !cityIds.length) {
      if (/\b(tired|exhausted|knackered|worn out|take it easy|slow down|easier|lighter|less busy|too much)\b/.test(t) && !/\b(tomorrow)\b/.test(t)) return act('lighten_day', { day: n })
      if (/\b(rain|raining|rainy|wet|storm)\b/.test(t) && !/\bwill it\b/.test(t)) return act('rain_plan', { day: n })
      if (/\b(lunch|dinner|breakfast|eat|food|hungry|restaurant|coffee|cafe|drinks?|bar)\b/.test(t) && /\b(find|where|near|nearby|close|around|somewhere|hungry|should)\b/.test(t) && !/\b(move|skip)\b/.test(t)) {
        return act('places_near', { category: /\b(drinks?|bar)\b/.test(t) ? 'nightlife' : 'food', day: n })
      }
      if (/\b(near me|nearby|near here|around here|close by|what'?s near)\b/.test(t)) return act('places_near', { category: 'none', day: n })
    }
  }

  // A new trip, or an answer to the question the last reply asked about one.
  const days = tripLengthIn(t)
  const build = /\b(plan|build|make|create|generate|design)\b.*\b(trip|itinerary|route|holiday|vacation|getaway|europe)\b|\bplan me\b|\bjust build it\b/.test(t) && !/\b(my|our|this) (trip|itinerary|route)\b/.test(t) && !/\bplan (day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|my next day)\b/.test(t)
  const question = /\?|\b(where|what|which|how|why|who|is|are|can|should)\b/.test(t)
  const command = /\b(show|find|add|remove|drop|make|move|replace|swap|near|open|compare|save|tell|give)\b/.test(t)
  const answersDraft = memory.draft && !question && !command && (days || month || interests.length || codes.length || cityIds.length || /\bjust build it\b/.test(t)) && t.split(/\s+/).length <= 12
  if (build || answersDraft || (days && (codes.length || cityIds.length) && /\b(in|through|across|around|to)\b/.test(t) && !/\b(add|another|extra|more|fewer|less)\b/.test(t))) {
    const from = /\b(from|starting (in|from)|start in)\s+([a-zÀ-ɏ .'-]+)/.exec(t)
    const startCity = from ? citiesIn(from[3])[0] || '' : ''
    const pace = /\b(relax(ed|ing)?|slow)\b/.test(t) ? 'relaxed' : /\b(fast|packed|whirlwind|quick)\b/.test(t) ? 'fast' : 'none'
    const budget = /(?:[$€£]\s?(\d[\d,]{2,})|(\d[\d,]{2,})\s?(?:\$|€|£|eur|euros?|usd|dollars?|gbp|pounds?))/.exec(t)
    const people = /\b(\d|two|three|four|five|six)\s+(people|of us|travell?ers|adults|friends)\b/.exec(t)
    return act('build_trip', {
      tripDays: days,
      month,
      countries: codes,
      cities: cityIds.filter((c) => c !== startCity).map(name),
      startCity: name(startCity),
      interests,
      pace,
      budget: budget ? Number((budget[1] || budget[2]).replace(/,/g, '')) : null,
      currency: !budget ? 'none' : /€|eur/.test(budget[0]) ? 'EUR' : /£|gbp|pound/.test(budget[0]) ? 'GBP' : 'USD',
      travellers: people ? Number(people[1]) || NUMBER_WORDS[people[1]] || null : /\b(couple|two of us|my partner|my (wife|husband|girlfriend|boyfriend))\b/.test(t) ? 2 : /\b(solo|alone|by myself)\b/.test(t) ? 1 : null,
      hiddenGems: gems,
      country: '',
    })
  }

  if (/\bsurprise me\b|\bsurprise\b.*\b(city|trip|destination)\b|\brandom (city|place)\b/.test(t)) return act('surprise', { interests, month, country: codes[0] || '', hiddenGems: gems })

  // "Which is cheapest?" about the cities just shown.
  if ((memory.lastList || []).some((id) => cityById[id]) && /\b(which|what)( one| city)?( of (them|those|these))?( is| would be|'s)?( the)? (cheapest|least expensive|most affordable|most expensive|priciest|quietest|least touristy|least crowded|closest|nearest|best)\b|\b(the )?(cheapest|quietest|closest) (one|of them)\b/.test(t)) {
    const criterion = /cheap|least expensive|affordable/.test(t) ? 'cheapest' : /most expensive|priciest/.test(t) ? 'most_expensive' : /quiet|touristy|crowd/.test(t) ? 'least_touristy' : /close|near/.test(t) ? 'closest' : /weather/.test(t) ? 'best_weather' : 'best_for_interest'
    return act('pick_from_list', { criterion, interests })
  }

  // Two or more cities side by side.
  if (cityIds.length >= 2 && (/\b(or|vs\.?|versus|compare|comparison|better)\b/.test(t)) && !/\b(route|via|then)\b/.test(t) && !(handle && /\b(replace|swap|instead)\b/.test(t))) return act('compare_cities', { cities: cityIds.map(name) })
  if (/\bcompare (them|those|these)\b/.test(t)) return act('compare_cities')

  // Trains and routes.
  if (city && /\b(from)\b/.test(t) && /\b(by train|trains?|rail|day trips?)\b/.test(t) && cityIds.length === 1) return act('trains_from', { city: name(city) })
  if (cityIds.length >= 2 && /\b(route|via|then|train|by rail|->|→|to)\b/.test(t) && !(handle && /\b(add|replace|swap|remove)\b/.test(t))) {
    // "Paris to Amsterdam via Brussels": the via-cities go before the destination.
    const via = t.indexOf(' via ')
    let order = cityIds
    if (via > 0) {
      const before = citiesIn(t.slice(0, via))
      const after = citiesIn(t.slice(via))
      order = before.length >= 2 ? [...before.slice(0, -1), ...after, before[before.length - 1]] : [...before, ...after]
    }
    return act('route', { cities: order.map(name) })
  }
  if (/\b(after|next)\b/.test(t) && /\b(where|what|which)\b/.test(t) && /\b(go|head|visit|city|stop)\b/.test(t)) return act('next_after', { city: name(city || tripIds[tripIds.length - 1] || memory.anchorCity || ''), hiddenGems: gems, interests })

  // Quieter alternatives.
  if ((gems || /\b(alternative|cheaper)\b/.test(t)) && city && /\b(to|than|instead of|near|like|around|alternative)\b/.test(t) && (!tripIds.includes(city) || /\b(feels like|similar to|somewhere like)\b/.test(t))) return act('alternatives_to', { city: name(city), hiddenGems: gems, criterion: /\bcheaper\b/.test(t) ? 'cheapest' : 'none' })
  // "Give me somewhere less touristy" right after the chat showed some cities: quieter places near them.
  if (gems && !city && !codes.length && !interests.length && memory.anchorCity && (memory.lastList || []).some((id) => cityById[id]) && /\b(somewhere|something|place|city|give me|show me)\b/.test(t)) return act('alternatives_to', { city: name(memory.anchorCity) })

  // "Add the second one": a city from the list the chat just showed.
  const nth = /\badd (?:the )?(first|second|third|fourth|last|1st|2nd|3rd|4th|number \d)(?: one| city| option)?\b/.exec(t)
  if (nth && !cityIds.length) {
    const shown = (memory.lastList || []).filter((id) => cityById[id])
    const i = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, last: shown.length - 1 }[nth[1]] ?? Number(nth[1].slice(-1)) - 1
    if (shown[i]) return act('add_city', { city: name(shown[i]) })
  }

  // ----- The open trip -----
  if (handle) {
    // Cheaper or faster, with limits: "but keep Italy", "no more than an hour of extra train".
    const cheapGoal = /\b(cheaper|cut (the )?costs?|save money|lower (the )?cost|less expensive)\b/.test(t) && /\b(my|our|this|the) trip\b|^make (it|this) cheaper\b/.test(t)
    const fastGoal = /\b(reduce|cut|less|shorter|fewer)\b.*\b(train|travel)\b/.test(t)
    const limited = /\b(keep|but|don'?t|do not|without|no more than|at most|max(imum)?|up to)\b/.test(t)
    if ((cheapGoal || fastGoal) && limited) {
      const max = /\b(?:no more than|at most|max(?:imum)?|up to|under|less than)\s+(an?|one|two|three|\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b/.exec(t)
      const n = max ? ({ a: 1, an: 1, one: 1, two: 2, three: 3 }[max[1]] ?? Number(max[1])) : null
      const amount = /(?:[$€£]\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:\$|€|£|euros?|dollars?|pounds?))/.exec(t)
      return act(cheapGoal ? 'make_cheaper' : 'reduce_travel', {
        keepCities: inTrip.map(name),
        keepCountries: codes.filter((c) => tripIds.some((id) => cityById[id].country === c)),
        maxExtraTravelMinutes: n == null ? (/\bno (more|extra) (train|travel)\b/.test(t) ? 0 : null) : Math.round(/^h/.test(max[2]) ? n * 60 : n),
        amount: cheapGoal && amount ? Number((amount[1] || amount[2]).replace(/,/g, '')) : null,
      })
    }
    if (/\b(too )?(rushed|hectic|fast[- ]paced)\b|\btoo much\b.*\btrip\b|\b(what'?s|how is) (the |my )?pace\b/.test(t)) return act('trip_question', { question: 'rushed' })
    if (/\bwhat (should|do|can) (i|we) do next\b|\bwhat next\b|\bnext steps?\b/.test(t)) return act('trip_question', { question: 'next_step' })
    if (/\bcheck (my |the )?route\b|\bis (my|the) route ok\b/.test(t)) return act('trip_question', { question: 'route_check' })
    if (/\b(which|what) day\b.*\b(best|good|driest)\b/.test(t)) return act('trip_question', { question: 'best_outdoor_day' })
    if (/\bcan (i|we) afford\b|\b(within|fit|over|under) (my |our |the )?budget\b/.test(t)) return act('trip_question', { question: 'budget_fit' })
    if (/\bmost expensive (city|stop|place)\b|\bspending (the )?most\b|\bbiggest (cost|expense)\b/.test(t)) return act('trip_question', { question: 'most_expensive' })
    if (/\b(budget|how much)\b.*\b(summary|breakdown|cost|total)\b|\bhow much (will|does|is) (it|this|my trip|the trip)\b/.test(t)) return act('trip_question', { question: 'budget_summary' })
    const amount = /(?:[$€£]\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:\$|€|£|euros?|dollars?|pounds?))\s*(cheaper|less)/.exec(t)
    if (amount) return act('make_cheaper', { amount: Number((amount[1] || amount[2]).replace(/,/g, '')) })
    if (/\bcheaper alternatives\b/.test(t)) return act('make_cheaper')

    // Days.
    if (/\bmove\b.*\boutdoor\b.*\b(rain|wet)/.test(t) || /\b(rain|rainy|wet)\b.*\b(move|swap|what (should|do))\b/.test(t)) return act('rain_plan', { day: dayField })
    if (/^\s*plan\b/.test(t) && dayField) return act('plan_day', { day: dayField })
    if (/\boptimi[sz]e\b.*\b(today|tomorrow|day \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t) && dayField) return act('optimize_day', { day: dayField })
    const move = /\bmove (?:the )?(.+?) to (day \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|the rainy day)\b/.exec(t)
    if (move) {
      const what = move[1]
      if (/\b(museums?|galleries)\b/.test(what)) return act('move_category_to_day', { category: 'museums', day: dayField })
      if (!/\boutdoor\b/.test(what) && dayField) return act('move_place_to_day', { place: what, day: dayField })
    }
    const after = /\b(after|near|close to|around|next to)\s+(?:the\s+)?([a-zÀ-ɏ' -]{3,40}?)(?:\?|$|\s+on\b|\s+in\b)/.exec(t)
    if (/\b(near|close to|around)\b.*\b(my )?(saved|planned|plans|places|activities|itinerary)\b/.test(t)) {
      return act('places_near', { category: CATEGORY_OF[interests[0]] || (/\blunch|dinner|eat\b/.test(t) ? 'food' : 'none'), day: /\b(saved)\b/.test(t) ? null : dayField })
    }
    if (after && /\b(add|something|find|lunch|dinner|coffee|what to do)\b/.test(t) && !cityIds.length) return act('places_near', { place: after[2], category: /\blunch|dinner|eat|coffee\b/.test(t) ? 'food' : CATEGORY_OF[interests[0]] || 'none' })
    if (/\b(remove|drop|cut|skip) (a|one) (city|stop)\b/.test(t)) return act('remove_city')
    if (/\badd (a |one )?(hidden gem|gem|quieter (city|place))\b/.test(t)) return act('more_gems')
    if (/\bwhat'?s the weather\b|\bweather (during|for|on)\b|\bgoing to rain\b|\bwill it rain\b|\bforecast\b/.test(t)) return act('trip_question', { question: 'weather', day: dayField })
    if (notInTrip[0] && !inTrip.length && /\b(add|include|also visit|squeeze in|fit in)\b/.test(t)) return act('add_city', { city: name(notInTrip[0]) })
    if (/\boptimi[sz]e (my |the )?(route|order)\b|\bbest order\b/.test(t)) return act('optimize_route')
    // The planner's older reader is for short commands; long, nuanced messages are left to the AI.
    const old = t.split(/\s+/).length <= 14 ? parseIntent(text, { plan: handle.plan, timeline: handle.days }) : { action: 'unknown' }
    if (old.action !== 'unknown') {
      const map = OLD_TO_NEW[old.action]
      const r = map ? map(old) : act(old.action, { day: old.day })
      // "Make Wednesday less busy": the old reader knows weekdays too, via the day plans.
      if (r.day == null && old.day != null) r.day = old.day
      if (r.targetCity) r.targetCity = name(r.targetCity)
      if (r.city) r.city = name(r.city)
      return r
    }
  }

  // A change to a trip, with no trip open: let the check explain what's needed.
  if (!handle) {
    const old = parseIntent(text, { plan: { stops: [], prefs: {} }, timeline: [] })
    if (old.action !== 'unknown' && !['add_city', 'answer'].includes(old.action) && /\b(my|our|the|this) trip\b|\b(cheaper|relaxed|train time|less busy|reduce|optimi[sz]e)\b/.test(t)) return act(old.action === 'optimize_route' ? 'optimize_route' : old.action in OLD_TO_NEW ? OLD_TO_NEW[old.action](old).action : old.action)
    if (city && /\b(remove|drop|cut|skip|replace|swap)\b/.test(t)) return act(/\b(replace|swap)\b/.test(t) ? 'replace_city' : 'remove_city', { targetCity: name(city) })
    if (/\b(is|am) (my|our) trip\b|\bplan (my next day|today|tomorrow|day \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bcan (i|we) afford\b/.test(t)) return act('trip_question')
  }

  // Saving a place.
  const save = /\b(?:save|bookmark|favou?rite|heart)\s+(?:the\s+)?(.+?)(?:\s+(?:to|in|on)\s+(?:my|our|the)\s+(?:trip|list|board))?[.!?]*$/.exec(t)
  if (save && !/\bmoney\b/.test(t)) {
    const rest = save[1].replace(/\s+in\s+[a-zÀ-ɏ .'-]+$/, '')
    return act('save_place', { place: rest, city: /\bin\s/.test(save[1]) ? name(city) : '' })
  }

  // Adding a city to My trip (no trip open yet).
  if (city && /\b(add|put|include)\b/.test(t)) return act('add_city', { city: name(city) })
  if (/\b(my|our) trip\b/.test(t) && /\b(what|what's|whats|how many|summar|status|so far|in it|show me what)\b/.test(t)) return act('my_trip')

  // Maps and pages.
  if (/\b(show|see|find)\b.*\bon (the )?map\b/.test(t)) return act('show_on_map', { city: name(city), place: city ? '' : t.replace(/\b(show|see|find|me|on|the|map|it|this|that)\b/g, '').trim() })
  // "Show me the Louvre": one of Eurowander's places, as a card.
  const showPlace = /^(?:show|find)(?: me)?\s+(?:the\s+)?(.+?)[.!?]*$/.exec(t)
  if (showPlace) {
    const p = resolvePlace(showPlace[1])
    if (p && fold(p.name).replace(/^the\s+/, '').includes(fold(showPlace[1]))) return act('save_place', { place: showPlace[1] })
  }
  if (/\b(open|go to|show( me)?|take me to|bring up|start|launch|let'?s do)\b/.test(t) || /^(the )?(quiz|compare|map|builder)\b/.test(t)) {
    const page = PAGE_WORDS.find(([, re]) => re.test(t))
    if (page && !(page[0] === 'explore' && city)) return act('open_page', { page: page[0] })
  }

  // Places in a city.
  const placeWords = /\b(things to do|what to (do|see)|where (to|should (i|we)|can (i|we)) (eat|go out|drink|stay|visit)|must[- ]see|best (places|spots)|recommend|suggest|ideas|what's good|top)\b/
  const cityless = !city && interests[0] === 'beaches'
  if (!cityless && (city || pageCityId) && (interests.length || placeWords.test(t)) && !/\b(cities|city|towns?|where should (i|we) go)\b/.test(t) && !codes.length) {
    return act('suggest_places', { city: name(city || pageCityId), category: CATEGORY_OF[interests[0]] || 'none', hiddenGems: gems })
  }

  // About one city.
  if (city && /\b(tell me|about|worth|how long|how many days|when|best time|what'?s .* like|info|information|expensive|cheap|cost|pricey|safe)\b/.test(t)) return act('city_info', { city: name(city) })

  // Cities to visit.
  if (!city && (interests.length || gems || month || /\b(cities|city|towns?|destinations?|where (should|could|can) (i|we) go|where to go|somewhere)\b/.test(t))) {
    return act('suggest_cities', { interests, month, country: codes[0] ? countries.find((c) => c.code === codes[0]).name : '', hiddenGems: gems })
  }
  if (city) return act('open_city', { city: name(city) })
  if (codes.length) return act('open_country', { country: countries.find((c) => c.code === codes[0]).name })
  return act('unknown')
}

export const WELCOME_PROMPTS = [
  { label: '🗺️ Plan a trip', prompt: 'Plan a trip' },
  { label: '💎 Find hidden gems', prompt: 'Show me less touristy cities' },
  { label: '🚆 Build a train route', prompt: 'Train route from Paris to Amsterdam via Brussels' },
  { label: '💰 Help with my budget', prompt: 'Can I afford this trip?' },
  { label: '📅 Plan my days', prompt: 'Plan my next day' },
  { label: '🎲 Surprise me', prompt: 'Surprise me' },
]
// Travel Mode: what people ask while they're out and about.
export const TRAVEL_PROMPTS = [
  { label: 'What should we do next?', prompt: 'What should we do next?' },
  { label: 'Find lunch nearby', prompt: 'Find lunch nearby' },
  { label: 'I’m tired', prompt: 'I’m tired. Make the rest of today easier.' },
  { label: 'It’s raining', prompt: 'It’s raining. What should I move?' },
  { label: 'What should we do tonight?', prompt: 'What should we do tonight?' },
  { label: 'Do I have time before my train?', prompt: 'Do I have enough time before my train?' },
]
export const TRIP_PROMPTS = [
  { label: 'Make my trip cheaper', prompt: 'Make my trip cheaper' },
  { label: 'Reduce travel time', prompt: 'Reduce my train time' },
  { label: 'Plan my next day', prompt: 'Plan my next day' },
  { label: 'Add a hidden gem', prompt: 'Add a hidden gem' },
  { label: 'Check my route', prompt: 'Check my route' },
  { label: 'What should I do next?', prompt: 'What should I do next?' },
]
