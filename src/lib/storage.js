// Everything the app keeps in localStorage, in one place.
//
//   travel-app-trip          the trip: stops, dates, saved places and their status, itinerary, notes (see useTrip.js)
//   travel-app-trip-backup   a copy of the trip exactly as it was before its first migration to a newer shape
//   travel-app-trip-previous the trip as it was before a shared trip replaced it
//   travel-app-extra-places  OpenStreetMap places the trip uses (see lib/extraPlaces.js)
//   travel-app-recent-searches  the last few search suggestions picked, as [{ kind, id }]
//   travel-app-budget        budget total, currency, travellers, expenses and estimate overrides (see useBudget.js)
//   travel-app-theme         'light' or 'dark' (missing means "follow the system")
//   travel-app-session       the signed-in account's session, when accounts are on (see lib/supabase.js)
//   travel-app-cloud         which saved trip in the account this browser's trip belongs to (see lib/cloudSync.js)
//   travel-app-builder       the trip builder's form, generated plan and undo history (see builder/usePlanner.js)
//   travel-app-chats         the travel copilot's recent conversations in this browser (see assistant/history.js)
//   travel-app-copilot       copilot flags: intro seen, last proactive hint (see assistant/AssistantPanel.jsx)
//
// Reads never throw: unreadable or missing values come back as `fallback`.
// Nothing here ever removes a key (signing out removes travel-app-session, in lib/supabase.js).
export const KEYS = {
  trip: 'travel-app-trip',
  tripBackup: 'travel-app-trip-backup',
  tripPrevious: 'travel-app-trip-previous',
  extraPlaces: 'travel-app-extra-places',
  recentSearches: 'travel-app-recent-searches',
  budget: 'travel-app-budget',
  theme: 'travel-app-theme',
  session: 'travel-app-session',
  cloud: 'travel-app-cloud',
  builder: 'travel-app-builder',
  chats: 'travel-app-chats',
  copilot: 'travel-app-copilot',
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
