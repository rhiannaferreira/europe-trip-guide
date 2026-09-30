// The copilot's pipeline, without React: a raw action (from the rules or the AI) is checked, then answered
// from Eurowander's data (appRun.js) or worked out against the open trip (tripRun.js).
import { TRIP_ACTIONS, validateAppAction } from './appActions.js'
import { runAppAction } from './appRun.js'
import { runTripAction } from './tripRun.js'

// Whether answering needs the trip's weather (fetched first for My trip, which has none loaded).
export const needsWeather = (a) => a?.action === 'rain_plan' || (a?.action === 'trip_question' && ['weather', 'best_outdoor_day', 'next_step'].includes(a.question))

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
    return TRIP_ACTIONS.includes(a.action) ? runTripAction(a, ctx) : runAppAction(a, ctx)
  } catch (e) {
    console.error('copilot: could not answer', a.action, e)
    return { text: 'Something went wrong working that out. Try asking another way.', tone: 'error' }
  }
}
