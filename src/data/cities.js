import { trainTimes } from './trainTimes.js'

// Sample cities until a places API is wired in.
//
// Shape of a city:
//   id, name, country (code from countries.js), lat, lng
//   description   one or two sentences
//   image         photo URL, or null to show the illustrated tile
//   emoji         used on the illustrated tile
//   interests     the interests the city is best known for (ids from interests.js)
//   costLevel     1–3 ($ to $$$), a rough guide to day-to-day prices
//   seasons       month numbers (1–12): bestWeather, busy, lowerCost, plus special seasons
//   hiddenGems    ids of less crowded alternatives (cities in this file)
//   hiddenGem     true for the alternatives themselves
//   recommendedDays  [min, max] typical stay in days (a rough guide)
//   beach         true if there's a beach in or right by the city
//   size          'major' for big-name cities, 'small' for smaller cities and towns
//
// Added automatically below:
//   bestMonths         the same months as seasons.bestWeather
//   trainConnectivity  how many direct sample connections the city has in trainTimes.js
export const cities = [
  // France
  {
    id: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522,
    description: 'Bistros, boulevards and world-class art, with a neighbourhood café on every corner.',
    image: null, emoji: '🗼', interests: ['food', 'museums', 'history', 'nightlife'], costLevel: 3,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [6, 7, 8], lowerCost: [1, 2, 11], special: [{ label: 'Christmas lights', months: [12] }] },
    hiddenGems: ['rouen', 'reims', 'chartres'], hiddenGem: false,
    recommendedDays: [3, 5], beach: false, size: 'major',
  },
  {
    id: 'rouen', name: 'Rouen', country: 'FR', lat: 49.4432, lng: 1.0999,
    description: 'Half-timbered streets, the cathedral Monet painted, and Joan of Arc history, 80 minutes from Paris.',
    image: null, emoji: '⛪', interests: ['history', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 1], beach: false, size: 'small',
  },
  {
    id: 'reims', name: 'Reims', country: 'FR', lat: 49.2583, lng: 4.0317,
    description: 'Champagne cellars under the streets and a Gothic cathedral where French kings were crowned.',
    image: null, emoji: '🥂', interests: ['food', 'history'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8, 12], lowerCost: [1, 2, 3], special: [{ label: 'Grape harvest', months: [9] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 1], beach: false, size: 'small',
  },
  {
    id: 'chartres', name: 'Chartres', country: 'FR', lat: 48.4439, lng: 1.4890,
    description: 'A small town built around one of Europe\'s finest stained-glass cathedrals.',
    image: null, emoji: '🪟', interests: ['history'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 11], special: [{ label: 'Chartres en Lumières', months: [4, 5, 6, 7, 8, 9, 10, 11, 12] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 1], beach: false, size: 'small',
  },

  // Italy
  {
    id: 'rome', name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964,
    description: 'Ancient ruins, baroque piazzas and trattorias on every corner.',
    image: null, emoji: '🏛️', interests: ['history', 'food', 'museums'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [4, 5, 6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [3, 4], beach: false, size: 'major',
  },
  {
    id: 'florence', name: 'Florence', country: 'IT', lat: 43.7696, lng: 11.2558,
    description: 'Renaissance art, Tuscan food and terracotta rooftops.',
    image: null, emoji: '🎨', interests: ['museums', 'history', 'food', 'shopping'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [5, 6, 7, 8, 9], lowerCost: [1, 2, 11] },
    hiddenGems: ['lucca'], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },
  {
    id: 'lucca', name: 'Lucca', country: 'IT', lat: 43.8429, lng: 10.5027,
    description: 'A walled Tuscan town where you can cycle the ramparts and eat well without the Florence crowds.',
    image: null, emoji: '🚲', interests: ['history', 'outdoors', 'food'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'venice', name: 'Venice', country: 'IT', lat: 45.4408, lng: 12.3155,
    description: 'Canals, palaces and islands. Magical early and late in the day, very busy in between.',
    image: null, emoji: '🛶', interests: ['history', 'museums', 'food'], costLevel: 3,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [2, 5, 6, 7, 8, 9], lowerCost: [1, 11, 12], special: [{ label: 'Carnival', months: [2] }, { label: 'Biennale', months: [5, 6, 7, 8, 9, 10, 11] }] },
    hiddenGems: ['chioggia', 'treviso'], hiddenGem: false,
    recommendedDays: [2, 3], beach: true, size: 'major',
  },
  {
    id: 'chioggia', name: 'Chioggia', country: 'IT', lat: 45.2186, lng: 12.2797,
    description: 'A fishing town on the lagoon with canals and colourful houses, often called "little Venice".',
    image: null, emoji: '🐟', interests: ['food', 'outdoors'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11], special: [{ label: 'Palio della Marciliana', months: [6] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 1], beach: true, size: 'small',
  },
  {
    id: 'treviso', name: 'Treviso', country: 'IT', lat: 45.6669, lng: 12.2430,
    description: 'Quiet canals, frescoed arcades and the home of tiramisù, 30 minutes by train from Venice.',
    image: null, emoji: '🍰', interests: ['food', 'history'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Spain
  {
    id: 'barcelona', name: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686,
    description: 'Gaudí, beaches and late dinners.',
    image: null, emoji: '🏖️', interests: ['food', 'nightlife', 'history', 'outdoors'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: ['girona'], hiddenGem: false,
    recommendedDays: [3, 4], beach: true, size: 'major',
  },
  {
    id: 'girona', name: 'Girona', country: 'ES', lat: 41.9794, lng: 2.8214,
    description: 'Colourful riverside houses, a medieval Jewish quarter and superb restaurants, 40 minutes from Barcelona.',
    image: null, emoji: '🏘️', interests: ['history', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 11], special: [{ label: 'Temps de Flors flower festival', months: [5] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'madrid', name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038,
    description: 'Big-name art museums, leafy parks and a tapas crawl that starts late and ends later.',
    image: null, emoji: '🖼️', interests: ['museums', 'food', 'nightlife'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [5, 6, 9], lowerCost: [1, 2, 8] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },
  {
    id: 'seville', name: 'Seville', country: 'ES', lat: 37.3891, lng: -5.9845,
    description: 'Orange trees, flamenco and Moorish palaces. Very hot in high summer.',
    image: null, emoji: '💃', interests: ['history', 'nightlife', 'food'], costLevel: 2,
    seasons: { bestWeather: [3, 4, 5, 10, 11], busy: [3, 4, 5], lowerCost: [1, 7, 8], special: [{ label: 'Semana Santa and Feria de Abril', months: [3, 4] }] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },

  // Portugal
  {
    id: 'lisbon', name: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393,
    description: 'Hilly streets, tiled facades and Atlantic light.',
    image: null, emoji: '🚋', interests: ['food', 'nightlife', 'history'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: ['coimbra'], hiddenGem: false,
    recommendedDays: [3, 4], beach: true, size: 'major',
  },
  {
    id: 'porto', name: 'Porto', country: 'PT', lat: 41.1579, lng: -8.6291,
    description: 'Port cellars and riverside terraces.',
    image: null, emoji: '🍷', interests: ['food', 'history', 'outdoors'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: ['coimbra'], hiddenGem: false,
    recommendedDays: [2, 3], beach: true, size: 'major',
  },
  {
    id: 'coimbra', name: 'Coimbra', country: 'PT', lat: 40.2033, lng: -8.4103,
    description: 'An old university town on a hill, with student fado and a baroque library, between Lisbon and Porto.',
    image: null, emoji: '📚', interests: ['history', 'nightlife'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [5, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Germany
  {
    id: 'berlin', name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405,
    description: 'History, galleries and all-night clubs.',
    image: null, emoji: '🐻', interests: ['history', 'museums', 'nightlife'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: ['leipzig'], hiddenGem: false,
    recommendedDays: [3, 4], beach: false, size: 'major',
  },
  {
    id: 'leipzig', name: 'Leipzig', country: 'DE', lat: 51.3397, lng: 12.3731,
    description: 'Bach\'s city, reborn as a creative hub with cheap rents, lakes and a big arts scene.',
    image: null, emoji: '🎼', interests: ['museums', 'nightlife', 'history'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [6, 12], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'munich', name: 'Munich', country: 'DE', lat: 48.1351, lng: 11.582,
    description: 'Beer gardens, baroque churches and the Alps on the horizon.',
    image: null, emoji: '🍺', interests: ['food', 'nightlife', 'museums', 'outdoors'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 9, 10, 12], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },

  // Netherlands
  {
    id: 'amsterdam', name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041,
    description: 'Canals, bikes and Dutch masters.',
    image: null, emoji: '🌷', interests: ['museums', 'nightlife', 'outdoors', 'shopping'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [4, 7, 8], lowerCost: [1, 2], special: [{ label: 'Tulip season', months: [3, 4, 5] }] },
    hiddenGems: ['utrecht'], hiddenGem: false,
    recommendedDays: [2, 4], beach: false, size: 'major',
  },
  {
    id: 'utrecht', name: 'Utrecht', country: 'NL', lat: 52.0907, lng: 5.1214,
    description: 'Two-level canals lined with cellar cafés, a student buzz and far fewer tour groups than Amsterdam.',
    image: null, emoji: '🚲', interests: ['food', 'history', 'nightlife'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Belgium
  {
    id: 'brussels', name: 'Brussels', country: 'BE', lat: 50.8503, lng: 4.3517,
    description: 'Grand squares, art nouveau, comic murals and very serious chocolate.',
    image: null, emoji: '🍫', interests: ['food', 'history', 'museums', 'shopping'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8, 12], lowerCost: [1, 2, 3] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [1, 2], beach: false, size: 'major',
  },
  {
    id: 'bruges', name: 'Bruges', country: 'BE', lat: 51.2093, lng: 3.2247,
    description: 'A perfectly preserved medieval canal town, crowded with day-trippers at midday.',
    image: null, emoji: '🏰', interests: ['history', 'food'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [5, 6, 7, 8, 12], lowerCost: [1, 2, 3] },
    hiddenGems: ['ghent'], hiddenGem: false,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'ghent', name: 'Ghent', country: 'BE', lat: 51.0543, lng: 3.7174,
    description: 'Medieval guildhalls, a castle in the middle of town and a lively student nightlife.',
    image: null, emoji: '🏯', interests: ['history', 'nightlife', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7], lowerCost: [1, 2, 3, 11], special: [{ label: 'Gentse Feesten', months: [7] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Switzerland
  {
    id: 'zurich', name: 'Zurich', country: 'CH', lat: 47.3769, lng: 8.5417,
    description: 'A lakeside city with swimming spots in summer, an old town and some of Europe\'s best trains.',
    image: null, emoji: '🏔️', interests: ['outdoors', 'shopping', 'museums'], costLevel: 3,
    seasons: { bestWeather: [6, 7, 8, 9], busy: [7, 8, 12], lowerCost: [3, 4, 11] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [1, 2], beach: false, size: 'major',
  },
  {
    id: 'lucerne', name: 'Lucerne', country: 'CH', lat: 47.0502, lng: 8.3093,
    description: 'Wooden bridges, a mountain lake and easy trips up Rigi and Pilatus.',
    image: null, emoji: '⛰️', interests: ['outdoors', 'history'], costLevel: 3,
    seasons: { bestWeather: [6, 7, 8, 9], busy: [6, 7, 8], lowerCost: [3, 4, 11] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Austria
  {
    id: 'vienna', name: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738,
    description: 'Coffee houses, palaces and concert halls.',
    image: null, emoji: '🎻', interests: ['museums', 'history', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [6, 7, 8, 12], lowerCost: [1, 2, 3], special: [{ label: 'Christmas markets', months: [11, 12] }, { label: 'Ball season', months: [1, 2] }] },
    hiddenGems: ['graz'], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },
  {
    id: 'graz', name: 'Graz', country: 'AT', lat: 47.0707, lng: 15.4395,
    description: 'Austria\'s second city: red rooftops, a clock tower on a hill and a relaxed southern feel.',
    image: null, emoji: '🕰️', interests: ['history', 'food', 'outdoors'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'salzburg', name: 'Salzburg', country: 'AT', lat: 47.8095, lng: 13.055,
    description: 'Mozart\'s birthplace: baroque domes under a hilltop fortress, with the Alps close by.',
    image: null, emoji: '🎶', interests: ['history', 'outdoors', 'museums'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8, 12], lowerCost: [1, 2, 3, 11], special: [{ label: 'Salzburg Festival', months: [7, 8] }] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Czech Republic
  {
    id: 'prague', name: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378,
    description: 'Gothic spires and legendary beer halls.',
    image: null, emoji: '🍻', interests: ['history', 'nightlife', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 9], busy: [5, 6, 7, 8, 12], lowerCost: [1, 2, 3, 11], special: [{ label: 'Christmas markets', months: [12] }] },
    hiddenGems: ['brno'], hiddenGem: false,
    recommendedDays: [2, 4], beach: false, size: 'major',
  },
  {
    id: 'brno', name: 'Brno', country: 'CZ', lat: 49.1951, lng: 16.6068,
    description: 'Functionalist architecture, a cocktail-bar scene and Moravian wine country on the doorstep.',
    image: null, emoji: '🍸', interests: ['nightlife', 'history', 'food'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11], special: [{ label: 'Wine harvest', months: [9, 10] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },

  // Greece
  {
    id: 'athens', name: 'Athens', country: 'GR', lat: 37.9838, lng: 23.7275,
    description: 'Ancient ruins above lively neighbourhoods.',
    image: null, emoji: '🏺', interests: ['history', 'museums', 'nightlife', 'food'], costLevel: 2,
    seasons: { bestWeather: [4, 5, 6, 9, 10], busy: [6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: ['thessaloniki'], hiddenGem: false,
    recommendedDays: [2, 3], beach: true, size: 'major',
  },
  {
    id: 'thessaloniki', name: 'Thessaloniki', country: 'GR', lat: 40.6401, lng: 22.9444,
    description: 'A seafront city with Byzantine churches and arguably Greece\'s best food scene.',
    image: null, emoji: '🌊', interests: ['food', 'history', 'nightlife'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [2, 3], beach: false, size: 'small',
  },

  // Croatia
  {
    id: 'dubrovnik', name: 'Dubrovnik', country: 'HR', lat: 42.6507, lng: 18.0944,
    description: 'Marble streets inside massive sea walls. Cruise ships make summer middays very crowded.',
    image: null, emoji: '🏰', interests: ['history', 'outdoors'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [6, 7, 8, 9], lowerCost: [1, 2, 3, 11], special: [{ label: 'Summer Festival', months: [7, 8] }] },
    hiddenGems: ['sibenik'], hiddenGem: false,
    recommendedDays: [2, 3], beach: true, size: 'small',
  },
  {
    id: 'sibenik', name: 'Šibenik', country: 'HR', lat: 43.7350, lng: 15.8952,
    description: 'Stone lanes, two UNESCO sites and a base for Krka\'s waterfalls, with a fraction of Dubrovnik\'s crowds.',
    image: null, emoji: '💧', interests: ['history', 'outdoors'], costLevel: 1,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: true, size: 'small',
  },
  {
    id: 'split', name: 'Split', country: 'HR', lat: 43.5081, lng: 16.4402,
    description: 'A Roman emperor\'s palace turned old town, and the ferry hub for the islands.',
    image: null, emoji: '⛵', interests: ['history', 'outdoors', 'nightlife'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 9, 10], busy: [7, 8], lowerCost: [1, 2, 3, 11] },
    hiddenGems: ['sibenik'], hiddenGem: false,
    recommendedDays: [2, 3], beach: true, size: 'small',
  },

  // United Kingdom
  {
    id: 'london', name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278,
    description: 'Free world-class museums, markets, parks and theatre, all a Tube ride apart.',
    image: null, emoji: '🎡', interests: ['museums', 'shopping', 'nightlife', 'food', 'history'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [6, 7, 8, 12], lowerCost: [1, 2, 11] },
    hiddenGems: ['york'], hiddenGem: false,
    recommendedDays: [3, 5], beach: false, size: 'major',
  },
  {
    id: 'york', name: 'York', country: 'GB', lat: 53.9600, lng: -1.0873,
    description: 'Roman walls, a vast Gothic minster and crooked medieval streets, under two hours from London.',
    image: null, emoji: '🧱', interests: ['history', 'museums'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8, 12], lowerCost: [1, 2, 3, 11] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [1, 2], beach: false, size: 'small',
  },
  {
    id: 'edinburgh', name: 'Edinburgh', country: 'GB', lat: 55.9533, lng: -3.1883,
    description: 'A castle on a volcanic rock, a medieval Old Town and hills to climb right in the city.',
    image: null, emoji: '🏴', interests: ['history', 'outdoors', 'nightlife'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8], busy: [8, 12], lowerCost: [1, 2, 3, 11], special: [{ label: 'Festival Fringe', months: [8] }, { label: 'Hogmanay', months: [12] }] },
    hiddenGems: [], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },

  // Ireland
  {
    id: 'dublin', name: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603,
    description: 'Georgian squares, literary history and pubs with live music most nights.',
    image: null, emoji: '☘️', interests: ['nightlife', 'history', 'museums'], costLevel: 3,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [3, 6, 7, 8], lowerCost: [1, 2, 11] },
    hiddenGems: ['galway'], hiddenGem: false,
    recommendedDays: [2, 3], beach: false, size: 'major',
  },
  {
    id: 'galway', name: 'Galway', country: 'IE', lat: 53.2707, lng: -9.0568,
    description: 'A colourful harbour town full of trad music, and the gateway to Connemara and the Aran Islands.',
    image: null, emoji: '🎻', interests: ['nightlife', 'outdoors', 'food'], costLevel: 2,
    seasons: { bestWeather: [5, 6, 7, 8, 9], busy: [7, 8], lowerCost: [1, 2, 3, 11], special: [{ label: 'Galway Arts Festival', months: [7] }] },
    hiddenGems: [], hiddenGem: true,
    recommendedDays: [2, 3], beach: true, size: 'small',
  },
]

for (const c of cities) {
  c.bestMonths = c.seasons.bestWeather
  c.trainConnectivity = trainTimes.filter((t) => t.from === c.id || t.to === c.id).length
}

export const cityById = Object.fromEntries(cities.map((c) => [c.id, c]))
export const getCity = (id) => cityById[id]
export const citiesInCountry = (code) => cities.filter((c) => c.country === code)
export const hiddenGemsFor = (city) => city.hiddenGems.map(getCity).filter(Boolean)
// The famous cities a hidden gem is an alternative to.
export const gemAlternativeTo = (gemId) => cities.filter((c) => c.hiddenGems.includes(gemId))
