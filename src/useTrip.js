import { useEffect, useState } from 'react'
import { placeById } from './data/places.js'
import { KEYS, backupOnce, readJSON, readText, writeJSON } from './lib/storage.js'
import { persistTripPlaces } from './lib/extraPlaces.js'
import { TRIP_CHANGED, withCity, withPlace } from './lib/tripStore.js'
import { DEFAULT_TRIP_NAME, STATUSES, VERSION, emptyTrip, migrate } from './lib/tripModel.js'

// The trip's shape and migrations live in lib/tripModel.js; they're re-exported here for older imports.
export { DEFAULT_TRIP_NAME, STATUSES, emptyTrip, isEmptyTrip, migrate } from './lib/tripModel.js'

function loadSaved() {
  const saved = readJSON(KEYS.trip)
  // Before migrating an older (or unreadable) saved trip, keep a copy of it exactly as it was.
  if (readText(KEYS.trip) !== null && saved?.version !== VERSION) backupOnce(KEYS.trip, KEYS.tripBackup)
  return migrate(saved)
}

// Remove places from every itinerary day (used when places are unsaved or their stop is removed).
function withoutPlaces(itinerary, placeIds) {
  const drop = new Set(placeIds)
  const next = {}
  for (const [n, day] of Object.entries(itinerary)) {
    const kept = day.placeIds.filter((id) => !drop.has(id))
    if (kept.length || day.note) next[n] = { ...day, placeIds: kept }
  }
  return next
}

function withoutStatuses(statuses, placeIds) {
  const next = { ...statuses }
  for (const id of placeIds) delete next[id]
  return next
}

