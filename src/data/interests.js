// Interest categories. `keywords` let search terms like "restaurants" or "parks" match a category.
export const interests = [
  { id: 'food', label: 'Food', icon: '🍽️', keywords: ['restaurant', 'restaurants', 'eat', 'market', 'cafe', 'food'] },
  { id: 'outdoors', label: 'Outdoors', icon: '🌳', keywords: ['outdoor', 'outdoors', 'park', 'parks', 'hike', 'nature', 'beach', 'garden', 'viewpoint'] },
  { id: 'museums', label: 'Museums', icon: '🖼️', keywords: ['museum', 'museums', 'gallery', 'art'] },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙', keywords: ['bar', 'bars', 'club', 'pub', 'nightlife', 'music'] },
  { id: 'history', label: 'History', icon: '🏰', keywords: ['history', 'historic', 'castle', 'ruins', 'cathedral', 'church', 'palace', 'landmark'] },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', keywords: ['shop', 'shops', 'shopping', 'boutique', 'design', 'store'] },
]

export const interestById = Object.fromEntries(interests.map((i) => [i.id, i]))

