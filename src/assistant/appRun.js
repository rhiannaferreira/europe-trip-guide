// Answers to discovery requests (no trip needed), worked out from Eurowander's own city, place, season,
// cost and train data. Nothing here changes anything: buttons carry `effect`s that the panel runs.
//
// Result: { text, blocks: [...], followUps: [{ label, prompt } | { label, effect }], memory?, sources? }
// Blocks (drawn by blocks.jsx):
//   { type: 'cities', items: [{ cityId, why: [labels], train: { from, minutes, source } | null }] }
//   { type: 'places', items: [{ placeId, note }], day }
//   { type: 'route', legs: [{ from, to, minutes, mode, source }], total }
//   { type: 'compare', cities: [ids], rows: [{ label, values }] }
//   { type: 'stats', items: [{ label, value }] }   { type: 'list', items: [text] }   { type: 'build', ... }
// Effects: navigate · tool · map · add_city · save_place · add_to_day · build · ask (send a prompt)
import { cities, cityById, hiddenGemsFor } from '../data/cities.js'
import { COST_LEVELS, perPersonDay } from '../data/costs.js'
import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { placeById, placesInCity } from '../data/places.js'
import { formatDuration, monthNames, monthRange } from '../lib/format.js'
import { gemsNear } from '../planner/alternatives.js'
import { generatePlan } from '../planner/route.js'
import { PACES, builderInterestById, defaultPreferences, normalizePreferences } from '../planner/preferences.js'
import { interestFit, scoreCity } from '../planner/scoring.js'
import { legBetween } from '../planner/transport.js'
import { connectionsFrom, stayText } from '../utils/cityInfo.js'
import { HELP } from './help.js'
import { trainsAnswer } from './liveData.js'

export const cityName = (id) => cityById[id]?.name || id
export const flag = (id) => countryByCode[cityById[id]?.country]?.flag || ''
export const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
export const nav = (to) => ({ type: 'navigate', to })
export const ask = (prompt) => ({ type: 'ask', prompt })
// Same paths as lib/router.jsx (not imported, so this file runs in plain Node for tests).
export const cityPath = (id) => `/city/${id}`
const countryPath = (code) => `/country/${code.toLowerCase()}`
const PAGE_PATHS = { home: '/', explore: '/explore', trip: '/trip', build: '/build' }
const PAGE_NAMES = { home: 'the home page', explore: 'the map', trip: 'My trip', build: 'Build my trip', compare: 'Compare', quiz: 'the quiz' }
const dailyEur = (c) => (COST_LEVELS[c.costLevel] ? perPersonDay(COST_LEVELS[c.costLevel]) : null)
const costWord = (c) => ({ 1: 'budget-friendly', 2: 'moderately priced', 3: 'expensive' })[c.costLevel] || 'unknown cost'

// A journey between two cities: the sample train time when there is one, else a labelled estimate.
export function trainBetween(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return null
  const l = legBetween(fromId, toId)
  return { from: fromId, minutes: l.minutes, mode: l.mode, source: l.source }
}

// Short "why it fits" labels for a city card.
export function whyLabels(city, { interests = [], month = null, hiddenGems = false } = {}) {
  const out = []
  for (const id of interests) if (interestFit(city, id) === 'strong') out.push(builderInterestById[id].label)
  if (month && city.seasons?.bestWeather?.includes(month)) out.push(`Good weather in ${monthNames[month - 1]}`)
  if (month && city.seasons?.lowerCost?.includes(month)) out.push(`Cheaper in ${monthNames[month - 1]}`)
  if (city.trainConnectivity >= 3) out.push('Train-friendly')
  if (city.hiddenGem) out.push('Less touristy')
  else if (hiddenGems && city.size !== 'major') out.push('Smaller city')
  if (city.costLevel === 1) out.push('Easy on the budget')
  if (!out.length) out.push(...city.interests.slice(0, 2).map((i) => interestById[i]?.label).filter(Boolean))
  return out.slice(0, 4)
}

const cityItem = (c, opts = {}, from = null) => ({ cityId: c.id, why: whyLabels(c, opts), train: from ? trainBetween(from, c.id) : null })

