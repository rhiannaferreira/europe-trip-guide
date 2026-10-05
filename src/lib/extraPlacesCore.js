// (No React here, so non-React code and tests can use it; the hook is in extraPlaces.js.)
// Places that come from OpenStreetMap while the app runs, on top of the built-in places in data/places.js:
// notable places from Overpass (source 'osm') and live search results (source 'live', from the live data
// layer in services/live/). Both use the OpenStreetMap id, so the same place is never listed twice; a live
// copy upgrades an Overpass one with its address, hours and contact details.
//
// Once registered, an extra place behaves like any other: it shows in lists and on the map, can be
// saved, put on a day and shared. The extra places a trip uses are kept in localStorage
// (travel-app-extra-places) so a saved trip still has them after a reload, even offline.
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
    source: p.source === 'live' ? 'live' : 'osm',
    rating: null,
    costLevel: null,
    image: null,
    ...liveFields(p),
  }
}

// The snapshot a live place keeps (Geoapify's terms allow storing it): stable details, plus where it came
// from and when, so dynamic details can be refreshed later. Only fields that exist.
const LIVE_TEXT = ['provider', 'providerId', 'retrievedAt', 'address', 'cuisine', 'openingHours', 'phone', 'wheelchair']
function liveFields(p) {
  if (p.source !== 'live') return {}
  const out = {}
  for (const k of LIVE_TEXT) if (typeof p[k] === 'string' && p[k].trim()) out[k] = p[k].slice(0, 300)
  return out
}

export function registerPlaces(list) {
  let added = 0
  for (const raw of Array.isArray(list) ? list : []) {
    const p = clean(raw)
    if (!p) continue
    const existing = placeById[p.id]
    if (existing) {
      // A live copy refreshes an extra place (never a built-in one).
      if (p.source === 'live' && extraIds.has(p.id)) {
        Object.assign(existing, p, { latitude: p.lat, longitude: p.lng })
        added++
      }
      continue
    }
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
  ...(p.source === 'live' ? { source: 'live', ...liveFields(p) } : {}),
})

// The extra places a trip uses, in the compact form that's stored and shared.
export function extraPlacesInTrip(trip) {
  return trip.stops.flatMap((s) => s.placeIds).filter(isExtraPlace).map((id) => stored(placeById[id]))
}

export const persistTripPlaces = (trip) => writeJSON(KEYS.extraPlaces, extraPlacesInTrip(trip))

// For usePlacesVersion (extraPlaces.js): subscribe to additions, and read the current version.
export function subscribePlaces(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const placesVersion = () => version

// Places a saved trip uses must exist before the trip loads, or loading would drop them.
registerPlaces(readJSON(KEYS.extraPlaces, []))
