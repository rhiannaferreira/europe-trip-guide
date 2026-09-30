import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { isEmptyTrip, migrate } from '../lib/tripModel.js'

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

// Saves a generated trip as the trip in this browser (the one Explore and My Trip use).
// The current trip is kept as a backup first (travel-app-trip-previous), like opening a shared link does.
// `budget` ({ total, currency, travellers }) updates those budget settings; expenses are kept (the Budget
// tab checks the saved budget when it loads, see useBudget.js).
// When signed in, the link to the account is pointed at a new saved trip, so the account's current
// trip isn't written over: the generated one is saved next to it.
export function saveGeneratedTrip(trip, { budget = null } = {}) {
  const current = migrate(readJSON(KEYS.trip))
  if (!isEmptyTrip(current)) writeJSON(KEYS.tripPrevious, current)
  writeJSON(KEYS.trip, trip)
  if (budget) writeJSON(KEYS.budget, { version: 1, ...(readJSON(KEYS.budget) || {}), ...budget })
  const link = readJSON(KEYS.cloud)
  if (link?.userId) writeJSON(KEYS.cloud, { userId: link.userId, tripId: newId(), syncedHash: null, remoteUpdatedAt: null })
}