// Cities ranked for interests / month / country / less-touristy, using the trip builder's scoring.
export function rankCities({ interests = [], month = null, country = null, hiddenGems = false, exclude = [] } = {}) {
  const { prefs } = normalizePreferences({ interests, month, mix: hiddenGems ? 'gems' : 'balanced', includeCountries: country ? [country] : [] })
  return cities
    .filter((c) => (!country || c.country === country) && !exclude.includes(c.id))
    .filter((c) => !hiddenGems || c.hiddenGem || c.size !== 'major')
    .filter((c) => !interests.includes('beaches') || c.beach)
    .map((c) => ({ c, score: scoreCity(c, prefs).score + (month && c.seasons?.bestWeather?.includes(month) ? 2 : 0) }))
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c)
}

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const PLACE_WORDS = { food: 'food spots', outdoors: 'outdoor places', museums: 'museums', nightlife: 'nightlife spots', history: 'historic sights', shopping: 'shopping spots' }

// `ctx`: { handle (open trip or null), memory: { lastList, anchorCity, lastSurprise }, today, builderInput }
export function runAppAction(a, ctx = {}) {
  const { handle = null, memory = {} } = ctx
  const tripIds = handle ? handle.plan.stops.map((s) => s.cityId) : []
  const addEffect = (id) => (handle ? ask(`Add ${cityName(id)} to my trip`) : { type: 'add_city', cityId: id })
  switch (a.action) {
    case 'open_city':
      return { text: `Opening ${cityName(a.city)}.`, now: nav(cityPath(a.city)), memory: { anchorCity: a.city } }
    case 'open_country':
      return { text: `Opening ${countryByCode[a.country].name}.`, now: nav(countryPath(a.country)) }
    case 'open_page':
      if (a.page === 'compare' || a.page === 'quiz') return { text: `Opening ${PAGE_NAMES[a.page]}.`, now: { type: 'tool', tool: a.page } }
      return { text: `Opening ${PAGE_NAMES[a.page]}.`, now: nav(PAGE_PATHS[a.page]) }
    case 'show_on_map':
      return { text: a.place ? `Showing ${placeById[a.place].name} on the map.` : `Showing ${cityName(a.city)} on the map.`, now: { type: 'map', cityId: a.city, placeId: a.place } }
    case 'help': {
      const h = HELP[a.topic] || HELP.general
      return { text: h.text, followUps: h.tool ? [{ label: h.label, effect: { type: 'tool', tool: h.tool } }] : h.to ? [{ label: h.label, effect: nav(h.to) }] : [] }
    }

    case 'save_place': {
      const p = placeById[a.place]
      if (handle?.trip?.statuses[p.id]) return { text: `${p.name} is already saved in My trip.`, blocks: [{ type: 'places', items: [{ placeId: p.id }] }] }
      return { text: `Here it is. Press Save to add it to My trip.`, blocks: [{ type: 'places', items: [{ placeId: p.id }] }], memory: { anchorCity: p.cityId } }
    }

    case 'suggest_places': {
      const all = placesInCity(a.city)
      let pool = a.category ? all.filter((p) => p.category === a.category) : all
      const missing = a.category && !pool.length
      if (missing) pool = all
      const picks = [...pool].sort((x, y) => (y.rating || 0) - (x.rating || 0)).slice(0, 4)
      if (!picks.length) return { text: `Eurowander doesn’t have places for ${cityName(a.city)} yet. Opening the city loads some from OpenStreetMap.`, followUps: [{ label: `Open ${cityName(a.city)}`, effect: nav(cityPath(a.city)) }] }
      const what = a.category && !missing ? PLACE_WORDS[a.category] : 'places'
      const gems = a.hiddenGems && !cityById[a.city].hiddenGem ? hiddenGemsFor(cityById[a.city]).slice(0, 2) : []
      return {
        text: missing ? `No ${PLACE_WORDS[a.category]} for ${cityName(a.city)} in the guide yet, so here are its top-rated places.` : `${picks.length === 1 ? 'The top-rated' : `The ${picks.length} top-rated`} ${what} in ${cityName(a.city)} from Eurowander’s guide:`,
        blocks: [{ type: 'places', items: picks.map((p) => ({ placeId: p.id })) }],
        followUps: [
          ...gems.map((g) => ({ label: `Quieter nearby: ${g.name}`, prompt: `Tell me about ${g.name}` })),
          ...['food', 'museums', 'nightlife', 'outdoors'].filter((c) => c !== a.category).slice(0, 2).map((c) => ({ label: `${interestById[c].icon} ${interestById[c].label}`, prompt: `${interestById[c].label} in ${cityName(a.city)}` })),
          { label: 'Show on map', effect: { type: 'map', cityId: a.city } },
        ],
        sources: ['sample'],
        memory: { anchorCity: a.city, lastList: picks.map((p) => p.id) },
      }
    }

    case 'suggest_cities': {
      const ranked = rankCities({ interests: a.interests, month: a.month, country: a.country, hiddenGems: a.hiddenGems, exclude: tripIds }).slice(0, 3)
      if (!ranked.length) return { text: 'Nothing in Eurowander’s guide matches all of that yet. Try fewer filters.' }
      const where = a.country ? ` in ${countryByCode[a.country].name}` : ''
      const count = ['', 'One', 'Two', 'Three'][ranked.length]
      const lead = a.hiddenGems ? `${count} less touristy pick${ranked.length === 1 ? '' : 's'}${where}` : `${ranked.length === 1 ? 'One place fits' : `${count} places fit`}${where}`
      const opts = { interests: a.interests, month: a.month, hiddenGems: a.hiddenGems }
      const from = tripIds[tripIds.length - 1] || null
      return {
        text: `${lead}${a.month ? ` in ${FULL_MONTHS[a.month - 1]}` : ''}${a.interests.length ? `, for ${list(a.interests.map((i) => builderInterestById[i].label.toLowerCase()))}` : ''}:`,
        blocks: [{ type: 'cities', items: ranked.map((c) => cityItem(c, opts, from)), from }],
        followUps: cityFollowUps(ranked.map((c) => c.id), { handle }),
        sources: a.month ? ['seasonal'] : [],
        memory: { lastList: ranked.map((c) => c.id), anchorCity: ranked[0].id },
      }
    }

    case 'city_info': {
      const c = cityById[a.city]
      const gems = c.hiddenGem ? [] : hiddenGemsFor(c)
      const day = dailyEur(c)
      return {
        text: `${c.description}`,
        blocks: [
          { type: 'cities', items: [cityItem(c, {}, tripIds.includes(c.id) ? null : tripIds[tripIds.length - 1] || null)] },
          {
            type: 'stats',
            items: [
              { label: 'Typical stay', value: stayText(c) },
              { label: 'Cost', value: `${costWord(c)}${day ? `, ~€${day}/person/day` : ''}` },
              { label: 'Best weather', value: monthRange(c.seasons?.bestWeather) || '—' },
              { label: 'Busiest', value: monthRange(c.seasons?.busy) || '—' },
            ],
          },
        ],
        followUps: [
          ...(tripIds.includes(c.id) ? [] : [{ label: 'Add to trip', effect: addEffect(c.id) }]),
          ...(gems.length ? [{ label: 'Quieter alternatives', prompt: `Less touristy alternative to ${c.name}` }] : []),
          { label: 'Things to do', prompt: `Things to do in ${c.name}` },
          { label: 'Trains from here', prompt: `Where can I go from ${c.name} by train?` },
        ],
        sources: ['sample', 'seasonal'],
        memory: { anchorCity: c.id },
      }
    }

    case 'compare_cities':
      return compare(a.cities, { handle })

    case 'trains_from': {
      const conns = connectionsFrom(a.city).slice(0, 6)
      if (!conns.length) return { text: `Eurowander has no sample train times from ${cityName(a.city)} yet. Travel times from there are estimated from distance.` }
      return {
        text: `Direct trains from ${cityName(a.city)} in Eurowander’s sample timetable, quickest first:`,
        blocks: [{ type: 'cities', items: conns.map((x) => ({ cityId: x.city.id, why: whyLabels(x.city), train: { from: a.city, minutes: x.minutes, mode: x.mode, source: 'sample' } })), from: a.city }],
        followUps: cityFollowUps(conns.slice(0, 3).map((x) => x.city.id), { handle }),
        sources: ['sample'],
        memory: { lastList: conns.map((x) => x.city.id), anchorCity: a.city },
      }
    }

    case 'find_trains':
      return trainsAnswer(a, ctx.liveTrains)

    case 'next_after': {
      const from = cityById[a.city]
      const prefs = { interests: handle?.plan.prefs.interests || a.interests, hiddenGems: a.hiddenGems }
      const near = cities
        .filter((c) => c.id !== from.id && !tripIds.includes(c.id))
        .map((c) => ({ c, t: trainBetween(from.id, c.id) }))
        .filter((x) => x.t.minutes <= 300)
        .map((x) => ({ ...x, score: (x.t.source === 'sample' ? 1 : 0) - x.t.minutes / 120 + (prefs.hiddenGems && x.c.hiddenGem ? 2 : 0) + prefs.interests.filter((i) => interestFit(x.c, i) === 'strong').length }))
        .sort((x, y) => y.score - x.score)
        .slice(0, 3)
      if (!near.length) return { text: `Nothing in the guide is within about 5 hours of ${from.name} by train.` }
      return {
        text: `From ${from.name}, ${list(near.map((x) => x.c.name))} are ${near.length === 1 ? 'the easiest next stop' : 'easy next stops'}:`,
        blocks: [{ type: 'cities', items: near.map((x) => ({ cityId: x.c.id, why: whyLabels(x.c, prefs), train: x.t })), from: from.id }],
        followUps: cityFollowUps(near.map((x) => x.c.id), { handle, anchor: from.id }),
        sources: ['sample'],
        memory: { lastList: near.map((x) => x.c.id), anchorCity: from.id },
      }
    }

    case 'alternatives_to': {
      const c = cityById[a.city]
      const ids = [...new Set([...(c.hiddenGem ? [] : c.hiddenGems), ...gemsNear(c.id, 4)])].filter((id) => id !== c.id && !tripIds.includes(id)).slice(0, 3)
      if (!ids.length) return { text: `${c.name} is already one of the quieter places in the guide.` }
      return {
        text: `Quieter alternatives to ${c.name}:`,
        blocks: [{ type: 'cities', items: ids.map((id) => cityItem(cityById[id], { hiddenGems: true }, c.id)), from: c.id }],
        followUps: cityFollowUps(ids, { handle, anchor: c.id }),
        sources: ['sample'],
        memory: { lastList: ids, anchorCity: c.id },
      }
    }

    case 'route': {
      const legs = a.cities.slice(1).map((to, i) => ({ from: a.cities[i], to, ...trainBetween(a.cities[i], to) }))
      const total = legs.reduce((s, l) => s + l.minutes, 0)
      const inTrip = a.cities.filter((id) => tripIds.includes(id))
      return {
        text: `${list(a.cities.map(cityName))} by train:`,
        blocks: [{ type: 'route', legs, total }],
        followUps: [
          ...(handle ? a.cities.filter((id) => !inTrip.includes(id)).slice(0, 2).map((id) => ({ label: `Add ${cityName(id)}`, effect: ask(`Add ${cityName(id)} to my trip`) })) : [{ label: 'Add route to My trip', effect: { type: 'add_cities', cityIds: a.cities } }]),
          { label: 'Build a trip from this', effect: ask(`Plan a trip through ${list(a.cities.map(cityName))}`) },
          { label: 'View on map', effect: { type: 'map', cityId: a.cities[0] } },
        ],
        sources: [legs.some((l) => l.source !== 'sample') ? 'estimate' : 'sample'],
        memory: { lastList: a.cities, anchorCity: a.cities[a.cities.length - 1] },
      }
    }

    case 'surprise': {
      const pool = rankCities({ interests: a.interests.length ? a.interests : handle?.plan.prefs.interests || [], month: a.month, country: a.country, hiddenGems: a.hiddenGems, exclude: [...tripIds, memory.lastSurprise].filter(Boolean) }).slice(0, 10)
      const pick = pool[Math.floor((ctx.random ?? Math.random)() * pool.length)]
      if (!pick) return { text: 'I’m out of surprises for those filters.' }
      return {
        text: `How about ${pick.name}? ${pick.description}`,
        blocks: [{ type: 'cities', items: [cityItem(pick, { interests: a.interests, month: a.month }, tripIds[tripIds.length - 1] || null)] }],
        followUps: [{ label: '🎲 Another one', prompt: 'Surprise me' }, { label: 'Tell me more', prompt: `Tell me about ${pick.name}` }, ...(tripIds.includes(pick.id) ? [] : [{ label: 'Add to trip', effect: addEffect(pick.id) }])],
        memory: { anchorCity: pick.id, lastSurprise: pick.id, lastList: [pick.id] },
      }
    }

    case 'pick_from_list':
      return pick(a, { handle, memory })

    case 'build_trip':
      return buildTrip(a, ctx)

    case 'my_trip':
      return myTrip(handle)

    default:
      return {
        text: 'I can plan trips, change the trip you’re working on, suggest cities and places, compare them, find train routes and quieter alternatives, and explain how Eurowander works.',
        followUps: [
          { label: '🗺️ Plan a trip', prompt: 'Plan a trip' },
          { label: '💎 Hidden gems', prompt: 'Show me less touristy cities' },
          { label: '🎲 Surprise me', prompt: 'Surprise me' },
        ],
      }
  }
}

