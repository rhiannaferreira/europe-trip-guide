// Turns a validated site-wide action into an answer worked out from Eurowander's own data, a page to
// open, or a proposed change for the traveller to confirm. Nothing here changes anything; the panel
// carries out `effect`s, and only navigation happens without a button press.
//
// Result:
//   { kind: 'navigate', text, effect }               open a page now
//   { kind: 'answer', text, items?, links? }         items: [{ id, title, sub, actions: [{ label, effect }] }]
//   { kind: 'proposal', summary, detail?, effect }   changes something once Apply is pressed
//   { kind: 'none', text }
// Effects: { type: 'navigate', to } · { type: 'tool', tool } · { type: 'add_city', cityId }
//          { type: 'save_place', placeId } · { type: 'build', input }
import { cities, cityById, hiddenGemsFor } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { placeById, placesInCity } from '../data/places.js'
import { costLabel, monthRange } from '../lib/format.js'
import { generatePlan } from '../planner/route.js'
import { PACES, builderInterestById, defaultPreferences } from '../planner/preferences.js'
import { costLevelOf, dailyCostEur, stayText } from '../utils/cityInfo.js'
import { HELP } from './help.js'

const cityName = (id) => cityById[id]?.name || id
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const nav = (to) => ({ type: 'navigate', to })
// Same paths as lib/router.jsx (not imported, so this file runs in plain Node for tests).
const cityPath = (id) => `/city/${id}`
const countryPath = (code) => `/country/${code.toLowerCase()}`
const PAGE_PATHS = { home: '/', explore: '/explore', trip: '/trip', build: '/build' }
const PAGE_NAMES = { home: 'the home page', explore: 'the map', trip: 'My trip', build: 'Build my trip', compare: 'Compare', quiz: 'the quiz', surprise: 'Surprise me' }

const PLACE_WORDS = { food: 'food spots', outdoors: 'outdoor places', museums: 'museums', nightlife: 'nightlife spots', history: 'historic sights', shopping: 'shopping spots' }

// Eurowander's categories for a builder interest (food → food, nature → outdoors, ...).
const categoriesFor = (interest) => (interest ? builderInterestById[interest]?.interests || [interest] : [])

// `ctx`: { trip (the saved trip), builderPlan (a plan open on /build, or null), today }
export function runAppAction(action, ctx = {}) {
  const { trip = null } = ctx
  switch (action.action) {
    case 'open_city':
      return { kind: 'navigate', text: `Opening ${cityName(action.city)}.`, effect: nav(cityPath(action.city)) }
    case 'open_country':
      return { kind: 'navigate', text: `Opening ${countryByCode[action.country].name}.`, effect: nav(countryPath(action.country)) }
    case 'open_page':
      if (['compare', 'quiz', 'surprise'].includes(action.page)) return { kind: 'navigate', text: `Opening ${PAGE_NAMES[action.page]}.`, effect: { type: 'tool', tool: action.page } }
      return { kind: 'navigate', text: `Opening ${PAGE_NAMES[action.page]}.`, effect: nav(PAGE_PATHS[action.page]) }

    case 'add_city_to_trip': {
      const already = trip?.stops.some((s) => s.cityId === action.city && !s.auto)
      if (already) return { kind: 'answer', text: `${cityName(action.city)} is already in your trip.`, links: [{ label: 'Open My trip', effect: nav('/trip') }] }
      return { kind: 'proposal', summary: `Add ${cityName(action.city)} to My trip.`, effect: { type: 'add_city', cityId: action.city } }
    }
    case 'save_place': {
      const p = placeById[action.place]
      if (trip?.statuses[p.id]) return { kind: 'answer', text: `${p.name} is already saved in your trip.`, links: [{ label: 'Open My trip', effect: nav('/trip') }] }
      return { kind: 'proposal', summary: `Save ${p.name} (${cityName(p.cityId)}) to My trip.`, detail: p.description, effect: { type: 'save_place', placeId: p.id } }
    }

    case 'suggest_places':
      return suggestPlaces(action, trip)
    case 'suggest_cities':
      return suggestCities(action, trip)
    case 'city_info':
      return cityInfo(action.city)
    case 'build_trip':
      return buildTrip(action, ctx)
    case 'my_trip':
      return myTrip(trip)
    case 'help': {
      const h = HELP[action.topic] || HELP.general
      const links = h.tool ? [{ label: h.label, effect: { type: 'tool', tool: h.tool } }] : h.to ? [{ label: h.label, effect: nav(h.to) }] : []
      return { kind: 'answer', text: h.text, links }
    }
    case 'plan_request':
      return {
        kind: 'none',
        text: 'Changes like that work on a trip made with Build my trip. Build one first (or ask me to, e.g. “Plan 10 days in Italy”), then ask again on that page.',
        links: [{ label: 'Build my trip', effect: nav('/build') }],
      }
    default:
      return {
        kind: 'none',
        text: 'I can open cities and countries, suggest places and cities, save things to your trip, plan a whole new trip, change a built trip, or explain how something works. Try “Food in Lisbon”, “Plan 10 days in Italy”, or “How do I share my trip?”.',
      }
  }
}

