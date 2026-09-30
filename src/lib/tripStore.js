// Changes to the saved trip (travel-app-trip) from outside the planner page, such as the site-wide
// assistant. The change is written to this browser's storage and announced, so an open planner
// (useTrip.js) picks it up straight away and one opened later reads it from storage.
import { placeById } from '../data/places.js'
import { KEYS, readJSON, writeJSON } from './storage.js'
import { migrate } from './tripModel.js'

export const TRIP_CHANGED = 'eurowander:trip-changed'

// Add a city as a stop (or make an automatic stop a chosen one).
export function withCity(t, cityId) {
  return {
    ...t,
    stops: t.stops.some((s) => s.cityId === cityId)
      ? t.stops.map((s) => (s.cityId === cityId ? { ...s, auto: false } : s))
      : [...t.stops, { cityId, auto: false, placeIds: [], days: null }],
  }
}

// Save a place (adding its city as a stop if needed). Returns the same trip if it's already saved.
export function withPlace(t, placeId, status = 'saved') {
  const place = placeById[placeId]
  if (!place || t.statuses[placeId]) return t
  const stop = t.stops.find((s) => s.cityId === place.cityId)
  const stops = stop
    ? t.stops.map((s) => (s === stop ? { ...s, placeIds: [...s.placeIds, placeId] } : s))
    : [...t.stops, { cityId: place.cityId, auto: true, placeIds: [placeId], days: null }]
  return { ...t, stops, statuses: { ...t.statuses, [placeId]: status } }
}

export const readSavedTrip = () => migrate(readJSON(KEYS.trip))

// Apply `fn` to the saved trip, store it and tell any open planner. Returns the new trip.
export function updateSavedTrip(fn) {
  const next = fn(readSavedTrip())
  writeJSON(KEYS.trip, next)
  try {
    window.dispatchEvent(new CustomEvent(TRIP_CHANGED))
  } catch {
    // No window (tests) or no CustomEvent.
  }
  return next
}