// Follow-ups after a list of cities: they depend on what was shown.
function cityFollowUps(ids, { handle, anchor = null }) {
  const names = ids.map(cityName)
  const out = []
  if (ids.length >= 2) out.push({ label: 'Compare them', prompt: `Compare ${list(names)}` })
  if (anchor) out.push({ label: 'Train options', prompt: `Where can I go from ${cityName(anchor)} by train?` })
  if (!ids.every((id) => cityById[id].hiddenGem)) out.push({ label: '💎 Quieter options', prompt: `Less touristy alternative to ${names[0]}` })
  out.push({ label: 'Which is cheapest?', prompt: 'Which is cheapest?' })
  if (handle) out.push({ label: `Add ${names[0]} to trip`, prompt: `Add ${names[0]} to my trip` })
  return out.slice(0, 4)
}

function compare(ids, { handle }) {
  const cs = ids.map((id) => cityById[id])
  const t = trainBetween(ids[0], ids[1])
  const rows = [
    { label: 'Cost', values: cs.map((c) => `${'$'.repeat(c.costLevel || 0) || '—'}${dailyEur(c) ? ` · ~€${dailyEur(c)}/day` : ''}`) },
    { label: 'Typical stay', values: cs.map(stayText) },
    { label: 'Best weather', values: cs.map((c) => monthRange(c.seasons?.bestWeather) || '—') },
    { label: 'Known for', values: cs.map((c) => c.interests.slice(0, 3).map((i) => interestById[i]?.label).join(', ')) },
    { label: 'Crowds', values: cs.map((c) => (c.hiddenGem ? 'Quieter' : c.size === 'major' ? 'Busy, big-name' : 'Moderate')) },
  ]
  const cheaper = [...cs].sort((a, b) => (a.costLevel || 9) - (b.costLevel || 9))[0]
  const lead = cs.length === 2 ? (cs[0].costLevel !== cs[1].costLevel ? `${cheaper.name} is the cheaper of the two.` : 'They cost about the same day to day.') : `${cheaper.name} is the cheapest.`
  return {
    text: `${lead}${t && cs.length === 2 ? ` They’re ${t.source === 'sample' ? '' : 'roughly '}${formatDuration(t.minutes)} apart by ${t.mode === 'bus' ? 'bus' : 'train'}.` : ''}`,
    blocks: [{ type: 'compare', cities: ids, rows }],
    followUps: [...ids.slice(0, 2).map((id) => ({ label: handle ? `Add ${cityName(id)}` : `Open ${cityName(id)}`, effect: handle ? ask(`Add ${cityName(id)} to my trip`) : nav(cityPath(id)) })), { label: 'Full comparison', effect: { type: 'tool', tool: 'compare', cities: ids.slice(0, 2) } }],
    sources: ['sample'],
    memory: { lastList: ids },
  }
}

