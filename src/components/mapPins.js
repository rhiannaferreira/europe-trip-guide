// Map pins as small HTML icons: a coloured disc with the place's emoji. EuroWander's own picks are
// filled and larger; live places from OpenStreetMap are white with a coloured ring, so the two read
// apart at a glance. Icons are cached, since Leaflet only needs one object per look.
import L from 'leaflet'
import { placeIcon } from '../lib/placeIcons.js'

export const interestColors = {
  food: '#d9623f',
  outdoors: '#238a7e',
  museums: '#6a4c93',
  nightlife: '#2f5566',
  history: '#9a6a2f',
  shopping: '#c2417a',
}

const cache = new Map()

// variant: 'guide' | 'live'; state: '' | 'saved' | 'dim' | 'top' (a well-known live place: bigger, gold ring)
export function pinIcon(place, variant, state = '') {
  const emoji = placeIcon(place)
  const color = interestColors[place.category] || '#5e6b77'
  const key = `${variant}|${state}|${color}|${emoji}`
  let icon = cache.get(key)
  if (!icon) {
    const size = variant === 'guide' ? 32 : state === 'top' ? 30 : 24
    icon = L.divIcon({
      className: 'pin-wrap',
      html: `<span class="pin pin-${variant}${state ? ` pin-${state}` : ''}" style="--pin:${color}" aria-hidden="true">${emoji}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      tooltipAnchor: [0, -size / 2],
    })
    cache.set(key, icon)
  }
  return icon
}
