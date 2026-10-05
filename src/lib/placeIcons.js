// One emoji per kind of place, for map pins and popups. Falls back to the interest's own icon.
import { interestById } from '../data/interests.js'

export const TYPE_ICONS = {
  'ice cream': '🍨', 'sweet shop': '🍬', cafe: '☕', bar: '🍷', pub: '🍺', 'beer garden': '🍺', club: '🪩', restaurant: '🍝', bakery: '🥐', 'fast food': '🥙',
  church: '⛪', museum: '🖼️', gallery: '🖼️', park: '🌳', monument: '🗿', memorial: '🗿', fountain: '⛲', market: '🧺', theatre: '🎭', cinema: '🎬',
  'historic site': '🏛️', landmark: '🏛️', sight: '📸', castle: '🏰', ruins: '🏛️', viewpoint: '🔭', garden: '🌷', beach: '🏖️', shop: '🛍️', 'shopping centre': '🛍️',
  hotel: '🏨', guesthouse: '🏨', hostel: '🛏️', apartment: '🏠', accommodation: '🏨', station: '🚉', stop: '🚏', pharmacy: '💊', hospital: '🏥', clinic: '🩺',
  university: '🎓', college: '🎓', library: '📚', school: '🏫', bank: '🏦', atm: '🏧', post: '📮', police: '🚓', 'tourist information': 'ℹ️', 'government building': '🏛️',
}

export const placeIcon = (p) => TYPE_ICONS[p?.type] || interestById[p?.category]?.icon || '📍'
