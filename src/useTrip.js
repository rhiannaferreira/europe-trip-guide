import { useEffect, useState } from 'react'
import { cityById } from './data/cities.js'
import { placeById } from './data/places.js'

const STORAGE_KEY = 'travel-app-trip'
const EMPTY = { stops: [], startDate: '', endDate: '' }

// Trip shape (also what's saved in localStorage, and what a cloud save or share link would carry later):
//   { stops: [{ cityId, auto, placeIds: [] }], startDate: 'YYYY-MM-DD' | '', endDate: 'YYYY-MM-DD' | '' }
// Stops are in travel order. A stop can have no saved places (a city added on its own).
// `auto` marks a stop created by saving a place; it goes away again when its last place is unsaved.
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && Array.isArray(saved.stops)) {
      const stops = saved.stops
        .filter((s) => cityById[s.cityId])
        .map((s) => ({ cityId: s.cityId, auto: Boolean(s.auto), placeIds: (s.placeIds || []).filter((id) => placeById[id]?.cityId === s.cityId) }))
      return { stops, startDate: saved.startDate || '', endDate: saved.endDate || '' }
    }
    // Trips saved by the first version: { placeIds, cityOrder }.
    if (saved && Array.isArray(saved.placeIds) && Array.isArray(saved.cityOrder)) {
      const stops = saved.cityOrder
        .filter((id) => cityById[id])
        .map((cityId) => ({ cityId, auto: true, placeIds: saved.placeIds.filter((id) => placeById[id]?.cityId === cityId) }))
      return { ...EMPTY, stops }
    }
  } catch {
    // Ignore unreadable storage and start with an empty trip.
  }
  return EMPTY
}

export function useTrip() {
  const [trip, setTrip] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip))
    } catch {
      // Storage unavailable; the trip just won't persist.
    }
  }, [trip])

  const setStops = (fn) => setTrip((t) => ({ ...t, stops: fn(t.stops) }))

  const addCity = (cityId) =>
    setStops((stops) =>
      stops.some((s) => s.cityId === cityId)
        ? stops.map((s) => (s.cityId === cityId ? { ...s, auto: false } : s))
        : [...stops, { cityId, auto: false, placeIds: [] }],
    )

  const removeCity = (cityId) => setStops((stops) => stops.filter((s) => s.cityId !== cityId))

  // Save or unsave a place. Saving adds its city as a stop if it isn't one yet.
  // Unsaving the last place drops the stop only if the stop came from saving places.
  const togglePlace = (placeId) =>
    setStops((stops) => {
      const cityId = placeById[placeId].cityId
      const stop = stops.find((s) => s.cityId === cityId)
      if (!stop) return [...stops, { cityId, auto: true, placeIds: [placeId] }]
      if (!stop.placeIds.includes(placeId)) return stops.map((s) => (s === stop ? { ...s, placeIds: [...s.placeIds, placeId] } : s))
      const placeIds = stop.placeIds.filter((id) => id !== placeId)
      if (placeIds.length === 0 && stop.auto) return stops.filter((s) => s !== stop)
      return stops.map((s) => (s === stop ? { ...s, placeIds } : s))
    })

  const moveCity = (cityId, delta) =>
    setStops((stops) => {
      const i = stops.findIndex((s) => s.cityId === cityId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= stops.length) return stops
      const next = [...stops]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const setDates = (startDate, endDate) => setTrip((t) => ({ ...t, startDate, endDate }))

  const clear = () => setTrip(EMPTY)

  const savedIds = new Set(trip.stops.flatMap((s) => s.placeIds))

  return {
    stops: trip.stops,
    cityIds: trip.stops.map((s) => s.cityId),
    startDate: trip.startDate,
    endDate: trip.endDate,
    savedIds,
    addCity,
    removeCity,
    togglePlace,
    moveCity,
    setDates,
    clear,
  }
}
