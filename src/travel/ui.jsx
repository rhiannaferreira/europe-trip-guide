// Small pieces Travel Mode's screens share.
import { track } from '../lib/analytics.js'
import { directionsUrl } from './travelModel.js'

export const modeIcon = (mode) => ({ bus: '🚌', 'rail + ferry': '⛴️', flight: '✈️' })[mode] || '🚆'
export const modeWord = (mode) => ({ bus: 'Bus', 'rail + ferry': 'Train + ferry', flight: 'Flight' })[mode] || 'Train'

export const modeLabel = (mode) => `${modeIcon(mode)} ${modeWord(mode)}`

export function Directions({ place, className = 'btn tm-btn', label = 'Directions' }) {
  return (
    <a className={className} href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" onClick={() => track('directions_opened', { kind: place.type || 'place' })} aria-label={`${label} to ${place.name} (opens your maps app)`}>
      🧭 {label}
    </a>
  )
}

