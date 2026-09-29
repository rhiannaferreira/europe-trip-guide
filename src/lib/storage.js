// Everything the app keeps in localStorage, in one place.
//
//   travel-app-trip          the trip: stops, dates, saved places and their status, itinerary, notes (see useTrip.js)
//   travel-app-trip-backup   a copy of the trip exactly as it was before its first migration to a newer shape
//   travel-app-trip-previous the trip as it was before a shared trip replaced it
//   travel-app-extra-places  OpenStreetMap places the trip uses (see lib/extraPlaces.js)
//   travel-app-recent-searches  the last few search suggestions picked, as [{ kind, id }]
//   travel-app-budget        budget total, currency, travellers, expenses and estimate overrides (see useBudget.js)
//   travel-app-theme         'light' or 'dark' (missing means "follow the system")
//
// Reads never throw: unreadable or missing values come back as `fallback`.
// Nothing here ever removes a key.
export const KEYS = {
  trip: 'travel-app-trip',
  tripBackup: 'travel-app-trip-backup',
  tripPrevious: 'travel-app-trip-previous',
  extraPlaces: 'travel-app-extra-places',
  recentSearches: 'travel-app-recent-searches',
  budget: 'travel-app-budget',
  theme: 'travel-app-theme',
}

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked (private mode). The app keeps working; changes just won't persist.
  }
}

export function readText(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeText(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // See writeJSON.
  }
}

// Keep the first pre-migration copy only, so repeated loads never overwrite the original.
export function backupOnce(key, backupKey) {
  try {
    const raw = localStorage.getItem(key)
    if (raw != null && localStorage.getItem(backupKey) == null) localStorage.setItem(backupKey, raw)
  } catch {
    // Nothing to back up, or storage unavailable.
  }
}
