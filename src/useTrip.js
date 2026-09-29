import { useEffect, useState } from 'react'
import { cityById } from './data/cities.js'
import { placeById } from './data/places.js'
import { KEYS, backupOnce, readJSON, writeJSON } from './lib/storage.js'

const VERSION = 3
export const DEFAULT_TRIP_NAME = 'My Europe trip'
export const STATUSES = ['saved', 'want', 'visited']

const empty = () => ({
  version: VERSION,
  name: '',
  stops: [],
  startDate: '',
  endDate: '',
  statuses: {},
  itinerary: {},
  notes: { trip: '', cities: {} },
})

// Trip shape (also what's saved in localStorage under travel-app-trip):
//   {
//     version: 3,
//     name: '',                                   trip name for the printable view ('' shows the default)
//     stops: [{ cityId, auto, placeIds: [], days }],
//         in travel order. A stop can have no saved places (a city added on its own).
//         `auto` marks a stop created by saving a place; it goes away again when its last place is unsaved.
//         `days` is a whole number when the user set the stop's length with +/-, otherwise null (shared automatically).
//     startDate: 'YYYY-MM-DD' | '', endDate: 'YYYY-MM-DD' | '',
//     statuses: { [placeId]: 'saved' | 'want' | 'visited' },   one per saved place
//     itinerary: { [dayNumber]: { placeIds: [], note: '' } },  keyed by day number (1, 2, 3...) so moving the
//         start date keeps the plan. A place is on at most one day.
//     notes: { trip: '', cities: { [cityId]: '' } },
//   }
//
// Older shapes are migrated when loaded, never thrown away:
//   v1 { placeIds, cityOrder }                   first version
//   v2 { stops: [{ cityId, auto, placeIds }], startDate, endDate }
function migrate(saved) {
  if (!saved || typeof saved !== 'object') return empty()

  let stops = []
  if (Array.isArray(saved.stops)) stops = saved.stops
  else if (Array.isArray(saved.placeIds) && Array.isArray(saved.cityOrder)) {
    stops = saved.cityOrder.map((cityId) => ({ cityId, auto: true, placeIds: saved.placeIds.filter((id) => placeById[id]?.cityId === cityId) }))
  }

  // Drop stops and places the sample data no longer has, and any duplicates.
  const seenCities = new Set()
  const seenPlaces = new Set()
  stops = stops
    .filter((s) => s && cityById[s.cityId] && !seenCities.has(s.cityId) && seenCities.add(s.cityId))
    .map((s) => ({
      cityId: s.cityId,
      auto: Boolean(s.auto),
      placeIds: (s.placeIds || []).filter((id) => placeById[id]?.cityId === s.cityId && !seenPlaces.has(id) && seenPlaces.add(id)),
      days: Number.isInteger(s.days) && s.days >= 0 ? s.days : null,
    }))

  // Every saved place gets a status; anything saved before statuses existed becomes "saved".
  const statuses = {}
  for (const id of seenPlaces) statuses[id] = STATUSES.includes(saved.statuses?.[id]) ? saved.statuses[id] : 'saved'

  // Itinerary: keep only saved places, each on one day, and only days that hold something.
  const itinerary = {}
  const placed = new Set()
  for (const [key, day] of Object.entries(saved.itinerary || {})) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1 || !day) continue
    const placeIds = (day.placeIds || []).filter((id) => seenPlaces.has(id) && !placed.has(id) && placed.add(id))
    const note = typeof day.note === 'string' ? day.note : ''
    if (placeIds.length || note) itinerary[n] = { placeIds, note }
  }

  const notes = {
    trip: typeof saved.notes?.trip === 'string' ? saved.notes.trip : '',
    cities: Object.fromEntries(Object.entries(saved.notes?.cities || {}).filter(([id, text]) => cityById[id] && typeof text === 'string')),
  }

  return {
    version: VERSION,
    name: typeof saved.name === 'string' ? saved.name : '',
    stops,
    startDate: typeof saved.startDate === 'string' ? saved.startDate : '',
    endDate: typeof saved.endDate === 'string' ? saved.endDate : '',
    statuses,
    itinerary,
    notes,
  }
}

function load() {
  const saved = readJSON(KEYS.trip)
  if (saved && saved.version !== VERSION) backupOnce(KEYS.trip, KEYS.tripBackup)
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
  const [trip, setTrip] = useState(load)

  useEffect(() => writeJSON(KEYS.trip, trip), [trip])

  const addCity = (cityId) =>
    setTrip((t) => ({
      ...t,
      stops: t.stops.some((s) => s.cityId === cityId)
        ? t.stops.map((s) => (s.cityId === cityId ? { ...s, auto: false } : s))
        : [...t.stops, { cityId, auto: false, placeIds: [], days: null }],
    }))

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
  const savePlace = (placeId, status = 'saved') =>
    setTrip((t) => {
      const place = placeById[placeId]
      if (!place || t.statuses[placeId]) return t
      const stop = t.stops.find((s) => s.cityId === place.cityId)
      const stops = stop
        ? t.stops.map((s) => (s === stop ? { ...s, placeIds: [...s.placeIds, placeId] } : s))
        : [...t.stops, { cityId: place.cityId, auto: true, placeIds: [placeId], days: null }]
      return { ...t, stops, statuses: { ...t.statuses, [placeId]: status } }
    })

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

  const clear = () => setTrip(empty())

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
  }
}
