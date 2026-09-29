// Sample data until a places API is wired in.
export const countries = [
  {
    code: 'FR',
    name: 'France',
    tips: [
      'Service is included in the bill; rounding up or leaving 1–2 € is a nice extra.',
      'Many museums close on Monday or Tuesday, so check before you go.',
      'Lunch is usually served 12:00–14:00 and many kitchens close in between.',
    ],
  },
  {
    code: 'PT',
    name: 'Portugal',
    tips: [
      'Tipping is modest: 5–10% in restaurants if service was good.',
      'The bread and olives brought to your table are charged if you eat them.',
      'Most national museums close on Monday.',
    ],
  },
  {
    code: 'ES',
    name: 'Spain',
    tips: [
      'Tipping is optional; leaving small change is common.',
      'Dinner rarely starts before 21:00.',
      'Smaller shops may close for a siesta around 14:00–17:00.',
    ],
  },
  {
    code: 'IT',
    name: 'Italy',
    tips: [
      'A "coperto" cover charge per person is normal; tipping beyond it is optional.',
      'Coffee at the bar is cheaper than sitting at a table.',
      'Churches expect covered shoulders and knees.',
    ],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    tips: [
      'Rounding up or 5–10% is appreciated but not expected.',
      'Many places are card-only, so cash is rarely needed.',
      'Stay off the red bike lanes when walking.',
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    tips: [
      'Tell the server the total you want to pay, rounding up 5–10%.',
      'Most shops close on Sunday.',
      'Cash is still preferred in many smaller bars and cafes.',
    ],
  },
  {
    code: 'CZ',
    name: 'Czechia',
    tips: [
      'Around 10% is a normal tip in restaurants.',
      'Pay in koruna; paying in euros usually gets a poor rate.',
      'Beer is often cheaper than water, and refills arrive unasked.',
    ],
  },
  {
    code: 'AT',
    name: 'Austria',
    tips: [
      'Round up or add 5–10%, stated when you pay.',
      'Most shops close on Sunday.',
      'Coffee houses expect you to linger; nobody will rush you.',
    ],
  },
  {
    code: 'GR',
    name: 'Greece',
    tips: [
      'Rounding up or leaving 5–10% is customary in tavernas.',
      'Major archaeological sites close early in winter, often by 15:00–17:00.',
      'Many shops close on Sunday and some take a long afternoon break.',
    ],
  },
]

export const cities = [
  { id: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522, blurb: 'Bistros, boulevards and world-class art.' },
  { id: 'lisbon', name: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393, blurb: 'Hilly streets, tiled facades and Atlantic light.' },
  { id: 'porto', name: 'Porto', country: 'PT', lat: 41.1579, lng: -8.6291, blurb: 'Port cellars and riverside terraces.' },
  { id: 'barcelona', name: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686, blurb: 'Gaudí, beaches and late dinners.' },
  { id: 'rome', name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964, blurb: 'Ancient ruins and trattorias on every corner.' },
  { id: 'florence', name: 'Florence', country: 'IT', lat: 43.7696, lng: 11.2558, blurb: 'Renaissance art, Tuscan food and terracotta rooftops.' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041, blurb: 'Canals, bikes and Dutch masters.' },
  { id: 'berlin', name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405, blurb: 'History, galleries and all-night clubs.' },
  { id: 'prague', name: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378, blurb: 'Gothic spires and legendary beer halls.' },
  { id: 'vienna', name: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738, blurb: 'Coffee houses, palaces and concert halls.' },
  { id: 'athens', name: 'Athens', country: 'GR', lat: 37.9838, lng: 23.7275, blurb: 'Ancient ruins above lively neighbourhoods.' },
]

export const cityById = Object.fromEntries(cities.map((c) => [c.id, c]))
export const countryByCode = Object.fromEntries(countries.map((c) => [c.code, c]))