function suggestPlaces({ city, interest, hiddenGems }, trip) {
  const cats = categoriesFor(interest)
  const all = placesInCity(city)
  let pool = cats.length ? all.filter((p) => cats.includes(p.category)) : all
  const fallback = cats.length && !pool.length
  if (fallback) pool = all
  const picks = [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5)
  if (!picks.length) return { kind: 'none', text: `Eurowander doesn’t have places for ${cityName(city)} yet.` }
  const what = cats.length && !fallback ? PLACE_WORDS[cats[0]] || 'places' : 'things to do'
  const lead = fallback
    ? `Eurowander has no ${builderInterestById[interest]?.label.toLowerCase() || interest} places for ${cityName(city)} yet, so here are its top-rated places.`
    : `Top-rated ${what} in ${cityName(city)} from Eurowander’s guide (sample ratings):`
  const gem = cityById[city].hiddenGem ? [] : hiddenGemsFor(cityById[city]).slice(0, 2)
  return {
    kind: 'answer',
    text: lead,
    items: picks.map((p) => ({
      id: p.id,
      title: p.name,
      sub: `${interestById[p.category]?.icon || ''} ${p.description}${p.costLevel != null ? ` · ${costLabel(p.costLevel)}` : ''}`,
      actions: trip?.statuses[p.id] ? [{ label: 'Saved', effect: null }] : [{ label: 'Save', effect: { type: 'save_place', placeId: p.id } }],
    })),
    links: [
      { label: `Open ${cityName(city)}`, effect: nav(cityPath(city)) },
      // Asked for less touristy: point at the less crowded cities nearby too.
      ...(hiddenGems && gem.length ? gem.map((c) => ({ label: `Nearby gem: ${c.name}`, effect: nav(cityPath(c.id)) })) : []),
    ],
  }
}

function suggestCities({ interest, country, hiddenGems }, trip) {
  const cats = categoriesFor(interest)
  const wantsBeach = builderInterestById[interest]?.beach
  const scored = cities
    .filter((c) => (!country || c.country === country) && (!hiddenGems || c.hiddenGem) && (!wantsBeach || c.beach))
    .map((c) => {
      const known = cats.filter((i) => c.interests.includes(i)).length
      const count = placesInCity(c.id).filter((p) => !cats.length || cats.includes(p.category)).length
      return { c, known, count, score: known * 10 + count + (c.size === 'major' && !hiddenGems ? 1 : 0) }
    })
    .filter((x) => !cats.length || x.known || x.count)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
    .slice(0, 5)
  const where = country ? ` in ${countryByCode[country].name}` : ''
  if (!scored.length) return { kind: 'none', text: `No cities${where} in Eurowander’s guide match that yet.` }
  const label = interest ? builderInterestById[interest]?.label.toLowerCase() : null
  const lead = `${hiddenGems ? 'Less crowded cities' : 'Cities'}${where}${label ? ` known for ${label}` : ''} in Eurowander’s guide:`
  const inTrip = new Set((trip?.stops || []).filter((s) => !s.auto).map((s) => s.cityId))
  return {
    kind: 'answer',
    text: lead,
    items: scored.map(({ c }) => ({
      id: c.id,
      title: `${c.emoji} ${c.name}, ${countryByCode[c.country].name}`,
      sub: c.description,
      actions: [{ label: 'Open', effect: nav(cityPath(c.id)) }, inTrip.has(c.id) ? { label: 'In trip', effect: null } : { label: 'Add to trip', effect: { type: 'add_city', cityId: c.id } }],
    })),
  }
}

