import { useEffect, useRef, useState } from 'react'
import { useAccount } from './lib/account.jsx'
import { createCloudSync } from './lib/cloudSync.js'
import { cloudTrips } from './lib/cloudTrips.js'
import { extraPlacesInTrip, registerPlaces } from './lib/extraPlaces.js'
import { KEYS, readJSON, writeJSON } from './lib/storage.js'
import { DEFAULT_TRIP_NAME, emptyTrip, isEmptyTrip, migrate } from './useTrip.js'
import { emptyBudget, isEmptyBudget, normalizeBudget } from './useBudget.js'

const newId = () =>
  crypto.randomUUID?.() ||
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

// Saves the trip (with its budget) to the signed-in person's account, and loads saved trips back.
// Does nothing while signed out or when accounts are off. See lib/cloudSync.js for how it decides.
export function useCloudSync(trip, budget) {
  const account = useAccount()
  const latest = useRef({ trip, budget })
  latest.current = { trip, budget }
  const [state, setState] = useState(null)
  const syncRef = useRef(null)

  if (account.enabled && !syncRef.current) {
    syncRef.current = createCloudSync({
      api: cloudTrips,
      store: { read: () => readJSON(KEYS.cloud), write: (link) => writeJSON(KEYS.cloud, link) },
      getLocal: () => {
        const { trip: t, budget: b } = latest.current
        return { trip: t.raw, budget: b.raw, extra_places: extraPlacesInTrip(t.raw) }
      },
      normalize: (row) => {
        // A trip's OpenStreetMap places must exist before the trip is checked, or they'd be dropped.
        registerPlaces(row.extra_places)
        const t = migrate(row.trip)
        return { trip: t, budget: normalizeBudget(row.budget), extra_places: extraPlacesInTrip(t) }
      },
      apply: (data) => {
        registerPlaces(data.extra_places)
        latest.current.trip.load(data.trip)
        latest.current.budget.load(data.budget)
      },
      isEmpty: (data) => isEmptyTrip(data.trip) && isEmptyBudget(data.budget),
      nameOf: (data) => data.trip.name.trim() || DEFAULT_TRIP_NAME,
      newId,
      onChange: setState,
    })
  }
  const sync = syncRef.current

  // Follow sign-in and sign-out.
  const userId = account.user?.id
  useEffect(() => {
    if (!sync) return
    if (userId) sync.signIn(account.user)
    else sync.signOut()
  }, [sync, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Every change to the trip or budget is saved shortly after.
  useEffect(() => {
    sync?.changed()
  }, [sync, trip.raw, budget.raw])

  // Pick up changes from other devices when the tab comes back; save right away when it's hidden
  // or the connection returns.
  useEffect(() => {
    if (!sync) return
    const onVisibility = () => (document.visibilityState === 'visible' ? sync.refresh() : sync.flush({ keepalive: true }))
    const onOnline = () => sync.flush()
    const onPageHide = () => sync.flush({ keepalive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [sync])

  // Leaving the planner (for the home page) sends anything not yet saved.
  useEffect(() => () => void sync?.flush(), [sync])

  if (!sync || !state) return { enabled: account.enabled, phase: 'off', status: 'saved', trips: [] }
  return {
    enabled: true,
    ...state,
    open: sync.open,
    startNew: () => sync.startNew({ trip: emptyTrip(), budget: { ...emptyBudget(), currency: budget.currency }, extra_places: [] }),
    remove: sync.remove,
    detach: sync.detach,
    flush: sync.flush,
    dismissNotice: sync.dismissNotice,
  }
}
