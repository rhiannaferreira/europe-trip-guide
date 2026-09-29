export const interests = [
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'outdoors', label: 'Outdoors', icon: '🌳' },
  { id: 'museums', label: 'Museums', icon: '🏛️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
]

export const places = [
  // Paris
  { id: 'paris-marche-enfants-rouges', city: 'paris', interest: 'food', name: 'Marché des Enfants Rouges', lat: 48.8627, lng: 2.3620, description: 'The oldest covered market in Paris, packed with lunch stalls.' },
  { id: 'paris-buttes-chaumont', city: 'paris', interest: 'outdoors', name: 'Parc des Buttes-Chaumont', lat: 48.8809, lng: 2.3828, description: 'Cliffs, a lake and a temple with views over the city.' },
  { id: 'paris-orsay', city: 'paris', interest: 'museums', name: "Musée d'Orsay", lat: 48.8600, lng: 2.3266, description: 'Impressionist masterpieces in a former railway station.' },
  { id: 'paris-oberkampf', city: 'paris', interest: 'nightlife', name: 'Rue Oberkampf', lat: 48.8652, lng: 2.3787, description: 'A long strip of bars that stays busy late.' },
  // Lisbon
  { id: 'lisbon-time-out', city: 'lisbon', interest: 'food', name: 'Time Out Market', lat: 38.7070, lng: -9.1459, description: "A food hall gathering many of the city's best cooks." },
  { id: 'lisbon-monsanto', city: 'lisbon', interest: 'outdoors', name: 'Monsanto Forest Park', lat: 38.7300, lng: -9.1870, description: 'A huge wooded park with trails and viewpoints.' },
  { id: 'lisbon-azulejo', city: 'lisbon', interest: 'museums', name: 'National Tile Museum', lat: 38.7249, lng: -9.1136, description: 'Five centuries of Portuguese azulejos in a former convent.' },
  { id: 'lisbon-bairro-alto', city: 'lisbon', interest: 'nightlife', name: 'Bairro Alto', lat: 38.7134, lng: -9.1447, description: 'Narrow lanes where the whole neighbourhood becomes one bar.' },
  // Porto
  { id: 'porto-bolhao', city: 'porto', interest: 'food', name: 'Mercado do Bolhão', lat: 41.1496, lng: -8.6060, description: 'The restored central market for cheese, fish and pastries.' },
  { id: 'porto-foz', city: 'porto', interest: 'outdoors', name: 'Foz do Douro', lat: 41.1500, lng: -8.6750, description: 'Seaside promenade where the river meets the Atlantic.' },
  { id: 'porto-serralves', city: 'porto', interest: 'museums', name: 'Serralves Museum', lat: 41.1597, lng: -8.6597, description: 'Contemporary art set in large gardens.' },
  { id: 'porto-galerias', city: 'porto', interest: 'nightlife', name: 'Rua Galeria de Paris', lat: 41.1470, lng: -8.6150, description: 'The heart of the downtown bar scene.' },
  // Barcelona
  { id: 'bcn-boqueria', city: 'barcelona', interest: 'food', name: 'La Boqueria', lat: 41.3817, lng: 2.1716, description: 'Famous market with tapas counters in the middle of the stalls.' },
  { id: 'bcn-bunkers', city: 'barcelona', interest: 'outdoors', name: 'Bunkers del Carmel', lat: 41.4190, lng: 2.1617, description: 'Old anti-aircraft battery with a 360° city view.' },
  { id: 'bcn-picasso', city: 'barcelona', interest: 'museums', name: 'Museu Picasso', lat: 41.3852, lng: 2.1809, description: "Picasso's formative years in medieval palaces." },
  { id: 'bcn-el-born', city: 'barcelona', interest: 'nightlife', name: 'El Born', lat: 41.3850, lng: 2.1830, description: 'Cocktail bars tucked into old stone streets.' },
  // Rome
  { id: 'rome-testaccio', city: 'rome', interest: 'food', name: 'Mercato di Testaccio', lat: 41.8765, lng: 12.4755, description: 'Local market known for its trapizzino and supplì.' },
  { id: 'rome-villa-borghese', city: 'rome', interest: 'outdoors', name: 'Villa Borghese', lat: 41.9142, lng: 12.4923, description: 'Landscaped park with a lake, rowboats and the Pincio terrace.' },
  { id: 'rome-vatican', city: 'rome', interest: 'museums', name: 'Vatican Museums', lat: 41.9065, lng: 12.4536, description: 'Raphael Rooms and the Sistine Chapel.' },
  { id: 'rome-trastevere', city: 'rome', interest: 'nightlife', name: 'Trastevere', lat: 41.8897, lng: 12.4700, description: 'Piazzas full of people with a drink until late.' },
  // Florence
  { id: 'florence-sant-ambrogio', city: 'florence', interest: 'food', name: 'Mercato di Sant\'Ambrogio', lat: 43.7690, lng: 11.2658, description: 'The locals\' market, with a tiny trattoria inside.' },
  { id: 'florence-boboli', city: 'florence', interest: 'outdoors', name: 'Boboli Gardens', lat: 43.7625, lng: 11.2486, description: 'Terraced Renaissance gardens behind Palazzo Pitti.' },
  { id: 'florence-uffizi', city: 'florence', interest: 'museums', name: 'Uffizi Gallery', lat: 43.7678, lng: 11.2553, description: 'Botticelli, Leonardo and Michelangelo under one roof.' },
  { id: 'florence-santo-spirito', city: 'florence', interest: 'nightlife', name: 'Piazza Santo Spirito', lat: 43.7667, lng: 11.2475, description: 'An Oltrarno square that fills up for evening drinks.' },
  // Amsterdam
  { id: 'ams-foodhallen', city: 'amsterdam', interest: 'food', name: 'Foodhallen', lat: 52.3668, lng: 4.8680, description: 'An indoor food market in an old tram depot.' },
  { id: 'ams-vondelpark', city: 'amsterdam', interest: 'outdoors', name: 'Vondelpark', lat: 52.3580, lng: 4.8686, description: "The city's favourite park for cycling and picnics." },
  { id: 'ams-rijksmuseum', city: 'amsterdam', interest: 'museums', name: 'Rijksmuseum', lat: 52.3600, lng: 4.8852, description: 'Rembrandt, Vermeer and the Dutch Golden Age.' },
  { id: 'ams-leidseplein', city: 'amsterdam', interest: 'nightlife', name: 'Leidseplein', lat: 52.3641, lng: 4.8830, description: 'A square of bars, clubs and live music venues.' },
  // Berlin
  { id: 'berlin-markthalle', city: 'berlin', interest: 'food', name: 'Markthalle Neun', lat: 52.5020, lng: 13.4316, description: "Kreuzberg market hall, great for Thursday's Street Food night." },
  { id: 'berlin-tempelhof', city: 'berlin', interest: 'outdoors', name: 'Tempelhofer Feld', lat: 52.4730, lng: 13.4040, description: 'A former airport runway turned into a vast park.' },
  { id: 'berlin-pergamon', city: 'berlin', interest: 'museums', name: 'Museum Island', lat: 52.5169, lng: 13.4019, description: 'Five museums on one island in the Spree.' },
  { id: 'berlin-raw', city: 'berlin', interest: 'nightlife', name: 'RAW-Gelände', lat: 52.5070, lng: 13.4540, description: 'Industrial yard of clubs, bars and open-air stages.' },
  // Prague
  { id: 'prague-naplavka', city: 'prague', interest: 'food', name: 'Náplavka Farmers Market', lat: 50.0700, lng: 14.4140, description: 'Saturday riverside market with local food and drink.' },
  { id: 'prague-petrin', city: 'prague', interest: 'outdoors', name: 'Petřín Hill', lat: 50.0833, lng: 14.3950, description: 'Orchards, gardens and a mini Eiffel Tower lookout.' },
  { id: 'prague-national', city: 'prague', interest: 'museums', name: 'National Museum', lat: 50.0790, lng: 14.4310, description: 'Grand neo-Renaissance building at the top of Wenceslas Square.' },
  { id: 'prague-u-fleku', city: 'prague', interest: 'nightlife', name: 'U Fleků', lat: 50.0786, lng: 14.4169, description: 'Brewery pub pouring its own dark lager since 1499.' },
  // Vienna
  { id: 'vienna-naschmarkt', city: 'vienna', interest: 'food', name: 'Naschmarkt', lat: 48.1985, lng: 16.3630, description: "Vienna's best-known market, with stalls and small restaurants." },
  { id: 'vienna-prater', city: 'vienna', interest: 'outdoors', name: 'Prater', lat: 48.2166, lng: 16.3960, description: 'Wide park with the giant Ferris wheel at one end.' },
  { id: 'vienna-belvedere', city: 'vienna', interest: 'museums', name: 'Belvedere', lat: 48.1916, lng: 16.3808, description: "Baroque palace home to Klimt's The Kiss." },
  { id: 'vienna-bermuda', city: 'vienna', interest: 'nightlife', name: 'Bermuda Triangle', lat: 48.2115, lng: 16.3745, description: 'A tight cluster of bars in the old town.' },
  // Athens
  { id: 'athens-varvakios', city: 'athens', interest: 'food', name: 'Varvakios Agora', lat: 37.9812, lng: 23.7265, description: 'Central meat and fish market ringed by old tavernas.' },
  { id: 'athens-philopappos', city: 'athens', interest: 'outdoors', name: 'Philopappos Hill', lat: 37.9676, lng: 23.7194, description: 'Pine-covered hill with the best view of the Acropolis.' },
  { id: 'athens-acropolis-museum', city: 'athens', interest: 'museums', name: 'Acropolis Museum', lat: 37.9685, lng: 23.7285, description: 'Parthenon sculptures in a glass building below the rock.' },
  { id: 'athens-psyrri', city: 'athens', interest: 'nightlife', name: 'Psyrri', lat: 37.9780, lng: 23.7230, description: 'Bars, rooftops and live rebetiko music late into the night.' },
]
