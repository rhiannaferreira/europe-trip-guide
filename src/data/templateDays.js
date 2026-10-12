// Day-by-day ideas for the ready-made trips (tripTemplates.js). Only a template's own page loads this file.
//
// CITY_DAYS: for each city, the days a template spends there, in order. Every template that visits the
// city uses the same outline (a 2-night stop takes the first two days), so variants never repeat data.
//   title    what the day is about
//   places   Eurowander places (ids from places.js): they become the day's plan in a copied trip
//   ideas    other stable sights and things to do, as plain text: they go into the day's note
// Day 1 is always light, because it's often an arrival day. Nothing is scheduled by the hour, nothing
// is a restaurant that might close, and there are no prices or ratings: those come from the app.
//
// TEMPLATE_DETAILS: per template, a short intro and its highlights.
export const CITY_DAYS = {
  rome: [
    { title: 'Historic centre walk', places: [], ideas: ['Pantheon', 'Piazza Navona', 'Trevi Fountain', 'Dinner nearby'] },
    { title: 'Ancient Rome', places: ['rome-forum', 'rome-monti'], ideas: ['Colosseum (book a time slot)', 'Evening in Monti'] },
    { title: 'Vatican and Trastevere', places: ['rome-vatican', 'rome-trastevere'], ideas: ['St Peter’s Basilica', 'Sunset over the Tiber'] },
    { title: 'Markets and gardens', places: ['rome-testaccio', 'rome-villa-borghese'], ideas: ['Borghese Gallery (book ahead)'] },
  ],
  florence: [
    { title: 'First look at Florence', places: ['florence-duomo'], ideas: ['Piazza della Signoria', 'Ponte Vecchio at dusk'] },
    { title: 'Renaissance art', places: ['florence-uffizi', 'florence-sant-ambrogio'], ideas: ['Accademia for Michelangelo’s David (book ahead)'] },
    { title: 'Oltrarno', places: ['florence-boboli', 'florence-oltrarno-artisans', 'florence-santo-spirito'], ideas: ['Piazzale Michelangelo for sunset'] },
  ],
  venice: [
    { title: 'Getting lost on purpose', places: [], ideas: ['Vaporetto line 1 down the Grand Canal', 'St Mark’s Square in the evening'] },
    { title: 'St Mark’s and the Rialto', places: ['venice-doges-palace', 'venice-rialto-market'], ideas: ['St Mark’s Basilica', 'Cicchetti in a bacaro'] },
    { title: 'Dorsoduro and the lagoon', places: ['venice-accademia', 'venice-campo-santa-margherita'], ideas: ['Zattere waterfront walk'] },
    { title: 'Islands', places: ['venice-murano-glass', 'venice-giardini'], ideas: ['Burano’s coloured houses'] },
  ],
  lucca: [
    { title: 'Inside the walls', places: ['lucca-anfiteatro'], ideas: ['San Michele in Foro', 'Evening passeggiata'] },
    { title: 'Walls and towers', places: ['lucca-walls', 'lucca-guinigi'], ideas: ['Rent a bike for the walls loop'] },
    { title: 'Day trip by train', places: [], ideas: ['Pisa’s Field of Miracles, 30 minutes away', 'Or a slow day in the old town'] },
  ],
  treviso: [
    { title: 'Canals and porticoes', places: ['treviso-canals'], ideas: ['Piazza dei Signori'] },
    { title: 'Tiramisù and the Veneto', places: ['treviso-tiramisu'], ideas: ['Fish market island (Isola della Pescheria)', 'Prosecco hills by train or bus'] },
  ],
  chioggia: [
    { title: 'The little Venice', places: ['chioggia-fish-market'], ideas: ['Corso del Popolo', 'Canal-side evening walk'] },
    { title: 'Beach and lagoon', places: ['chioggia-sottomarina'], ideas: ['Boat across the lagoon to Pellestrina and the Lido'] },
  ],
  milan: [
    { title: 'Cathedral and arcade', places: ['milan-duomo', 'milan-galleria'], ideas: ['Duomo rooftop terraces'] },
    { title: 'Art and canals', places: ['milan-last-supper', 'milan-brera', 'milan-navigli'], ideas: ['Aperitivo by the Navigli'] },
  ],
  lucerne: [
    { title: 'Old town and the lake', places: ['lucerne-chapel-bridge'], ideas: ['Lakeside promenade', 'Musegg Wall towers'] },
    { title: 'Mount Rigi', places: ['lucerne-rigi'], ideas: ['Boat to Vitznau, cog railway up, cable car down'] },
    { title: 'Trains, planes and boats', places: ['lucerne-transport-museum'], ideas: ['Lion Monument'] },
    { title: 'Another mountain', places: [], ideas: ['Pilatus by the world’s steepest cogwheel railway', 'Or a day trip to Engelberg and Titlis'] },
  ],
  zurich: [
    { title: 'Old town', places: ['zurich-grossmunster', 'zurich-niederdorf'], ideas: ['Lindenhof viewpoint'] },
    { title: 'Lake and art', places: ['zurich-lake', 'zurich-kunsthaus', 'zurich-bahnhofstrasse'], ideas: ['Boat trip on the lake'] },
    { title: 'Up the Uetliberg', places: ['zurich-langstrasse'], ideas: ['Uetliberg by train for views of the Alps'] },
  ],
  barcelona: [
    { title: 'Gothic Quarter and El Born', places: ['bcn-el-born'], ideas: ['Barcelona Cathedral', 'Tapas in El Born'] },
    { title: 'Gaudí day', places: ['bcn-sagrada-familia'], ideas: ['Park Güell (book a time slot)', 'Casa Batlló from the street'] },
    { title: 'Markets, Picasso and views', places: ['bcn-boqueria', 'bcn-picasso', 'bcn-bunkers'], ideas: ['Sunset at the Bunkers del Carmel'] },
  ],
  madrid: [
    { title: 'Central Madrid', places: ['madrid-san-miguel'], ideas: ['Plaza Mayor', 'Puerta del Sol'] },
    { title: 'Art and the park', places: ['madrid-prado', 'madrid-retiro', 'madrid-malasana'], ideas: ['Crystal Palace in the Retiro'] },
    { title: 'Palace and flea market', places: ['madrid-royal-palace', 'madrid-rastro'], ideas: ['El Rastro is on Sundays'] },
  ],
  seville: [
    { title: 'Old Seville', places: [], ideas: ['Cathedral and Giralda tower', 'Santa Cruz quarter'] },
    { title: 'Alcázar and Plaza de España', places: ['seville-alcazar', 'seville-maria-luisa'], ideas: ['Plaza de España'] },
    { title: 'Triana', places: ['seville-triana-market', 'seville-flamenco'], ideas: ['Flamenco in the evening'] },
  ],
  lisbon: [
    { title: 'Alfama and the viewpoints', places: [], ideas: ['Tram 28 or walk up to the Miradouro de Santa Luzia', 'São Jorge Castle'] },
    { title: 'Belém', places: ['lisbon-belem-tower', 'lisbon-lx-factory'], ideas: ['Pastéis de Belém'] },
    { title: 'Tiles and nights out', places: ['lisbon-azulejo', 'lisbon-time-out', 'lisbon-bairro-alto'], ideas: ['Fado in Alfama'] },
  ],
  coimbra: [{ title: 'University town', places: ['coimbra-joanina', 'coimbra-fado'], ideas: ['University of Coimbra courtyard', 'Old cathedral (Sé Velha)'] }],
  porto: [
    { title: 'Ribeira and the bridge', places: ['porto-sao-bento'], ideas: ['Walk across the Dom Luís I bridge', 'Port cellars in Gaia'] },
    { title: 'Markets and the sea', places: ['porto-bolhao', 'porto-foz'], ideas: ['Tram 1 along the river to Foz'] },
    { title: 'Art and shopping', places: ['porto-serralves', 'porto-santa-catarina', 'porto-galerias'], ideas: ['Livraria Lello (book ahead)'] },
  ],
  paris: [
    { title: 'Île de la Cité and the Seine', places: ['paris-notre-dame', 'paris-sainte-chapelle', 'paris-seine-walk'], ideas: [] },
    { title: 'Louvre to the Eiffel Tower', places: ['paris-louvre', 'paris-tuileries', 'paris-eiffel-tower'], ideas: ['Book the Louvre and the tower ahead'] },
    { title: 'Montmartre and the Marais', places: ['paris-montmartre', 'paris-marche-enfants-rouges', 'paris-marais-shops'], ideas: ['Musée d’Orsay if it rains'] },
  ],
  lyon: [
    { title: 'Vieux Lyon', places: ['lyon-vieux-lyon', 'lyon-fourviere'], ideas: ['Dinner in a bouchon'] },
    { title: 'Food capital', places: ['lyon-halles', 'lyon-tete-dor', 'lyon-rhone-quays'], ideas: ['Croix-Rousse silk-weavers’ hill'] },
  ],
  nice: [
    { title: 'Old town and the promenade', places: ['nice-vieux-nice', 'nice-promenade'], ideas: [] },
    { title: 'Market, castle and Matisse', places: ['nice-cours-saleya', 'nice-castle-hill', 'nice-matisse'], ideas: ['Swim at a pebble beach'] },
    { title: 'Riviera day trip', places: [], ideas: ['Villefranche-sur-Mer or Monaco by local train', 'Èze village by bus'] },
  ],
  amsterdam: [
    { title: 'Canal ring', places: ['ams-nine-streets'], ideas: ['Canal boat', 'Jordaan streets'] },
    { title: 'Museums', places: ['ams-rijksmuseum', 'ams-vondelpark', 'ams-foodhallen'], ideas: ['Van Gogh Museum (book ahead)'] },
    { title: 'History and nights out', places: ['ams-anne-frank', 'ams-leidseplein'], ideas: ['Book Anne Frank House tickets weeks ahead'] },
  ],
  brussels: [
    { title: 'Grand-Place', places: ['brussels-grand-place', 'brussels-galeries', 'brussels-saint-gery'], ideas: ['Belgian beer in the evening'] },
    { title: 'Art and chocolate', places: ['brussels-magritte', 'brussels-chocolate', 'brussels-cinquantenaire'], ideas: ['Atomium'] },
  ],
  bruges: [
    { title: 'Markt and canals', places: ['bruges-frites', 'bruges-t-brugs-beertje'], ideas: ['Canal boat'] },
    { title: 'Belfry and Flemish art', places: ['bruges-belfry', 'bruges-groeninge', 'bruges-minnewater'], ideas: [] },
    { title: 'Ghent or the coast', places: ['bruges-lace'], ideas: ['Ghent is 25 minutes by train', 'Or the beach at Knokke or De Haan'] },
  ],
  vienna: [
    { title: 'Ringstrasse and the old town', places: ['vienna-kohlmarkt'], ideas: ['St Stephen’s Cathedral', 'A classic coffee house'] },
    { title: 'Palaces', places: ['vienna-schonbrunn', 'vienna-belvedere'], ideas: ['Klimt’s The Kiss at the Belvedere'] },
    { title: 'Markets and the Prater', places: ['vienna-naschmarkt', 'vienna-prater', 'vienna-bermuda'], ideas: ['Giant Ferris wheel', 'Opera standing tickets'] },
  ],
  graz: [{ title: 'Graz in a day', places: ['graz-schlossberg', 'graz-kunsthaus', 'graz-kaiser-josef-markt'], ideas: ['Murinsel island in the river'] }],
  salzburg: [
    { title: 'Old town', places: ['salzburg-getreidegasse', 'salzburg-mozart'], ideas: ['Salzburg Cathedral'] },
    { title: 'Fortress and gardens', places: ['salzburg-hohensalzburg', 'salzburg-mirabell', 'salzburg-augustiner'], ideas: ['Hallstatt or the lakes as a day trip'] },
  ],
  munich: [
    { title: 'Altstadt', places: ['munich-viktualienmarkt'], ideas: ['Marienplatz', 'Frauenkirche'] },
    { title: 'Palaces, art and beer gardens', places: ['munich-residenz', 'munich-pinakothek', 'munich-englischer-garten', 'munich-augustiner'], ideas: ['Eisbach surfers'] },
  ],
  prague: [
    { title: 'Old Town', places: [], ideas: ['Old Town Square and the astronomical clock', 'Charles Bridge early or late'] },
    { title: 'Castle and Malá Strana', places: ['prague-castle', 'prague-petrin'], ideas: ['St Vitus Cathedral'] },
    { title: 'Riverside Prague', places: ['prague-naplavka', 'prague-u-fleku', 'prague-national'], ideas: ['Vyšehrad fortress'] },
  ],
  berlin: [
    { title: 'Mitte', places: [], ideas: ['Brandenburg Gate', 'Reichstag dome (free, book ahead)'] },
    { title: 'Museums and the Wall', places: ['berlin-pergamon', 'berlin-wall-memorial'], ideas: ['East Side Gallery'] },
    { title: 'Kreuzberg and Tempelhof', places: ['berlin-markthalle', 'berlin-tempelhof', 'berlin-raw'], ideas: [] },
  ],
  sibenik: [{ title: 'Šibenik and Krka', places: ['sibenik-cathedral', 'sibenik-krka', 'sibenik-st-michael'], ideas: ['Swim below the falls in summer'] }],
  split: [
    { title: 'Inside the palace', places: ['split-diocletian'], ideas: ['Riva waterfront'] },
    { title: 'Market and Marjan', places: ['split-green-market', 'split-marjan', 'split-bacvice'], ideas: [] },
    { title: 'Islands day', places: [], ideas: ['Ferry or catamaran to Hvar or Brač'] },
  ],
  dubrovnik: [
    { title: 'Old town', places: ['dubrovnik-stradun', 'dubrovnik-rectors-palace'], ideas: ['Cable car for sunset'] },
    { title: 'Walls and Lokrum', places: ['dubrovnik-walls', 'dubrovnik-lokrum', 'dubrovnik-buza'], ideas: ['Walk the walls early, before the heat'] },
  ],
  athens: [
    { title: 'Plaka and Monastiraki', places: ['athens-monastiraki'], ideas: ['Dinner with an Acropolis view'] },
    { title: 'The Acropolis', places: ['athens-acropolis', 'athens-acropolis-museum'], ideas: ['Go at opening time'] },
    { title: 'Markets and hills', places: ['athens-varvakios', 'athens-philopappos', 'athens-psyrri'], ideas: ['Ancient Agora'] },
    { title: 'Sea day', places: [], ideas: ['Temple of Poseidon at Sounion for sunset', 'Or a ferry to Aegina'] },
  ],
  thessaloniki: [
    { title: 'Waterfront', places: ['thessaloniki-ladadika'], ideas: ['White Tower and the seafront promenade'] },
    { title: 'Markets and Roman Thessaloniki', places: ['thessaloniki-modiano', 'thessaloniki-rotunda'], ideas: ['Ano Poli old town walls'] },
  ],
  london: [
    { title: 'South Bank', places: ['london-borough-market'], ideas: ['Walk the South Bank to Westminster'] },
    { title: 'Museums and Soho', places: ['london-british-museum', 'london-soho'], ideas: ['Most big museums are free'] },
    { title: 'Tower and the East End', places: ['london-tower', 'london-columbia-road'], ideas: ['Columbia Road market is on Sundays'] },
  ],
  york: [
    { title: 'Medieval York', places: ['york-shambles', 'york-minster'], ideas: ['Walk the city walls'] },
    { title: 'Railways and the Dales', places: ['york-railway-museum'], ideas: ['Day trip to the North York Moors'] },
  ],
  edinburgh: [
    { title: 'Old Town', places: ['edinburgh-castle', 'edinburgh-victoria-street', 'edinburgh-grassmarket'], ideas: ['Royal Mile'] },
    { title: 'Arthur’s Seat and museums', places: ['edinburgh-arthurs-seat', 'edinburgh-national-museum', 'edinburgh-stockbridge'], ideas: [] },
  ],
}

