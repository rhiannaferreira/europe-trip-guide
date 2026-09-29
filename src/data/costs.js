// Rough daily cost levels for planning. Hardcoded sample values in euros, NOT live prices.
//
// Each city in cities.js has costLevel 1, 2 or 3, which maps to one of these levels.
//   room   one double room per night (mid-range for the level)
//   food   one person, per day (breakfast, lunch, dinner, a coffee)
//   local  one person, per day of local transport (metro, tram, bus)
export const COST_LEVELS = {
  1: { level: 1, label: 'Budget', room: 70, food: 30, local: 6 },
  2: { level: 2, label: 'Moderate', room: 120, food: 45, local: 8 },
  3: { level: 3, label: 'Expensive', room: 190, food: 65, local: 10 },
}

// One person's rough day in a city: half a double room plus food and local transport.
export const perPersonDay = (level) => Math.round(level.room / 2 + level.food + level.local)

// Rough entry cost per person by a place's costLevel (0 free, 1–3 $ to $$$).
export const PLACE_COST_EUR = { 0: 0, 1: 10, 2: 20, 3: 35 }

// Rough train fare between cities: about €0.14 per km, at least €10. Real fares vary a lot with booking time.
export const TRAIN_EUR_PER_KM = 0.14
export const TRAIN_MIN_EUR = 10

// Currencies you can budget in. Rates are fixed, rough conversions from euros, not live exchange rates.
export const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', perEuro: 1 },
  USD: { code: 'USD', symbol: '$', perEuro: 1.1 },
  GBP: { code: 'GBP', symbol: '£', perEuro: 0.85 },
}

export const BUDGET_CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation', icon: '🛏️' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'transportation', label: 'Transportation', icon: '🚆' },
  { id: 'attractions', label: 'Attractions', icon: '🎟️' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'other', label: 'Other', icon: '📦' },
]
