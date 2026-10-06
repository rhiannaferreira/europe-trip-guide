// What the map key filters by: finer than the six interests, so someone can ask for only restaurants,
// only gelato, only museums. `kind` is the live places service kind asked for when it's the only filter.
export const PIN_KINDS = [
  { id: 'restaurant', label: 'Restaurants', icon: '🍝', kind: 'restaurant', food: true },
  { id: 'cafe', label: 'Cafés', icon: '☕', kind: 'cafe', food: true },
  { id: 'dessert', label: 'Gelato & sweets', icon: '🍨', kind: 'dessert', food: true },
  { id: 'bar', label: 'Bars', icon: '🍷', kind: 'bar', food: true },
  { id: 'museum', label: 'Museums', icon: '🖼️', kind: 'museum' },
  { id: 'sights', label: 'Sights', icon: '🏛️', kind: 'sights' },
  { id: 'park', label: 'Parks', icon: '🌳', kind: 'park' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', kind: 'shopping' },
]
export const PIN_KIND_IDS = PIN_KINDS.map((k) => k.id)

const BY_TYPE = {
  restaurant: 'restaurant', 'fast food': 'restaurant', market: 'restaurant',
  cafe: 'cafe', bakery: 'cafe',
  'ice cream': 'dessert', 'sweet shop': 'dessert',
  bar: 'bar', pub: 'bar', 'beer garden': 'bar', club: 'bar',
  museum: 'museum', gallery: 'museum', theatre: 'museum',
  park: 'park', garden: 'park', beach: 'park', viewpoint: 'park', nature: 'park',
  shop: 'shopping', 'shopping centre': 'shopping',
}
const BY_CATEGORY = { food: 'restaurant', nightlife: 'bar', museums: 'museum', outdoors: 'park', history: 'sights', shopping: 'shopping' }

// Which filter a place falls under (null for hotels, stations and the like).
export const pinKind = (p) => BY_TYPE[p?.type] || BY_CATEGORY[p?.category] || null
