// Sample seasonal events. Dates repeat every year as month-day ("MM-DD") and are approximate:
// many events move by a few days each year. An end before the start means it runs over New Year.
//
// Shape: id, name, cityId (from cities.js), start, end, emoji, description
export const events = [
  { id: 'oktoberfest', name: 'Oktoberfest', cityId: 'munich', start: '09-19', end: '10-04', emoji: '🍺', description: 'The world\'s biggest beer festival, on the Theresienwiese.' },
  { id: 'munich-christmas', name: 'Christmas market', cityId: 'munich', start: '11-23', end: '12-24', emoji: '🎄', description: 'Christkindlmarkt on Marienplatz.' },
  { id: 'vienna-christmas', name: 'Christmas markets', cityId: 'vienna', start: '11-14', end: '12-26', emoji: '🎄', description: 'Markets outside the City Hall and Schönbrunn.' },
  { id: 'prague-christmas', name: 'Christmas markets', cityId: 'prague', start: '11-29', end: '01-06', emoji: '🎄', description: 'Old Town Square with a giant tree.' },
  { id: 'brussels-winter', name: 'Winter Wonders', cityId: 'brussels', start: '11-28', end: '01-04', emoji: '🎄', description: 'Christmas market and light show around the Grand-Place.' },
  { id: 'berlin-christmas', name: 'Christmas markets', cityId: 'berlin', start: '11-24', end: '12-31', emoji: '🎄', description: 'Dozens of markets, from Gendarmenmarkt to Charlottenburg.' },
  { id: 'keukenhof', name: 'Tulip season (Keukenhof)', cityId: 'amsterdam', start: '03-19', end: '05-10', emoji: '🌷', description: 'Bulb fields in bloom a short trip from the city.' },
  { id: 'kings-day', name: "King's Day", cityId: 'amsterdam', start: '04-27', end: '04-27', emoji: '👑', description: 'The whole city turns orange, with street markets and boat parties.' },
  { id: 'venice-carnival', name: 'Carnival', cityId: 'venice', start: '01-31', end: '02-17', emoji: '🎭', description: 'Masks, costumes and balls in the run-up to Lent.' },
  { id: 'feria-de-abril', name: 'Feria de Abril', cityId: 'seville', start: '04-19', end: '04-25', emoji: '💃', description: 'A week of flamenco dresses, horses and casetas.' },
  { id: 'la-merce', name: 'La Mercè', cityId: 'barcelona', start: '09-22', end: '09-25', emoji: '🎆', description: 'Human towers, fire runs and free concerts.' },
  { id: 'san-isidro', name: 'San Isidro', cityId: 'madrid', start: '05-13', end: '05-17', emoji: '🎉', description: 'Madrid\'s patron-saint festival, with street parties.' },
  { id: 'santo-antonio', name: 'Festas de Santo António', cityId: 'lisbon', start: '06-12', end: '06-13', emoji: '🐟', description: 'Grilled sardines and street parties in Alfama.' },
  { id: 'sao-joao', name: 'São João', cityId: 'porto', start: '06-23', end: '06-24', emoji: '🎇', description: 'An all-night party with fireworks over the Douro.' },
  { id: 'fete-musique', name: 'Fête de la Musique', cityId: 'paris', start: '06-21', end: '06-21', emoji: '🎶', description: 'Free music on every street corner.' },
  { id: 'edinburgh-fringe', name: 'Edinburgh Festival Fringe', cityId: 'edinburgh', start: '08-07', end: '08-31', emoji: '🎭', description: 'The world\'s largest arts festival. Book rooms early.' },
  { id: 'hogmanay', name: 'Hogmanay', cityId: 'edinburgh', start: '12-30', end: '01-01', emoji: '🎆', description: 'Scotland\'s New Year celebrations and street party.' },
  { id: 'notting-hill', name: 'Notting Hill Carnival', cityId: 'london', start: '08-29', end: '08-31', emoji: '🥁', description: 'Caribbean carnival over the August bank holiday weekend.' },
  { id: 'st-patricks', name: "St Patrick's Festival", cityId: 'dublin', start: '03-15', end: '03-18', emoji: '☘️', description: 'Parade, music and a very green city.' },
  { id: 'galway-arts', name: 'Galway International Arts Festival', cityId: 'galway', start: '07-13', end: '07-26', emoji: '🎨', description: 'Theatre, music and street spectacle.' },
  { id: 'salzburg-festival', name: 'Salzburg Festival', cityId: 'salzburg', start: '07-18', end: '08-31', emoji: '🎻', description: 'Opera, concerts and theatre across the old town.' },
  { id: 'dubrovnik-summer', name: 'Dubrovnik Summer Festival', cityId: 'dubrovnik', start: '07-10', end: '08-25', emoji: '🎭', description: 'Open-air theatre and concerts inside the walls.' },
  { id: 'gentse-feesten', name: 'Gentse Feesten', cityId: 'ghent', start: '07-17', end: '07-26', emoji: '🎪', description: 'Ten days of free music and street theatre.' },
  { id: 'berlin-lights', name: 'Festival of Lights', cityId: 'berlin', start: '10-02', end: '10-11', emoji: '💡', description: 'Landmarks lit up with projections every evening.' },
  { id: 'prague-spring', name: 'Prague Spring Festival', cityId: 'prague', start: '05-12', end: '06-03', emoji: '🎼', description: 'Classical music festival opening with Smetana\'s Má vlast.' },
  { id: 'athens-epidaurus', name: 'Athens Epidaurus Festival', cityId: 'athens', start: '06-01', end: '08-31', emoji: '🏛️', description: 'Performances in ancient theatres, including the Odeon of Herodes Atticus.' },
  { id: 'girona-flors', name: 'Temps de Flors', cityId: 'girona', start: '05-09', end: '05-17', emoji: '💐', description: 'Flower installations fill courtyards across the old town.' },
]

export const eventsInCity = (cityId) => events.filter((e) => e.cityId === cityId)
