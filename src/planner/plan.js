// The generated plan and the facts derived from it: days per stop, the journeys, and one entry per day.
//
// Plan shape (kept in localStorage under travel-app-builder while it's being edited):
//   { version: 1,
//     prefs,                                      normalized preferences (preferences.js)
//     stops: [{ cityId, nights, role, why }] }    in travel order; role is start | end | must | pick | user
//
// Nights and days: a trip of N days has N − 1 nights. Each stop has as many days as nights, and the last
// stop gets one more (the day you leave). The first day at every stop after the first is a travel day.
// This is the same rule the rest of the app uses (utils/tripCalculations.js), so a plan converts to a
// normal trip without changing any dates.
import { addDaysIso } from './preferences.js'
import { routeLegs } from './transport.js'

export const planCityIds = (plan) => plan.stops.map((s) => s.cityId)

export function stopDays(plan) {
  return plan.stops.map((s, i) => s.nights + (i === plan.stops.length - 1 ? 1 : 0))
}

export function planTotals(plan) {
  const nights = plan.stops.reduce((sum, s) => sum + s.nights, 0)
  return { nights, days: plan.stops.length ? nights + 1 : 0 }
}

export function planLegs(plan) {
  const { transport, roundTrip, startCityId } = plan.prefs
  return routeLegs(planCityIds(plan), { transport, returnTo: roundTrip ? startCityId : '' })
}

// The plan's start date, if it has one. End dates follow from the number of nights.
export const planStartDate = (plan) => plan.prefs.startDate || ''

// One entry per day: { number, date ('YYYY-MM-DD' or ''), cityId, stopIndex, leg, departure }
//   leg        the journey that arrives on this day (first day at each stop after the first)
//   departure  the journey home on the last day of a round trip
export function planTimeline(plan, legs = planLegs(plan)) {
  const start = planStartDate(plan)
  const counts = stopDays(plan)
  const out = []
  plan.stops.forEach((stop, i) => {
    for (let k = 0; k < counts[i]; k++) {
      const number = out.length + 1
      out.push({
        number,
        date: start ? addDaysIso(start, number - 1) : '',
        cityId: stop.cityId,
        stopIndex: i,
        leg: k === 0 && i > 0 ? legs[i - 1] || null : null,
        departure: null,
      })
    }
  })
  const home = legs.find((l) => l.isReturn)
  if (home && out.length) out[out.length - 1].departure = home
  return out
}

// A new plan with some stops changed; keeps prefs in step with the new length.
export function withStops(plan, stops) {
  const nights = stops.reduce((sum, s) => sum + s.nights, 0)
  const days = stops.length ? nights + 1 : 0
  const prefs = { ...plan.prefs, nights, days, endDate: plan.prefs.startDate ? addDaysIso(plan.prefs.startDate, Math.max(0, days - 1)) : '' }
  return { ...plan, prefs, stops }
}
