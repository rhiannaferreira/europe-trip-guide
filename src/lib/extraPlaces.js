// The extra-places registry (extraPlacesCore.js) plus the React hook that follows it.
import { useSyncExternalStore } from 'react'
import { placesVersion, subscribePlaces } from './extraPlacesCore.js'

export * from './extraPlacesCore.js'

// Changes whenever places are added, for components that list places.
export function usePlacesVersion() {
  return useSyncExternalStore(subscribePlaces, placesVersion)
}