export const TEMPLATE_DETAILS = {
  'classic-italy-10': {
    intro: 'The classic first trip to Italy: three nights each in Rome, Florence and Venice, so you see the big sights and still have evenings to wander.',
    highlights: ['The Colosseum and Roman Forum', 'The Vatican and Trastevere', 'Renaissance Florence and the Uffizi', 'Venice from the water'],
  },
  'italy-week-7': {
    intro: 'Rome, Florence and Venice in a week. Fast trains make it work; expect fuller days than the 10-day version.',
    highlights: ['Ancient Rome', 'Florence’s Duomo', 'St Mark’s and the Grand Canal'],
  },
  'hidden-italy-8': {
    intro: 'Three smaller places with the food, history and canals of the famous cities, and far fewer crowds.',
    highlights: ['Cycling Lucca’s Renaissance walls', 'Tiramisù in its home town', 'Chioggia’s fish market and lagoon'],
  },
  'italy-switzerland-12': {
    intro: 'Start with Rome and Florence, stop in Milan, then cross the Alps by train to the Swiss lakes.',
    highlights: ['The Last Supper in Milan', 'The Gotthard route over the Alps', 'Lake Lucerne and Mount Rigi'],
  },
  'spain-highlights-8': {
    intro: 'Barcelona, Madrid and Seville, linked by fast AVE trains of about two and a half hours each.',
    highlights: ['Sagrada Família', 'The Prado', 'The Real Alcázar', 'Flamenco in Triana'],
  },
  'portugal-escape-5': {
    intro: 'A short break in Portugal’s two great cities, three hours apart by train.',
    highlights: ['Lisbon’s viewpoints and Belém', 'Porto’s riverfront and port cellars'],
  },
  'portugal-rail-7': {
    intro: 'Lisbon and Porto with time to breathe, plus a night in Coimbra on the way north.',
    highlights: ['The Biblioteca Joanina in Coimbra', 'Fado in Lisbon and Coimbra', 'Porto’s Ribeira'],
  },
  'france-highlights-7': {
    intro: 'Paris, then south by TGV to Lyon’s bouchons and on to the Riviera.',
    highlights: ['The Louvre and the Seine', 'Vieux Lyon', 'Nice’s old town and the Promenade des Anglais'],
  },
  'amsterdam-belgium-6': {
    intro: 'Amsterdam, Brussels and Bruges, with short hops so more of the trip is spent exploring.',
    highlights: ['The Rijksmuseum', 'The Grand-Place', 'Bruges’ canals and belfry'],
  },
  'swiss-alps-7': {
    intro: 'Zurich first, then four nights in Lucerne, the best base for day trips into the mountains by train and boat.',
    highlights: ['Swimming in Lake Zurich', 'Mount Rigi by boat and cog railway', 'Pilatus or Titlis'],
  },
  'austria-rail-7': {
    intro: 'Vienna’s palaces and coffee houses, a night in student-town Graz, and Salzburg’s baroque old town.',
    highlights: ['Schönbrunn and the Belvedere', 'The Schlossberg in Graz', 'Hohensalzburg Fortress'],
  },
  'central-europe-10': {
    intro: 'Four cities in three countries, with train rides of four hours or less between them.',
    highlights: ['Munich’s beer gardens', 'Salzburg’s fortress', 'Imperial Vienna', 'Prague Castle'],
  },
  'rail-adventure-14': {
    intro: 'Two weeks across northern and central Europe by train. The two longer rides (to Berlin and Prague) are good days to rest.',
    highlights: ['The Louvre', 'Brussels’ Grand-Place', 'Amsterdam’s canals', 'Berlin’s Museum Island', 'Prague Castle'],
  },
  'croatian-coast-7': {
    intro: 'Down the Dalmatian coast by bus, from the Krka waterfalls to Dubrovnik’s walls. Ferries reach the islands from Split.',
    highlights: ['Krka National Park', 'Diocletian’s Palace', 'Dubrovnik’s city walls'],
  },
  'greek-escape-7': {
    intro: 'Four nights in Athens, then the train north to Thessaloniki, Greece’s food city.',
    highlights: ['The Acropolis and its museum', 'Sunset at Sounion', 'Thessaloniki’s markets'],
  },
  'britain-rail-8': {
    intro: 'London, then up the East Coast line to York and Edinburgh.',
    highlights: ['The British Museum', 'York Minster and the Shambles', 'Edinburgh Castle and Arthur’s Seat'],
  },
}
