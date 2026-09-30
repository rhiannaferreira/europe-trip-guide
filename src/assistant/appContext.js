// What the AI sees for a site-wide request: the page, city names in the saved and built trips, and the
// cities and countries Eurowander covers. Nothing the traveller typed elsewhere (trip names, notes) goes in.
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'

const name = (id) => cityById[id]?.name || id

export function appContext({ route, trip, builderPlan, today }) {
  return {
    page: {
      name: route?.name || 'home',
      city: route?.name === 'city' && cityById[route.id] ? name(route.id) : null,
      country: route?.name === 'country' && countryByCode[route.code] ? countryByCode[route.code].name : null,
    },
    myTrip: {
      cities: (trip?.stops || []).slice(0, 20).map((s) => name(s.cityId)),
      savedPlaces: Object.keys(trip?.statuses || {}).length,
      dates: trip?.startDate ? `${trip.startDate} to ${trip.endDate}` : null,
    },
    builtTrip: builderPlan ? { cities: builderPlan.stops.map((s) => name(s.cityId)), days: builderPlan.prefs.days } : null,
    today,
    cities: cities.map((c) => c.name),
    countries: countries.map((c) => c.name),
  }
}