function pick({ list: ids, criterion, interests }, { handle, memory }) {
  const cs = ids.map((id) => cityById[id])
  const anchor = memory.anchorCity && !ids.includes(memory.anchorCity) ? memory.anchorCity : handle?.plan.stops[handle.plan.stops.length - 1]?.cityId
  const month = handle?.plan.prefs.month || null
  const by = {
    cheapest: [(c) => dailyEur(c) ?? 999, (c) => `about €${dailyEur(c)} per person per day`],
    most_expensive: [(c) => -(dailyEur(c) ?? 0), (c) => `about €${dailyEur(c)} per person per day`],
    least_touristy: [(c) => (c.hiddenGem ? 0 : c.size === 'major' ? 2 : 1), (c) => (c.hiddenGem ? 'a hidden gem with fewer crowds' : 'smaller than the others')],
    closest: [(c) => (anchor ? trainBetween(anchor, c.id)?.minutes ?? 999 : 0), (c) => (anchor ? `~${formatDuration(trainBetween(anchor, c.id).minutes)} from ${cityName(anchor)}` : '')],
    best_weather: [(c) => (month && c.seasons?.bestWeather?.includes(month) ? 0 : 1), (c) => `best weather ${monthRange(c.seasons?.bestWeather)}`],
    best_for_interest: [(c) => -(interests || []).filter((i) => interestFit(c, i) === 'strong').length - c.interests.length / 10, (c) => `known for ${c.interests.slice(0, 2).map((i) => interestById[i]?.label.toLowerCase()).join(' and ')}`],
  }[criterion]
  const best = [...cs].sort((a, b) => by[0](a) - by[0](b))[0]
  const word = { cheapest: 'cheapest', most_expensive: 'most expensive', least_touristy: 'least touristy', closest: 'closest', best_weather: 'best for weather', best_for_interest: 'the best fit' }[criterion]
  return {
    text: `Of ${list(cs.map((c) => c.name))}, ${best.name} is the ${word}: ${by[1](best)}.`,
    blocks: [{ type: 'cities', items: [cityItem(best, { interests }, anchor)] }],
    followUps: [{ label: 'Compare all', prompt: `Compare ${list(cs.map((c) => c.name))}` }, { label: `Tell me about ${best.name}`, prompt: `Tell me about ${best.name}` }, ...(handle ? [{ label: `Add ${best.name}`, prompt: `Add ${best.name} to my trip` }] : [])],
    sources: criterion === 'best_weather' ? ['seasonal'] : ['sample'],
    memory: { anchorCity: best.id },
  }
}

