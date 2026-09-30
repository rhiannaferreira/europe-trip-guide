// What the AI sees of a plan: cities, nights, days and the main preferences. Nothing the traveller typed
// (trip name, notes) goes in; only the request itself is sent alongside this.
import { cityById } from '../../data/cities.js'
import { planTimeline } from '../plan.js'

export function assistantContext(plan) {
  return {
    stops: plan.stops.map((s) => ({ city: cityById[s.cityId].name, nights: s.nights })),
    dayList: planTimeline(plan).map((d) => ({ day: d.number, date: d.date || null, city: cityById[d.cityId].name })),
    prefs: {
      pace: plan.prefs.pace,
      transport: plan.prefs.transport,
      maxLegMinutes: plan.prefs.maxLegMinutes,
      interests: plan.prefs.interests,
      budget: plan.prefs.budget,
      currency: plan.prefs.currency,
      travellers: plan.prefs.travellers,
    },
  }
}
