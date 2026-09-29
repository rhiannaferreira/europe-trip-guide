// Places that come from OpenStreetMap while the app runs, on top of the built-in places in data/places.js.
//
// Once registered, an extra place behaves like any other: it shows in lists and on the map, can be
// saved, put on a day and shared. The extra places a trip uses are kept in localStorage
// (travel-app-extra-places) so a saved trip still has them after a reload, even offline.
import { useSyncExternalStore } from 'react'
import { cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { placeById, places } from '../data/places.js'
import { indexPlace } from './search.js'
import { KEYS, readJSON, writeJSON } from './storage.js'

const extraIds = new Set()
const listeners = new Set()
let version = 0

const isNum = (n) => typeof n === 'number' && Number.isFinite(n)

// Only the fields the app needs, checked, so a bad stored or shared value can't break anything.
function clean(p) {
  if (!p || typeof p.id !== 'string' || !p.id.startsWith('osm-') || !cityById[p.cityId] || !interestById[p.category]) return null
  if (!isNum(p.lat) || !isNum(p.lng) || typeof p.name !== 'string' || !p.name.trim()) return null
  const str = (v) => (typeof v === 'string' ? v.slice(0, 300) : '')
  return {
    id: p.id,
    cityId: p.cityId,
    category: p.category,
    type: str(p.type) || 'place',
    name: p.name.slice(0, 120),
    lat: p.lat,
    lng: p.lng,
    description: str(p.description),
    wiki: str(p.wiki) || null,
    osmUrl: str(p.osmUrl) || null,
    website: /^https?:\/\//.test(p.website || '') ? str(p.website) : null,
    source: 'osm',
    rating: null,
    costLevel: null,
    image: null,
  }
}

export function registerPlaces(list) {
  let added = 0
  for (const raw of Array.isArray(list) ? list : []) {
    const p = clean(raw)
    if (!p || placeById[p.id]) continue
    const place = { ...p, latitude: p.lat, longitude: p.lng, estimatedCost: 0 }
    places.push(place)
    placeById[place.id] = place
    extraIds.add(place.id)
    indexPlace(place)
    added++
  }
  if (added) {
    version++
    listeners.forEach((fn) => fn())
  }
  return added
}

export const isExtraPlace = (id) => extraIds.has(id)

const stored = (p) => ({
  id: p.id,
  cityId: p.cityId,
  category: p.category,
  type: p.type,
  name: p.name,
  lat: p.lat,
  lng: p.lng,
  description: p.description,
  wiki: p.wiki,
  osmUrl: p.osmUrl,
  website: p.website,
})

// The extra places a trip uses, in the compact form that's stored and shared.
export function extraPlacesInTrip(trip) {
  return trip.stops.flatMap((s) => s.placeIds).filter(isExtraPlace).map((id) => stored(placeById[id]))
}

export const persistTripPlaces = (trip) => writeJSON(KEYS.extraPlaces, extraPlacesInTrip(trip))

// Changes whenever places are added, for components that list places.
export function usePlacesVersion() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => version,
  )
}

// Places a saved trip uses must exist before the trip loads, or loading would drop them.
registerPlaces(readJSON(KEYS.extraPlaces, []))
