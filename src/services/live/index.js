// EuroWander's live data services, in one place. Components import from here, never from a provider.
//
//   placesService   searchPlaces, getPlaceDetails, geocodePlace           (live: Geoapify via /api/live)
//   trainService    searchStations, searchJourneys, getJourneyStatus      (live: Transitous via /api/live)
//   weatherService  getWeather, getHourlyWeather                          (Open-Meteo, keyless, in the browser)
//   eventsService   searchEvents                                          (EuroWander's curated list for now)
export { searchPlaces, getPlaceDetails, geocodePlace, toAppPlace, nearestCity, livePlacesEnabled, PLACE_KINDS, KIND_FOR_CATEGORY, CUISINES } from './places.js'
export { searchStations, searchJourneys, getJourneyStatus, journeyState, journeySnapshot, stationName, mainStation } from './trains.js'
export { searchEvents, EVENT_CATEGORIES } from './events.js'
export { getForecast as getWeather, getHourly as getHourlyWeather } from '../../lib/weather.js'
export { liveHealth, LiveError, LIVE_ERROR_TEXT } from './http.js'
export { SOURCES, placeSource } from './models.js'