// The builder form from a build_trip action: the builder's defaults, plus what was asked for.
export function buildInput(a, base = defaultPreferences()) {
  const input = { ...defaultPreferences(), currency: base.currency || 'USD', travellers: base.travellers || 2 }
  if (a.tripDays) input.days = a.tripDays
  if (a.startDate) input.startDate = a.startDate
  if (!a.startDate && a.month) input.month = a.month
  if (a.countries?.length) input.includeCountries = a.countries
  if (a.cities?.length) input.mustVisit = a.cities
  if (a.startCity) input.startCityId = a.startCity
  if (a.interests?.length) input.interests = a.interests
  if (a.pace) input.pace = a.pace
  if (a.hiddenGems) input.mix = 'mostly-gems'
  if (a.budget) input.budget = String(a.budget)
  if (a.currency) input.currency = a.currency
  if (a.travellers) input.travellers = a.travellers
  return input
}

const INTEREST_CHIPS = ['food', 'history', 'nightlife', 'nature', 'museums', 'beaches']

// A new trip. With too little to go on, ask a short question instead of inventing a generic trip.
function buildTrip(a, ctx) {
  const draft = { ...(ctx.memory?.draft || {}) }
  for (const k of ['tripDays', 'startDate', 'month', 'pace', 'budget', 'currency', 'travellers', 'startCity']) if (a[k]) draft[k] = a[k]
  for (const k of ['countries', 'cities', 'interests']) if (a[k]?.length) draft[k] = [...new Set([...(draft[k] || []), ...a[k]])]
  if (a.hiddenGems) draft.hiddenGems = true
  const where = draft.countries?.length || draft.cities?.length || draft.startCity
  if (!ctx.force && (!draft.tripDays || (!where && !draft.interests?.length))) {
    const asks = [!draft.tripDays && 'How many days?', !draft.startDate && !draft.month && 'When are you going?', !where && !draft.interests?.length && 'What are you most into?'].filter(Boolean)
    return {
      text: `Happy to. ${asks.length === 1 ? 'One thing first:' : 'A few things to start:'}`,
      blocks: [{ type: 'list', items: asks }],
      followUps: [
        ...(!draft.tripDays ? ['7 days', '10 days', '2 weeks'].map((d) => ({ label: d, prompt: d })) : []),
        ...(!where && !draft.interests?.length ? INTEREST_CHIPS.map((i) => ({ label: `${builderInterestById[i].icon} ${builderInterestById[i].label}`, prompt: builderInterestById[i].label })) : []),
        ...(draft.tripDays ? [{ label: 'Just build it', effect: { type: 'ask', prompt: 'Just build it', force: true } }] : []),
      ],
      memory: { draft },
    }
  }
  const b = { ...draft, countries: draft.countries || [], cities: draft.cities || [], interests: draft.interests || [] }
  const input = buildInput(b, ctx.builderInput)
  const { plan } = generatePlan(input, ctx.today ? { today: ctx.today } : undefined)
  const bits = [
    `${plan.prefs.days} days`,
    b.countries.length ? `in ${list(b.countries.map((c) => countryByCode[c].name))}` : '',
    b.startCity ? `from ${cityName(b.startCity)}` : '',
    b.cities.length ? `with ${list(b.cities.map(cityName))}` : '',
    b.interests.length ? `for ${list(b.interests.map((i) => builderInterestById[i].label.toLowerCase()))}` : '',
    b.pace ? `at a ${PACES.find((p) => p.id === b.pace).label.toLowerCase()} pace` : '',
    b.month && !b.startDate ? `in ${FULL_MONTHS[b.month - 1]}` : '',
  ].filter(Boolean)
  const skipped = a.skipped?.length ? ` (${list(a.skipped)} ${a.skipped.length === 1 ? 'isn’t' : 'aren’t'} in Eurowander yet, so I left ${a.skipped.length === 1 ? 'it' : 'them'} out.)` : ''
  return {
    text: `Here’s a first route for ${bits.join(' ')}.${skipped}`,
    blocks: [{ type: 'build', stops: plan.stops.map((s) => ({ cityId: s.cityId, nights: s.nights })), days: plan.prefs.days, input, replaces: ctx.handle?.kind === 'built' }],
    followUps: [{ label: 'More relaxed', prompt: `Plan ${plan.prefs.days} days ${b.countries.length ? `in ${list(b.countries.map((c) => countryByCode[c].name))}` : ''} at a relaxed pace` }, { label: '💎 More hidden gems', prompt: `Plan ${plan.prefs.days} days with hidden gems ${b.countries.length ? `in ${list(b.countries.map((c) => countryByCode[c].name))}` : ''}` }],
    sources: ['estimate'],
    memory: { draft: null, lastList: plan.stops.map((s) => s.cityId) },
  }
}

function myTrip(handle) {
  if (!handle) return { text: 'You don’t have a trip yet. Save places with the heart, add cities, or ask me to plan one.', followUps: [{ label: '🗺️ Plan a trip', prompt: 'Plan a trip' }, { label: 'Explore the map', effect: nav('/explore') }] }
  const t = handle.trip
  const saved = t ? Object.keys(t.statuses || {}).length : 0
  return {
    text: `${handle.kind === 'built' ? 'The trip on the Build page' : 'My trip'}: ${list(handle.plan.stops.map((s) => cityName(s.cityId)))}${handle.dates ? `, ${handle.dates}` : ', no dates yet'}${t ? `, ${saved} saved place${saved === 1 ? '' : 's'}` : ''}.`,
    followUps: [{ label: 'Is it too rushed?', prompt: 'Is my trip too rushed?' }, { label: 'Budget', prompt: 'Can I afford this trip?' }, { label: 'What next?', prompt: 'What should I do next?' }],
  }
}