function cityInfo(id) {
  const c = cityById[id]
  const level = costLevelOf(c)
  const parts = [
    `${c.emoji} ${c.name}, ${countryByCode[c.country].name}: ${c.description}`,
    `Typical stay: ${stayText(c)}.`,
    c.seasons?.bestWeather?.length ? `Best weather: ${monthRange(c.seasons.bestWeather)}.` : '',
    c.seasons?.busy?.length ? `Busiest: ${monthRange(c.seasons.busy)}.` : '',
    level ? `Day-to-day costs: ${level.label.toLowerCase()}, roughly €${dailyCostEur(c)} per person per day (a sample estimate).` : '',
    c.interests?.length ? `Known for ${list(c.interests.map((i) => interestById[i]?.label.toLowerCase()).filter(Boolean))}.` : '',
  ].filter(Boolean)
  const gems = c.hiddenGem ? [] : hiddenGemsFor(c)
  if (gems.length) parts.push(`Less crowded nearby: ${list(gems.map((g) => g.name))}.`)
  return { kind: 'answer', text: parts.join(' '), links: [{ label: `Open ${c.name}`, effect: nav(cityPath(c.id)) }, { label: 'Add to trip', effect: { type: 'add_city', cityId: c.id } }] }
}

// The builder form from a build_trip action: the builder's defaults, plus what was asked for.
export function buildInput(a, base = defaultPreferences()) {
  const input = { ...defaultPreferences(), currency: base.currency || 'USD', travellers: base.travellers || 2 }
  if (a.tripDays) input.days = a.tripDays
  if (a.startDate) input.startDate = a.startDate
  if (a.countries.length) input.includeCountries = a.countries
  if (a.cities.length) input.mustVisit = a.cities
  if (a.startCity) input.startCityId = a.startCity
  if (a.interests.length) input.interests = a.interests
  if (a.pace) input.pace = a.pace
  if (a.budget) input.budget = String(a.budget)
  if (a.currency) input.currency = a.currency
  if (a.travellers) input.travellers = a.travellers
  return input
}

function buildTrip(action, ctx) {
  const input = buildInput(action, ctx.builderInput)
  const { plan } = generatePlan(input, ctx.today ? { today: ctx.today } : undefined)
  const bits = [
    `${plan.prefs.days}-day trip`,
    action.countries.length ? `through ${list(action.countries.map((c) => countryByCode[c].name))}` : '',
    action.startCity ? `from ${cityName(action.startCity)}` : '',
    action.cities.length ? `including ${list(action.cities.map(cityName))}` : '',
    action.interests.length ? `for ${list(action.interests.map((i) => builderInterestById[i].label.toLowerCase()))}` : '',
    action.pace ? `at a ${PACES.find((p) => p.id === action.pace).label.toLowerCase()} pace` : '',
    action.travellers ? `for ${action.travellers} traveller${action.travellers === 1 ? '' : 's'}` : '',
    action.budget ? `on a budget of ${action.budget} ${input.currency}` : '',
  ].filter(Boolean)
  const route = plan.stops.map((s) => `${cityName(s.cityId)} (${s.nights} night${s.nights === 1 ? '' : 's'})`).join(' → ')
  const skipped = action.skipped?.length ? ` ${list(action.skipped)} ${action.skipped.length === 1 ? 'isn’t' : 'aren’t'} in Eurowander yet, so ${action.skipped.length === 1 ? 'it was' : 'they were'} left out.` : ''
  return {
    kind: 'proposal',
    summary: `Build a ${bits.join(' ')}.`,
    detail: `Suggested route: ${route}.${skipped} You can change anything on the Build page.`,
    effect: { type: 'build', input },
    replaces: Boolean(ctx.builderPlan),
  }
}

function myTrip(trip) {
  const stops = trip?.stops || []
  if (!stops.length) {
    return { kind: 'answer', text: 'Your trip is empty so far. Save places with the heart, add cities, or ask me to plan a trip.', links: [{ label: 'Explore the map', effect: nav('/explore') }, { label: 'Build my trip', effect: nav('/build') }] }
  }
  const saved = Object.keys(trip.statuses || {}).length
  const dates = trip.startDate && trip.endDate ? ` from ${trip.startDate} to ${trip.endDate}` : ', no dates set yet'
  const planned = Object.values(trip.itinerary || {}).reduce((n, d) => n + d.placeIds.length, 0)
  return {
    kind: 'answer',
    text: `Your trip has ${stops.length} cit${stops.length === 1 ? 'y' : 'ies'} (${stops.map((s) => cityName(s.cityId)).join(' → ')})${dates}, with ${saved} saved place${saved === 1 ? '' : 's'}${planned ? `, ${planned} of them on a day` : ''}.`,
    links: [{ label: 'Open My trip', effect: nav('/trip') }],
  }
}