export function useTrip() {
  const [trip, setTrip] = useState(loadSaved)

  useEffect(() => {
    writeJSON(KEYS.trip, trip)
    persistTripPlaces(trip)
  }, [trip])

  // The site-wide assistant can change the saved trip while this page is open (see lib/tripStore.js).
  useEffect(() => {
    const reload = () => setTrip(loadSaved())
    window.addEventListener(TRIP_CHANGED, reload)
    return () => window.removeEventListener(TRIP_CHANGED, reload)
  }, [])

  const addCity = (cityId) => setTrip((t) => withCity(t, cityId))

  const removeCity = (cityId) =>
    setTrip((t) => {
      const stop = t.stops.find((s) => s.cityId === cityId)
      if (!stop) return t
      return {
        ...t,
        stops: t.stops.filter((s) => s !== stop),
        statuses: withoutStatuses(t.statuses, stop.placeIds),
        itinerary: withoutPlaces(t.itinerary, stop.placeIds),
      }
    })

  // Save a place (adding its city as a stop if needed). Does nothing if it's already saved.
  const savePlace = (placeId, status = 'saved') => setTrip((t) => withPlace(t, placeId, status))

  // Unsave a place: it leaves its stop, its day and its status.
  // Unsaving the last place drops the stop only if the stop came from saving places.
  const unsavePlace = (placeId) =>
    setTrip((t) => {
      const stop = t.stops.find((s) => s.placeIds.includes(placeId))
      if (!stop) return t
      const placeIds = stop.placeIds.filter((id) => id !== placeId)
      const stops =
        placeIds.length === 0 && stop.auto ? t.stops.filter((s) => s !== stop) : t.stops.map((s) => (s === stop ? { ...s, placeIds } : s))
      return { ...t, stops, statuses: withoutStatuses(t.statuses, [placeId]), itinerary: withoutPlaces(t.itinerary, [placeId]) }
    })

  const savedIds = new Set(trip.stops.flatMap((s) => s.placeIds))
  const togglePlace = (placeId) => (savedIds.has(placeId) ? unsavePlace(placeId) : savePlace(placeId))

  const setStatus = (placeId, status) =>
    setTrip((t) => (t.statuses[placeId] && STATUSES.includes(status) ? { ...t, statuses: { ...t.statuses, [placeId]: status } } : t))

  const moveCity = (cityId, delta) =>
    setTrip((t) => {
      const i = t.stops.findIndex((s) => s.cityId === cityId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= t.stops.length) return t
      const stops = [...t.stops]
      ;[stops[i], stops[j]] = [stops[j], stops[i]]
      return { ...t, stops }
    })

  // Set how many days a stop gets (null goes back to sharing days automatically).
  const setStopDays = (cityId, days) =>
    setTrip((t) => ({ ...t, stops: t.stops.map((s) => (s.cityId === cityId ? { ...s, days: days === null ? null : Math.max(0, Math.round(days)) } : s)) }))

  const resetStopDays = () => setTrip((t) => ({ ...t, stops: t.stops.map((s) => ({ ...s, days: null })) }))

  const setDates = (startDate, endDate) => setTrip((t) => ({ ...t, startDate, endDate }))

  const setName = (name) => setTrip((t) => ({ ...t, name }))

  // ----- Itinerary -----
  const updateDay = (t, n, fn) => {
    const day = t.itinerary[n] || { placeIds: [], note: '' }
    const next = fn(day)
    const itinerary = { ...t.itinerary }
    if (next.placeIds.length || next.note) itinerary[n] = next
    else delete itinerary[n]
    return { ...t, itinerary }
  }

  // Put a place on a day (at the end). Saves it first if needed, and takes it off any other day.
  const assignToDay = (placeId, dayNumber) =>
    setTrip((t) => {
      const place = placeById[placeId]
      if (!place || !Number.isInteger(dayNumber) || dayNumber < 1) return t
      let next = t
      if (!t.statuses[placeId]) {
        const stop = t.stops.find((s) => s.cityId === place.cityId)
        next = {
          ...t,
          stops: stop
            ? t.stops.map((s) => (s === stop ? { ...s, placeIds: [...s.placeIds, placeId] } : s))
            : [...t.stops, { cityId: place.cityId, auto: true, placeIds: [placeId], days: null }],
          statuses: { ...t.statuses, [placeId]: 'saved' },
        }
      }
      next = { ...next, itinerary: withoutPlaces(next.itinerary, [placeId]) }
      return updateDay(next, dayNumber, (day) => ({ ...day, placeIds: [...day.placeIds, placeId] }))
    })

  // Take a place off its day. It stays saved.
  const removeFromDay = (placeId) => setTrip((t) => ({ ...t, itinerary: withoutPlaces(t.itinerary, [placeId]) }))

  const movePlaceInDay = (dayNumber, placeId, delta) =>
    setTrip((t) =>
      updateDay(t, dayNumber, (day) => {
        const i = day.placeIds.indexOf(placeId)
        const j = i + delta
        if (i < 0 || j < 0 || j >= day.placeIds.length) return day
        const placeIds = [...day.placeIds]
        ;[placeIds[i], placeIds[j]] = [placeIds[j], placeIds[i]]
        return { ...day, placeIds }
      }),
    )

  // Replace a day's order (used by "Optimize route"). Only accepts the same set of places.
  const setDayOrder = (dayNumber, placeIds) =>
    setTrip((t) =>
      updateDay(t, dayNumber, (day) =>
        placeIds.length === day.placeIds.length && placeIds.every((id) => day.placeIds.includes(id)) ? { ...day, placeIds } : day,
      ),
    )

  const setDayNote = (dayNumber, note) => setTrip((t) => updateDay(t, dayNumber, (day) => ({ ...day, note })))

  // ----- Notes -----
  const setTripNote = (text) => setTrip((t) => ({ ...t, notes: { ...t.notes, trip: text } }))
  const setCityNote = (cityId, text) => setTrip((t) => ({ ...t, notes: { ...t.notes, cities: { ...t.notes.cities, [cityId]: text } } }))

  const clear = () => setTrip(emptyTrip())

  // Swap in a whole trip (from a shared link). The current one is kept under travel-app-trip-previous first.
  const replace = (data) => {
    writeJSON(KEYS.tripPrevious, trip)
    setTrip(migrate(data))
  }

  // Swap in a whole trip from the account (see useCloudSync.js). Unlike replace, no backup is kept:
  // the trip being swapped out is already saved in the account.
  const load = (data) => setTrip(migrate(data))

  return {
    name: trip.name,
    displayName: trip.name.trim() || DEFAULT_TRIP_NAME,
    stops: trip.stops,
    cityIds: trip.stops.map((s) => s.cityId),
    startDate: trip.startDate,
    endDate: trip.endDate,
    statuses: trip.statuses,
    itinerary: trip.itinerary,
    notes: trip.notes,
    savedIds,
    addCity,
    removeCity,
    savePlace,
    unsavePlace,
    togglePlace,
    setStatus,
    moveCity,
    setStopDays,
    resetStopDays,
    setDates,
    setName,
    assignToDay,
    removeFromDay,
    movePlaceInDay,
    setDayOrder,
    setDayNote,
    setTripNote,
    setCityNote,
    clear,
    replace,
    load,
    // The trip exactly as saved, for sharing.
    raw: trip,
  }
}

