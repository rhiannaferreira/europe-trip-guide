import { useEffect, useState } from 'react'
import { places } from './data/places.js'

const STORAGE_KEY = 'travel-app-trip'
const placeById = Object.fromEntries(places.map((p) => [p.id, p]))

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && Array.isArray(saved.placeIds) && Array.isArray(saved.cityOrder)) {
      const placeIds = saved.placeIds.filter((id) => placeById[id])
      const cityOrder = saved.cityOrder.filter((c) => placeIds.some((id) => placeById[id].cityId === c))
      return { placeIds, cityOrder }
    }
  } catch {
    // Ignore unreadable storage and start with an empty trip.
  }
  return { placeIds: [], cityOrder: [] }
}

// Trip board state: saved places plus the order cities are visited in.
export function useTrip() {
  const [trip, setTrip] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip))
    } catch {
      // Storage unavailable; the trip just won't persist.
    }
  }, [trip])

  const toggle = (placeId) =>
    setTrip(({ placeIds, cityOrder }) => {
      const city = placeById[placeId].cityId
      if (placeIds.includes(placeId)) {
        const next = placeIds.filter((id) => id !== placeId)
        const cityStillUsed = next.some((id) => placeById[id].cityId === city)
        return { placeIds: next, cityOrder: cityStillUsed ? cityOrder : cityOrder.filter((c) => c !== city) }
      }
      return {
        placeIds: [...placeIds, placeId],
        cityOrder: cityOrder.includes(city) ? cityOrder : [...cityOrder, city],
      }
    })

  const moveCity = (cityId, delta) =>
    setTrip(({ placeIds, cityOrder }) => {
      const i = cityOrder.indexOf(cityId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= cityOrder.length) return { placeIds, cityOrder }
      const next = [...cityOrder]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { placeIds, cityOrder: next }
    })

  const clear = () => setTrip({ placeIds: [], cityOrder: [] })

  return {
    savedIds: new Set(trip.placeIds),
    savedPlaces: trip.placeIds.map((id) => placeById[id]),
    cityOrder: trip.cityOrder,
    toggle,
    moveCity,
    clear,
  }
}
