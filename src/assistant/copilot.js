// The copilot's pipeline, without React: a raw action (from the rules or the AI) is checked, then answered
// from Eurowander's data (appRun.js) or worked out against the open trip (tripRun.js).
import { TRIP_ACTIONS, validateAppAction } from './appActions.js'
import { cityById } from '../data/cities.js'
import { candidateCities } from './aiContext.js'
import { runAppAction, whyLabels } from './appRun.js'
import { nearPlaces, runTripAction } from './tripRun.js'

// Whether answering needs the trip's weather (fetched first for My trip, which has none loaded).
export const needsWeather = (a, message = '') =>
  a?.action === 'rain_plan' ||
  (a?.action === 'trip_question' && ['weather', 'best_outdoor_day', 'next_step'].includes(a.question)) ||
  (['open_question', 'plan_day', 'lighten_day'].includes(a?.action) && /\b(rain|weather|sunny|cold|hot|warm|tonight|today|tomorrow)\b/i.test(message))

export function check(raw, ctx) {
  return validateAppAction(raw, ctx)
}

// `ctx`: { handle, pageCityId, memory, today, weatherByDay, builderInput }
export function respond(checked, ctx) {
  if (!checked.ok) {
    return {
      text: checked.error,
      tone: 'note',
      followUps: checked.noTrip
        ? [{ label: '🗺️ Plan a trip', prompt: 'Plan a trip' }, { label: 'Explore the map', effect: { type: 'navigate', to: '/explore' } }]
        : checked.needsDates
          ? [{ label: 'Open My trip', effect: { type: 'navigate', to: '/trip' } }]
          : [],
    }
  }
  const a = checked.action
  try {
    if (a.action === 'open_question') return openQuestion(a, ctx)
    if (!ctx.handle && a.action === 'add_city') {
      return { text: `${cityById[a.city].name} isn’t in a trip yet. Add it to My trip to start one:`, blocks: [{ type: 'cities', items: [{ cityId: a.city, why: whyLabels(cityById[a.city]), train: null }] }], sources: ['sample'] }
    }
    if (!ctx.handle && a.action === 'places_near') return nearPlaces(null, a)
    return TRIP_ACTIONS.includes(a.action) ? runTripAction(a, ctx) : runAppAction(a, ctx)
  } catch (e) {
    console.error('copilot: could not answer', a.action, e)
    return { text: 'Something went wrong working that out. Try asking another way.', tone: 'error' }
  }
}

// A question only the AI can answer well. What the app adds is data: the guide's best matching cities
// when the question names none. Without the AI, those cities are the answer.
export function openQuestion(a, ctx = {}) {
  const exclude = ctx.handle ? ctx.handle.plan.stops.map((s) => s.cityId) : []
  const ids = a.city ? [a.city, ...(a.cities || []).filter((c) => c !== a.city)] : a.cities?.length ? a.cities : candidateCities(a, { exclude })
  return {
    text: ids.length ? 'Here’s what Eurowander’s guide suggests:' : 'I can help with trips, cities, trains, budgets and day plans. Try one of these:',
    blocks: ids.length ? [{ type: 'cities', items: ids.slice(0, 4).map((id) => ({ cityId: id, why: whyLabels(cityById[id], { interests: a.interests || [], month: a.month, hiddenGems: a.hiddenGems }), train: null })) }] : [],
    followUps: ids.length ? [] : [{ label: '🗺️ Plan a trip', prompt: 'Plan a trip' }, { label: '💎 Hidden gems', prompt: 'Show me less touristy cities' }, { label: '🎲 Surprise me', prompt: 'Surprise me' }],
    memory: ids.length ? { lastList: ids.slice(0, 4), anchorCity: ids[0] } : {},
    sources: ids.length ? ['sample'] : [],
    open: true,
  }
}
