import { PLACE_COST_EUR } from './costs.js'

// Sample places until a places API is wired in.
//
// Shape of a place:
//   id, cityId (from cities.js), name
//   category    interest id from interests.js (food, outdoors, museums, nightlife, history, shopping)
//   type        what it is: restaurant, market, cafe, park, viewpoint, museum, bar, neighbourhood, landmark, shop...
//   lat, lng
//   rating      sample rating out of 5 (not from real reviews)
//   costLevel   0 free, 1–3 ($ to $$$)
//   description one sentence
//   image       photo URL, or null to show the illustrated tile
//   estimatedCost  optional rough entry cost per person in euros; when missing it comes from costLevel (see costs.js)
//
// Every place also gets `latitude`/`longitude` (same values as lat/lng) for code that prefers the long names.
const raw = [
  // Paris
  { id: 'paris-marche-enfants-rouges', cityId: 'paris', category: 'food', type: 'market', name: 'Marché des Enfants Rouges', lat: 48.8627, lng: 2.3620, rating: 4.5, costLevel: 2, description: 'The oldest covered market in Paris, packed with lunch stalls.' },
  { id: 'paris-buttes-chaumont', cityId: 'paris', category: 'outdoors', type: 'park', name: 'Parc des Buttes-Chaumont', lat: 48.8809, lng: 2.3828, rating: 4.7, costLevel: 0, description: 'Cliffs, a lake and a temple with views over the city.' },
  { id: 'paris-orsay', cityId: 'paris', category: 'museums', type: 'museum', name: "Musée d'Orsay", lat: 48.8600, lng: 2.3266, rating: 4.8, costLevel: 2, description: 'Impressionist masterpieces in a former railway station.' },
  { id: 'paris-oberkampf', cityId: 'paris', category: 'nightlife', type: 'neighbourhood', name: 'Rue Oberkampf', lat: 48.8652, lng: 2.3787, rating: 4.3, costLevel: 2, description: 'A long strip of bars that stays busy late.' },
  { id: 'paris-sainte-chapelle', cityId: 'paris', category: 'history', type: 'landmark', name: 'Sainte-Chapelle', lat: 48.8554, lng: 2.3450, rating: 4.8, costLevel: 2, description: 'A 13th-century chapel that is almost entirely stained glass.' },
  { id: 'paris-marais-shops', cityId: 'paris', category: 'shopping', type: 'shop', name: 'Le Marais boutiques', lat: 48.8590, lng: 2.3600, rating: 4.4, costLevel: 3, description: 'Independent designers, concept stores and vintage in old mansions.' },
  { id: 'paris-louvre', cityId: 'paris', category: 'museums', type: 'museum', name: 'Louvre Museum', lat: 48.8606, lng: 2.3376, rating: 4.7, costLevel: 2, description: 'The Mona Lisa, Egyptian halls and palace rooms. Book a time slot ahead.' },
  { id: 'paris-eiffel-tower', cityId: 'paris', category: 'history', type: 'landmark', name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, rating: 4.7, costLevel: 3, description: 'Iron icon of 1889, with lifts or stairs up to three levels.' },
  { id: 'paris-arc-de-triomphe', cityId: 'paris', category: 'history', type: 'landmark', name: 'Arc de Triomphe', lat: 48.8738, lng: 2.2950, rating: 4.7, costLevel: 2, description: 'Napoleon\'s arch, with a rooftop view down the Champs-Élysées.' },
  { id: 'paris-montmartre', cityId: 'paris', category: 'outdoors', type: 'viewpoint', name: 'Montmartre and Sacré-Cœur', lat: 48.8867, lng: 2.3431, rating: 4.7, costLevel: 0, description: 'Hilltop village streets and one of the best free views of Paris.' },
  { id: 'paris-notre-dame', cityId: 'paris', category: 'history', type: 'church', name: 'Notre-Dame Cathedral', lat: 48.8530, lng: 2.3499, rating: 4.8, costLevel: 0, description: 'The Gothic cathedral on the Île de la Cité, reopened after restoration.' },
  { id: 'paris-tuileries', cityId: 'paris', category: 'outdoors', type: 'garden', name: 'Tuileries Garden', lat: 48.8635, lng: 2.3270, rating: 4.6, costLevel: 0, description: 'Formal gardens between the Louvre and Place de la Concorde.' },
  { id: 'paris-concorde', cityId: 'paris', category: 'history', type: 'landmark', name: 'Place de la Concorde', lat: 48.8656, lng: 2.3212, rating: 4.5, costLevel: 0, description: 'The great square with the Luxor obelisk, where the guillotine once stood.' },
  { id: 'paris-seine-walk', cityId: 'paris', category: 'outdoors', type: 'walk', name: 'Seine riverside walk', lat: 48.8575, lng: 2.3413, rating: 4.7, costLevel: 0, description: 'Bookstalls, bridges and islands along the quays, best at sunset.' },
  // Rouen
  { id: 'rouen-cathedral', cityId: 'rouen', category: 'history', type: 'landmark', name: 'Rouen Cathedral', lat: 49.4402, lng: 1.0950, rating: 4.7, costLevel: 0, description: 'The Gothic facade Monet painted more than 30 times.' },
  { id: 'rouen-vieux-marche', cityId: 'rouen', category: 'food', type: 'market', name: 'Place du Vieux-Marché', lat: 49.4428, lng: 1.0880, rating: 4.4, costLevel: 2, description: 'Market square and brasseries where Joan of Arc was burned.' },
  { id: 'rouen-beaux-arts', cityId: 'rouen', category: 'museums', type: 'museum', name: 'Musée des Beaux-Arts', lat: 49.4455, lng: 1.0948, rating: 4.6, costLevel: 0, description: 'A strong Impressionist collection, free to enter.' },
  // Reims
  { id: 'reims-cathedral', cityId: 'reims', category: 'history', type: 'landmark', name: 'Notre-Dame de Reims', lat: 49.2536, lng: 4.0341, rating: 4.8, costLevel: 0, description: 'Coronation cathedral with its famous smiling angel.' },
  { id: 'reims-champagne-cellars', cityId: 'reims', category: 'food', type: 'tasting', name: 'Champagne cellar tours', lat: 49.2450, lng: 4.0470, rating: 4.7, costLevel: 3, description: 'Chalk tunnels under the city with tastings at the end.' },
  // Chartres
  { id: 'chartres-cathedral', cityId: 'chartres', category: 'history', type: 'landmark', name: 'Chartres Cathedral', lat: 48.4478, lng: 1.4876, rating: 4.8, costLevel: 0, description: 'Over 150 original medieval stained-glass windows.' },
  { id: 'chartres-lower-town', cityId: 'chartres', category: 'outdoors', type: 'walk', name: 'Lower Town riverside walk', lat: 48.4452, lng: 1.4930, rating: 4.5, costLevel: 0, description: 'Old washhouses and bridges along the Eure.' },

  // Lyon
  { id: 'lyon-halles', cityId: 'lyon', category: 'food', type: 'market', name: 'Les Halles de Lyon Paul Bocuse', lat: 45.7630, lng: 4.8505, rating: 4.6, costLevel: 2, description: 'Covered market of cheese, charcuterie and oyster bars; lunch at the counters.' },
  { id: 'lyon-vieux-lyon', cityId: 'lyon', category: 'history', type: 'neighbourhood', name: 'Vieux Lyon and its traboules', lat: 45.7622, lng: 4.8271, rating: 4.7, costLevel: 0, description: 'Renaissance lanes with hidden passageways between the houses.' },
  { id: 'lyon-fourviere', cityId: 'lyon', category: 'history', type: 'church', name: 'Basilica of Notre-Dame de Fourvière', lat: 45.7623, lng: 4.8225, rating: 4.7, costLevel: 0, description: 'Hilltop basilica with the best view over the city.' },
  { id: 'lyon-confluences', cityId: 'lyon', category: 'museums', type: 'museum', name: 'Musée des Confluences', lat: 45.7327, lng: 4.8180, rating: 4.5, costLevel: 2, description: 'Science and anthropology museum in a glass-and-steel cloud where the rivers meet.' },
  { id: 'lyon-tete-dor', cityId: 'lyon', category: 'outdoors', type: 'park', name: 'Parc de la Tête d\'Or', lat: 45.7772, lng: 4.8559, rating: 4.7, costLevel: 0, description: 'A huge park with a lake, rose garden and free zoo.' },
  { id: 'lyon-rhone-quays', cityId: 'lyon', category: 'nightlife', type: 'bar', name: 'Barges on the Rhône quays', lat: 45.7560, lng: 4.8420, rating: 4.3, costLevel: 2, description: 'Bars on moored boats that fill up on summer evenings.' },
  // Strasbourg
  { id: 'strasbourg-cathedral', cityId: 'strasbourg', category: 'history', type: 'church', name: 'Strasbourg Cathedral', lat: 48.5818, lng: 7.7509, rating: 4.8, costLevel: 0, description: 'Pink sandstone Gothic cathedral with an astronomical clock.' },
  { id: 'strasbourg-petite-france', cityId: 'strasbourg', category: 'history', type: 'neighbourhood', name: 'Petite France', lat: 48.5803, lng: 7.7418, rating: 4.8, costLevel: 0, description: 'Canals, covered bridges and half-timbered tanners\' houses.' },
  { id: 'strasbourg-oeuvre-notre-dame', cityId: 'strasbourg', category: 'museums', type: 'museum', name: 'Musée de l\'Œuvre Notre-Dame', lat: 48.5810, lng: 7.7518, rating: 4.5, costLevel: 1, description: 'Original sculptures and stained glass from the cathedral.' },
  { id: 'strasbourg-orangerie', cityId: 'strasbourg', category: 'outdoors', type: 'park', name: 'Parc de l\'Orangerie', lat: 48.5906, lng: 7.7765, rating: 4.6, costLevel: 0, description: 'The city\'s oldest park, with storks nesting in the trees.' },
  { id: 'strasbourg-winstub', cityId: 'strasbourg', category: 'food', type: 'restaurant', name: 'Winstubs around the cathedral', lat: 48.5817, lng: 7.7497, rating: 4.4, costLevel: 2, description: 'Wood-panelled Alsatian taverns serving choucroute and tarte flambée.' },
  // Nice
  { id: 'nice-promenade', cityId: 'nice', category: 'outdoors', type: 'walk', name: 'Promenade des Anglais', lat: 43.6950, lng: 7.2650, rating: 4.7, costLevel: 0, description: 'Seven kilometres of seafront walk above the pebble beaches.' },
  { id: 'nice-cours-saleya', cityId: 'nice', category: 'food', type: 'market', name: 'Cours Saleya market', lat: 43.6955, lng: 7.2757, rating: 4.5, costLevel: 1, description: 'Flower and produce market; try socca, the chickpea pancake.' },
  { id: 'nice-castle-hill', cityId: 'nice', category: 'outdoors', type: 'viewpoint', name: 'Castle Hill', lat: 43.6950, lng: 7.2810, rating: 4.7, costLevel: 0, description: 'A park with a waterfall and the classic view over the Baie des Anges.' },
  { id: 'nice-vieux-nice', cityId: 'nice', category: 'history', type: 'neighbourhood', name: 'Vieux Nice', lat: 43.6970, lng: 7.2760, rating: 4.6, costLevel: 0, description: 'Narrow lanes, baroque chapels and pastel façades.' },
  { id: 'nice-matisse', cityId: 'nice', category: 'museums', type: 'museum', name: 'Musée Matisse', lat: 43.7196, lng: 7.2760, rating: 4.4, costLevel: 1, description: 'Matisse\'s work in a Genoese villa among the Cimiez olive groves.' },
  // Rome
  { id: 'rome-testaccio', cityId: 'rome', category: 'food', type: 'market', name: 'Mercato di Testaccio', lat: 41.8765, lng: 12.4755, rating: 4.6, costLevel: 1, description: 'Local market known for its trapizzino and supplì.' },
  { id: 'rome-villa-borghese', cityId: 'rome', category: 'outdoors', type: 'park', name: 'Villa Borghese', lat: 41.9142, lng: 12.4923, rating: 4.6, costLevel: 0, description: 'Landscaped park with a lake, rowboats and the Pincio terrace.' },
  { id: 'rome-vatican', cityId: 'rome', category: 'museums', type: 'museum', name: 'Vatican Museums', lat: 41.9065, lng: 12.4536, rating: 4.7, costLevel: 3, description: 'Raphael Rooms and the Sistine Chapel.' },
  { id: 'rome-trastevere', cityId: 'rome', category: 'nightlife', type: 'neighbourhood', name: 'Trastevere', lat: 41.8897, lng: 12.4700, rating: 4.5, costLevel: 2, description: 'Piazzas full of people with a drink until late.' },
  { id: 'rome-forum', cityId: 'rome', category: 'history', type: 'ruins', name: 'Roman Forum and Palatine', lat: 41.8925, lng: 12.4853, rating: 4.8, costLevel: 2, description: 'The heart of ancient Rome, on the same ticket as the Colosseum.' },
  { id: 'rome-monti', cityId: 'rome', category: 'shopping', type: 'shop', name: 'Monti vintage and makers', lat: 41.8957, lng: 12.4930, rating: 4.4, costLevel: 2, description: 'Small studios and vintage shops on Via del Boschetto.' },
  // Florence
  { id: 'florence-sant-ambrogio', cityId: 'florence', category: 'food', type: 'market', name: "Mercato di Sant'Ambrogio", lat: 43.7690, lng: 11.2658, rating: 4.5, costLevel: 1, description: "The locals' market, with a tiny trattoria inside." },
  { id: 'florence-boboli', cityId: 'florence', category: 'outdoors', type: 'park', name: 'Boboli Gardens', lat: 43.7625, lng: 11.2486, rating: 4.5, costLevel: 2, description: 'Terraced Renaissance gardens behind Palazzo Pitti.' },
  { id: 'florence-uffizi', cityId: 'florence', category: 'museums', type: 'museum', name: 'Uffizi Gallery', lat: 43.7678, lng: 11.2553, rating: 4.8, costLevel: 3, description: 'Botticelli, Leonardo and Michelangelo under one roof.' },
  { id: 'florence-santo-spirito', cityId: 'florence', category: 'nightlife', type: 'neighbourhood', name: 'Piazza Santo Spirito', lat: 43.7667, lng: 11.2475, rating: 4.4, costLevel: 1, description: 'An Oltrarno square that fills up for evening drinks.' },
  { id: 'florence-duomo', cityId: 'florence', category: 'history', type: 'landmark', name: 'Duomo and Brunelleschi\'s Dome', lat: 43.7731, lng: 11.2560, rating: 4.8, costLevel: 2, description: '463 steps to the top of the dome that defined the Renaissance.' },
  { id: 'florence-oltrarno-artisans', cityId: 'florence', category: 'shopping', type: 'shop', name: 'Oltrarno artisan workshops', lat: 43.7655, lng: 11.2500, rating: 4.6, costLevel: 2, description: 'Leather, paper and gold workshops still working on the south bank.' },
  // Lucca
  { id: 'lucca-walls', cityId: 'lucca', category: 'outdoors', type: 'walk', name: 'Lucca city walls', lat: 43.8440, lng: 10.4990, rating: 4.8, costLevel: 0, description: 'A tree-lined 4 km loop on top of the ramparts, best by bike.' },
  { id: 'lucca-guinigi', cityId: 'lucca', category: 'history', type: 'landmark', name: 'Torre Guinigi', lat: 43.8431, lng: 10.5075, rating: 4.6, costLevel: 1, description: 'A medieval tower with oak trees growing on its roof.' },
  { id: 'lucca-anfiteatro', cityId: 'lucca', category: 'food', type: 'restaurant', name: "Piazza dell'Anfiteatro", lat: 43.8456, lng: 10.5060, rating: 4.5, costLevel: 2, description: 'An oval piazza built on a Roman arena, ringed by cafés.' },
  // Venice
  { id: 'venice-rialto-market', cityId: 'venice', category: 'food', type: 'market', name: 'Rialto Market and bacari', lat: 45.4394, lng: 12.3350, rating: 4.5, costLevel: 2, description: 'Morning fish market, then cicchetti and wine at the bars behind it.' },
  { id: 'venice-giardini', cityId: 'venice', category: 'outdoors', type: 'park', name: 'Giardini and Sant\'Elena', lat: 45.4290, lng: 12.3580, rating: 4.4, costLevel: 0, description: 'Shady gardens at the quiet eastern end of the city.' },
  { id: 'venice-accademia', cityId: 'venice', category: 'museums', type: 'museum', name: 'Gallerie dell\'Accademia', lat: 45.4311, lng: 12.3282, rating: 4.6, costLevel: 2, description: 'Titian, Tintoretto and Bellini in one place.' },
  { id: 'venice-campo-santa-margherita', cityId: 'venice', category: 'nightlife', type: 'neighbourhood', name: 'Campo Santa Margherita', lat: 45.4346, lng: 12.3230, rating: 4.4, costLevel: 1, description: 'The student square where Venice actually goes out.' },
  { id: 'venice-doges-palace', cityId: 'venice', category: 'history', type: 'palace', name: "Doge's Palace", lat: 45.4337, lng: 12.3404, rating: 4.7, costLevel: 3, description: 'The seat of the Republic, with its prisons and Bridge of Sighs.' },
  { id: 'venice-murano-glass', cityId: 'venice', category: 'shopping', type: 'shop', name: 'Murano glass studios', lat: 45.4580, lng: 12.3530, rating: 4.3, costLevel: 3, description: 'Watch glassblowers at work, then buy direct from the furnace.' },
  // Chioggia
  { id: 'chioggia-fish-market', cityId: 'chioggia', category: 'food', type: 'market', name: 'Chioggia fish market', lat: 45.2190, lng: 12.2790, rating: 4.4, costLevel: 1, description: 'One of the busiest fish markets in Italy, with trattorie nearby.' },
  { id: 'chioggia-sottomarina', cityId: 'chioggia', category: 'outdoors', type: 'beach', name: 'Sottomarina beach', lat: 45.2050, lng: 12.3000, rating: 4.2, costLevel: 0, description: 'A long sandy Adriatic beach a short walk from the old town.' },
  // Treviso
  { id: 'treviso-canals', cityId: 'treviso', category: 'history', type: 'walk', name: 'Buranelli canal and old town', lat: 45.6660, lng: 12.2460, rating: 4.6, costLevel: 0, description: 'Waterwheels, frescoed houses and the island fish market.' },
  { id: 'treviso-tiramisu', cityId: 'treviso', category: 'food', type: 'restaurant', name: 'Tiramisù trail', lat: 45.6655, lng: 12.2440, rating: 4.5, costLevel: 2, description: 'Try the dessert in the town that claims to have invented it.' },

  // Milan
  { id: 'milan-duomo', cityId: 'milan', category: 'history', type: 'church', name: 'Milan Cathedral (Duomo)', lat: 45.4641, lng: 9.1919, rating: 4.8, costLevel: 2, description: 'A marble Gothic cathedral with a walkable roof of spires.' },
  { id: 'milan-last-supper', cityId: 'milan', category: 'museums', type: 'museum', name: 'The Last Supper', lat: 45.4659, lng: 9.1709, rating: 4.7, costLevel: 2, description: 'Leonardo\'s mural in Santa Maria delle Grazie; timed tickets sell out weeks ahead.' },
  { id: 'milan-brera', cityId: 'milan', category: 'museums', type: 'museum', name: 'Pinacoteca di Brera', lat: 45.4719, lng: 9.1880, rating: 4.6, costLevel: 2, description: 'Italian masters in the arty Brera quarter.' },
  { id: 'milan-galleria', cityId: 'milan', category: 'shopping', type: 'shop', name: 'Galleria Vittorio Emanuele II', lat: 45.4659, lng: 9.1900, rating: 4.7, costLevel: 3, description: 'A glass-roofed 19th-century arcade of cafés and fashion houses.' },
  { id: 'milan-navigli', cityId: 'milan', category: 'nightlife', type: 'neighbourhood', name: 'Navigli canals', lat: 45.4520, lng: 9.1760, rating: 4.5, costLevel: 2, description: 'Canal-side bars famous for the evening aperitivo.' },
  { id: 'milan-sempione', cityId: 'milan', category: 'outdoors', type: 'park', name: 'Parco Sempione', lat: 45.4726, lng: 9.1780, rating: 4.5, costLevel: 0, description: 'A big park behind Sforza Castle, with the Arco della Pace.' },
  // Barcelona
  { id: 'bcn-boqueria', cityId: 'barcelona', category: 'food', type: 'market', name: 'La Boqueria', lat: 41.3817, lng: 2.1716, rating: 4.4, costLevel: 2, description: 'Famous market with tapas counters in the middle of the stalls.' },
  { id: 'bcn-bunkers', cityId: 'barcelona', category: 'outdoors', type: 'viewpoint', name: 'Bunkers del Carmel', lat: 41.4190, lng: 2.1617, rating: 4.7, costLevel: 0, description: 'Old anti-aircraft battery with a 360° city view.' },
  { id: 'bcn-picasso', cityId: 'barcelona', category: 'museums', type: 'museum', name: 'Museu Picasso', lat: 41.3852, lng: 2.1809, rating: 4.5, costLevel: 2, description: "Picasso's formative years in medieval palaces." },
  { id: 'bcn-el-born', cityId: 'barcelona', category: 'nightlife', type: 'neighbourhood', name: 'El Born', lat: 41.3850, lng: 2.1830, rating: 4.5, costLevel: 2, description: 'Cocktail bars tucked into old stone streets.' },
  { id: 'bcn-sagrada-familia', cityId: 'barcelona', category: 'history', type: 'landmark', name: 'Sagrada Família', lat: 41.4036, lng: 2.1744, rating: 4.8, costLevel: 3, description: "Gaudí's basilica, still under construction after 140 years." },
  { id: 'bcn-gracia', cityId: 'barcelona', category: 'shopping', type: 'shop', name: 'Gràcia independent shops', lat: 41.4020, lng: 2.1570, rating: 4.4, costLevel: 2, description: 'Village-like streets of small designers and bookshops.' },
  // Girona
  { id: 'girona-onyar-houses', cityId: 'girona', category: 'history', type: 'landmark', name: 'Onyar river houses and Call', lat: 41.9840, lng: 2.8240, rating: 4.7, costLevel: 0, description: 'Painted riverside houses and the medieval Jewish quarter behind them.' },
  { id: 'girona-walls', cityId: 'girona', category: 'outdoors', type: 'walk', name: 'Passeig de la Muralla', lat: 41.9860, lng: 2.8280, rating: 4.6, costLevel: 0, description: 'Walk the old walls for views of the cathedral and Pyrenees.' },
  { id: 'girona-rambla-food', cityId: 'girona', category: 'food', type: 'restaurant', name: 'Rambla de la Llibertat cafés', lat: 41.9830, lng: 2.8235, rating: 4.4, costLevel: 2, description: 'Arcaded terraces for Catalan lunch menus.' },
  // Madrid
  { id: 'madrid-san-miguel', cityId: 'madrid', category: 'food', type: 'market', name: 'Mercado de San Miguel', lat: 40.4154, lng: -3.7090, rating: 4.3, costLevel: 2, description: 'Glass-and-iron market hall serving tapas and vermouth.' },
  { id: 'madrid-retiro', cityId: 'madrid', category: 'outdoors', type: 'park', name: 'El Retiro Park', lat: 40.4153, lng: -3.6845, rating: 4.8, costLevel: 0, description: 'Boating lake, rose garden and a glass Crystal Palace.' },
  { id: 'madrid-prado', cityId: 'madrid', category: 'museums', type: 'museum', name: 'Museo del Prado', lat: 40.4138, lng: -3.6921, rating: 4.8, costLevel: 2, description: 'Velázquez, Goya and El Greco. Free in the last two hours of the day.' },
  { id: 'madrid-malasana', cityId: 'madrid', category: 'nightlife', type: 'neighbourhood', name: 'Malasaña', lat: 40.4260, lng: -3.7050, rating: 4.4, costLevel: 1, description: 'Bars and live music that get going after midnight.' },
  { id: 'madrid-royal-palace', cityId: 'madrid', category: 'history', type: 'palace', name: 'Royal Palace of Madrid', lat: 40.4180, lng: -3.7143, rating: 4.6, costLevel: 2, description: 'Over 3,000 rooms, still used for state ceremonies.' },
  { id: 'madrid-rastro', cityId: 'madrid', category: 'shopping', type: 'market', name: 'El Rastro flea market', lat: 40.4087, lng: -3.7075, rating: 4.3, costLevel: 1, description: 'Sunday-morning open-air market in La Latina.' },
  // Seville
  { id: 'seville-triana-market', cityId: 'seville', category: 'food', type: 'market', name: 'Mercado de Triana', lat: 37.3860, lng: -6.0030, rating: 4.4, costLevel: 1, description: 'Tapas bars inside a market built over an old castle.' },
  { id: 'seville-maria-luisa', cityId: 'seville', category: 'outdoors', type: 'park', name: 'Parque de María Luisa', lat: 37.3760, lng: -5.9880, rating: 4.7, costLevel: 0, description: 'Shady gardens leading to the tiled Plaza de España.' },
  { id: 'seville-bellas-artes', cityId: 'seville', category: 'museums', type: 'museum', name: 'Museo de Bellas Artes', lat: 37.3930, lng: -5.9990, rating: 4.5, costLevel: 1, description: 'Murillo and Zurbarán in a former convent.' },
  { id: 'seville-flamenco', cityId: 'seville', category: 'nightlife', type: 'bar', name: 'Triana flamenco bars', lat: 37.3845, lng: -6.0010, rating: 4.6, costLevel: 2, description: 'Small bars with informal flamenco late at night.' },
  { id: 'seville-alcazar', cityId: 'seville', category: 'history', type: 'palace', name: 'Real Alcázar', lat: 37.3831, lng: -5.9903, rating: 4.8, costLevel: 2, description: 'Moorish-style royal palace with tiled courtyards and gardens.' },
  { id: 'seville-sierpes', cityId: 'seville', category: 'shopping', type: 'shop', name: 'Calle Sierpes', lat: 37.3930, lng: -5.9950, rating: 4.2, costLevel: 2, description: 'Shaded shopping street for fans, ceramics and shawls.' },

  // Lisbon
  { id: 'lisbon-time-out', cityId: 'lisbon', category: 'food', type: 'market', name: 'Time Out Market', lat: 38.7070, lng: -9.1459, rating: 4.4, costLevel: 2, description: "A food hall gathering many of the city's best cooks." },
  { id: 'lisbon-monsanto', cityId: 'lisbon', category: 'outdoors', type: 'park', name: 'Monsanto Forest Park', lat: 38.7300, lng: -9.1870, rating: 4.5, costLevel: 0, description: 'A huge wooded park with trails and viewpoints.' },
  { id: 'lisbon-azulejo', cityId: 'lisbon', category: 'museums', type: 'museum', name: 'National Tile Museum', lat: 38.7249, lng: -9.1136, rating: 4.7, costLevel: 1, description: 'Five centuries of Portuguese azulejos in a former convent.' },
  { id: 'lisbon-bairro-alto', cityId: 'lisbon', category: 'nightlife', type: 'neighbourhood', name: 'Bairro Alto', lat: 38.7134, lng: -9.1447, rating: 4.3, costLevel: 1, description: 'Narrow lanes where the whole neighbourhood becomes one bar.' },
  { id: 'lisbon-belem-tower', cityId: 'lisbon', category: 'history', type: 'landmark', name: 'Belém Tower and Jerónimos', lat: 38.6916, lng: -9.2160, rating: 4.6, costLevel: 2, description: 'Age of Discovery monuments on the riverfront, plus the original pastéis.' },
  { id: 'lisbon-lx-factory', cityId: 'lisbon', category: 'shopping', type: 'shop', name: 'LX Factory', lat: 38.7036, lng: -9.1780, rating: 4.5, costLevel: 2, description: 'Old textile mill full of design shops and a huge bookshop.' },
  // Porto
  { id: 'porto-bolhao', cityId: 'porto', category: 'food', type: 'market', name: 'Mercado do Bolhão', lat: 41.1496, lng: -8.6060, rating: 4.5, costLevel: 1, description: 'The restored central market for cheese, fish and pastries.' },
  { id: 'porto-foz', cityId: 'porto', category: 'outdoors', type: 'walk', name: 'Foz do Douro', lat: 41.1500, lng: -8.6750, rating: 4.6, costLevel: 0, description: 'Seaside promenade where the river meets the Atlantic.' },
  { id: 'porto-serralves', cityId: 'porto', category: 'museums', type: 'museum', name: 'Serralves Museum', lat: 41.1597, lng: -8.6597, rating: 4.6, costLevel: 2, description: 'Contemporary art set in large gardens.' },
  { id: 'porto-galerias', cityId: 'porto', category: 'nightlife', type: 'bar', name: 'Rua Galeria de Paris', lat: 41.1470, lng: -8.6150, rating: 4.3, costLevel: 1, description: 'The heart of the downtown bar scene.' },
  { id: 'porto-sao-bento', cityId: 'porto', category: 'history', type: 'landmark', name: 'São Bento Station', lat: 41.1456, lng: -8.6105, rating: 4.7, costLevel: 0, description: '20,000 blue tiles telling Portugal\'s history in the station hall.' },
  { id: 'porto-santa-catarina', cityId: 'porto', category: 'shopping', type: 'shop', name: 'Rua de Santa Catarina', lat: 41.1490, lng: -8.6060, rating: 4.3, costLevel: 2, description: 'Main shopping street, home to the art-nouveau Majestic Café.' },
  // Coimbra
  { id: 'coimbra-joanina', cityId: 'coimbra', category: 'history', type: 'landmark', name: 'Biblioteca Joanina', lat: 40.2075, lng: -8.4260, rating: 4.7, costLevel: 2, description: 'A gilded baroque library guarded by a colony of bats.' },
  { id: 'coimbra-fado', cityId: 'coimbra', category: 'nightlife', type: 'bar', name: 'Coimbra fado houses', lat: 40.2090, lng: -8.4290, rating: 4.6, costLevel: 2, description: 'Student-style fado, sung by men in academic capes.' },

  // Berlin
  { id: 'berlin-markthalle', cityId: 'berlin', category: 'food', type: 'market', name: 'Markthalle Neun', lat: 52.5020, lng: 13.4316, rating: 4.5, costLevel: 2, description: "Kreuzberg market hall, great for Thursday's Street Food night." },
  { id: 'berlin-tempelhof', cityId: 'berlin', category: 'outdoors', type: 'park', name: 'Tempelhofer Feld', lat: 52.4730, lng: 13.4040, rating: 4.6, costLevel: 0, description: 'A former airport runway turned into a vast park.' },
  { id: 'berlin-pergamon', cityId: 'berlin', category: 'museums', type: 'museum', name: 'Museum Island', lat: 52.5169, lng: 13.4019, rating: 4.7, costLevel: 2, description: 'Five museums on one island in the Spree.' },
  { id: 'berlin-raw', cityId: 'berlin', category: 'nightlife', type: 'club', name: 'RAW-Gelände', lat: 52.5070, lng: 13.4540, rating: 4.3, costLevel: 1, description: 'Industrial yard of clubs, bars and open-air stages.' },
  { id: 'berlin-wall-memorial', cityId: 'berlin', category: 'history', type: 'landmark', name: 'Berlin Wall Memorial', lat: 52.5351, lng: 13.3903, rating: 4.8, costLevel: 0, description: 'A preserved stretch of the Wall and death strip on Bernauer Straße.' },
  { id: 'berlin-kadewe', cityId: 'berlin', category: 'shopping', type: 'shop', name: 'KaDeWe', lat: 52.5015, lng: 13.3410, rating: 4.4, costLevel: 3, description: 'A legendary department store with a vast food floor on top.' },
  // Leipzig
  { id: 'leipzig-spinnerei', cityId: 'leipzig', category: 'museums', type: 'gallery', name: 'Spinnerei', lat: 51.3290, lng: 12.3200, rating: 4.6, costLevel: 0, description: 'A cotton mill turned into studios and galleries.' },
  { id: 'leipzig-karli', cityId: 'leipzig', category: 'nightlife', type: 'neighbourhood', name: 'Karl-Liebknecht-Straße', lat: 51.3250, lng: 12.3770, rating: 4.4, costLevel: 1, description: 'The "Karli", a long strip of cheap bars and cafés.' },
  { id: 'leipzig-thomaskirche', cityId: 'leipzig', category: 'history', type: 'church', name: 'St Thomas Church', lat: 51.3393, lng: 12.3726, rating: 4.6, costLevel: 0, description: 'Where Bach was cantor for 27 years, and is buried.' },
  // Munich
  { id: 'munich-viktualienmarkt', cityId: 'munich', category: 'food', type: 'market', name: 'Viktualienmarkt', lat: 48.1351, lng: 11.5762, rating: 4.6, costLevel: 2, description: 'Open-air food market with its own beer garden.' },
  { id: 'munich-englischer-garten', cityId: 'munich', category: 'outdoors', type: 'park', name: 'Englischer Garten', lat: 48.1642, lng: 11.6055, rating: 4.8, costLevel: 0, description: 'Bigger than Central Park, with river surfers at the Eisbach.' },
  { id: 'munich-pinakothek', cityId: 'munich', category: 'museums', type: 'museum', name: 'Alte Pinakothek', lat: 48.1482, lng: 11.5700, rating: 4.7, costLevel: 1, description: 'Old masters, and only €1 on Sundays.' },
  { id: 'munich-augustiner', cityId: 'munich', category: 'nightlife', type: 'bar', name: 'Augustiner-Keller beer garden', lat: 48.1440, lng: 11.5490, rating: 4.6, costLevel: 2, description: 'Five thousand seats under chestnut trees.' },
  { id: 'munich-residenz', cityId: 'munich', category: 'history', type: 'palace', name: 'Munich Residenz', lat: 48.1410, lng: 11.5790, rating: 4.7, costLevel: 2, description: 'The Bavarian royal palace, with 130 rooms open to visit.' },
  { id: 'munich-maximilianstrasse', cityId: 'munich', category: 'shopping', type: 'shop', name: 'Maximilianstraße', lat: 48.1390, lng: 11.5830, rating: 4.2, costLevel: 3, description: 'Munich\'s grand boulevard of luxury shops.' },

  // Cologne
  { id: 'cologne-cathedral', cityId: 'cologne', category: 'history', type: 'church', name: 'Cologne Cathedral', lat: 50.9413, lng: 6.9583, rating: 4.8, costLevel: 0, description: 'The huge twin-spired Gothic cathedral, free to enter; climb the tower for a fee.' },
  { id: 'cologne-ludwig', cityId: 'cologne', category: 'museums', type: 'museum', name: 'Museum Ludwig', lat: 50.9408, lng: 6.9608, rating: 4.5, costLevel: 2, description: 'Pop art, Picasso and German Expressionism next to the cathedral.' },
  { id: 'cologne-rheinpark', cityId: 'cologne', category: 'outdoors', type: 'park', name: 'Rheinpark', lat: 50.9470, lng: 6.9800, rating: 4.5, costLevel: 0, description: 'Riverside park with views of the cathedral across the Rhine.' },
  { id: 'cologne-brauhaus', cityId: 'cologne', category: 'food', type: 'restaurant', name: 'Old Town brewhouses', lat: 50.9401, lng: 6.9567, rating: 4.4, costLevel: 2, description: 'Kölsch served in small glasses with hearty Rhineland dishes.' },
  { id: 'cologne-zuelpicher', cityId: 'cologne', category: 'nightlife', type: 'bar', name: 'Zülpicher Straße', lat: 50.9290, lng: 6.9380, rating: 4.2, costLevel: 1, description: 'The student quarter\'s bar street, busy most nights.' },
  { id: 'cologne-ehrenstrasse', cityId: 'cologne', category: 'shopping', type: 'shop', name: 'Ehrenstraße', lat: 50.9380, lng: 6.9420, rating: 4.3, costLevel: 2, description: 'Independent fashion and concept stores.' },
  // Amsterdam
  { id: 'ams-foodhallen', cityId: 'amsterdam', category: 'food', type: 'market', name: 'Foodhallen', lat: 52.3668, lng: 4.8680, rating: 4.4, costLevel: 2, description: 'An indoor food market in an old tram depot.' },
  { id: 'ams-vondelpark', cityId: 'amsterdam', category: 'outdoors', type: 'park', name: 'Vondelpark', lat: 52.3580, lng: 4.8686, rating: 4.7, costLevel: 0, description: "The city's favourite park for cycling and picnics." },
  { id: 'ams-rijksmuseum', cityId: 'amsterdam', category: 'museums', type: 'museum', name: 'Rijksmuseum', lat: 52.3600, lng: 4.8852, rating: 4.8, costLevel: 3, description: 'Rembrandt, Vermeer and the Dutch Golden Age.' },
  { id: 'ams-leidseplein', cityId: 'amsterdam', category: 'nightlife', type: 'neighbourhood', name: 'Leidseplein', lat: 52.3641, lng: 4.8830, rating: 4.2, costLevel: 2, description: 'A square of bars, clubs and live music venues.' },
  { id: 'ams-anne-frank', cityId: 'amsterdam', category: 'history', type: 'museum', name: 'Anne Frank House', lat: 52.3752, lng: 4.8840, rating: 4.7, costLevel: 2, description: 'The secret annex. Tickets are released online weeks ahead.' },
  { id: 'ams-nine-streets', cityId: 'amsterdam', category: 'shopping', type: 'shop', name: 'De 9 Straatjes', lat: 52.3700, lng: 4.8850, rating: 4.5, costLevel: 3, description: 'Nine canal-side streets of independent boutiques.' },
  // Utrecht
  { id: 'utrecht-oudegracht', cityId: 'utrecht', category: 'food', type: 'restaurant', name: 'Oudegracht wharf cafés', lat: 52.0900, lng: 5.1200, rating: 4.6, costLevel: 2, description: 'Terraces at water level in old canal-side cellars.' },
  { id: 'utrecht-dom-tower', cityId: 'utrecht', category: 'history', type: 'landmark', name: 'Dom Tower', lat: 52.0908, lng: 5.1213, rating: 4.7, costLevel: 2, description: 'The tallest church tower in the Netherlands, 465 steps up.' },
  // Brussels
  { id: 'brussels-chocolate', cityId: 'brussels', category: 'food', type: 'shop', name: 'Sablon chocolatiers', lat: 50.8400, lng: 4.3560, rating: 4.6, costLevel: 2, description: 'The best chocolate shops in town, clustered on one square.' },
  { id: 'brussels-cinquantenaire', cityId: 'brussels', category: 'outdoors', type: 'park', name: 'Parc du Cinquantenaire', lat: 50.8406, lng: 4.3930, rating: 4.5, costLevel: 0, description: 'A triumphal arch and wide lawns in the EU quarter.' },
  { id: 'brussels-magritte', cityId: 'brussels', category: 'museums', type: 'museum', name: 'Magritte Museum', lat: 50.8430, lng: 4.3580, rating: 4.4, costLevel: 2, description: 'The largest collection of the surrealist\'s work.' },
  { id: 'brussels-saint-gery', cityId: 'brussels', category: 'nightlife', type: 'bar', name: 'Saint-Géry beer bars', lat: 50.8480, lng: 4.3480, rating: 4.4, costLevel: 1, description: 'Belgian beer cafés around an old covered market.' },
  { id: 'brussels-grand-place', cityId: 'brussels', category: 'history', type: 'landmark', name: 'Grand-Place', lat: 50.8467, lng: 4.3525, rating: 4.8, costLevel: 0, description: 'Gilded guildhalls around one of Europe\'s grandest squares.' },
  { id: 'brussels-galeries', cityId: 'brussels', category: 'shopping', type: 'shop', name: 'Galeries Royales Saint-Hubert', lat: 50.8475, lng: 4.3545, rating: 4.6, costLevel: 3, description: 'A glass-roofed 1840s arcade of shops and cafés.' },
  // Bruges
  { id: 'bruges-frites', cityId: 'bruges', category: 'food', type: 'restaurant', name: 'Markt frites stands', lat: 51.2089, lng: 3.2243, rating: 4.3, costLevel: 1, description: 'Twice-fried Belgian fries under the belfry.' },
  { id: 'bruges-minnewater', cityId: 'bruges', category: 'outdoors', type: 'park', name: 'Minnewater', lat: 51.2020, lng: 3.2260, rating: 4.7, costLevel: 0, description: 'The "Lake of Love", quiet early in the morning.' },
  { id: 'bruges-groeninge', cityId: 'bruges', category: 'museums', type: 'museum', name: 'Groeninge Museum', lat: 51.2057, lng: 3.2270, rating: 4.5, costLevel: 2, description: 'Flemish Primitives, including Jan van Eyck.' },
  { id: 'bruges-t-brugs-beertje', cityId: 'bruges', category: 'nightlife', type: 'bar', name: "'t Brugs Beertje", lat: 51.2067, lng: 3.2215, rating: 4.6, costLevel: 2, description: 'A tiny brown café with hundreds of Belgian beers.' },
  { id: 'bruges-belfry', cityId: 'bruges', category: 'history', type: 'landmark', name: 'Belfry of Bruges', lat: 51.2085, lng: 3.2248, rating: 4.6, costLevel: 2, description: '366 steps to a carillon and a view over the rooftops.' },
  { id: 'bruges-lace', cityId: 'bruges', category: 'shopping', type: 'shop', name: 'Lace and chocolate shops', lat: 51.2075, lng: 3.2260, rating: 4.1, costLevel: 2, description: 'Handmade bobbin lace and pralines near the Burg.' },
  // Ghent
  { id: 'ghent-gravensteen', cityId: 'ghent', category: 'history', type: 'castle', name: 'Gravensteen', lat: 51.0573, lng: 3.7207, rating: 4.6, costLevel: 2, description: 'A moated 12th-century castle in the middle of the city.' },
  { id: 'ghent-graslei', cityId: 'ghent', category: 'nightlife', type: 'bar', name: 'Graslei and Korenlei', lat: 51.0545, lng: 3.7200, rating: 4.7, costLevel: 1, description: 'Guildhall quays where students sit by the water at night.' },
  { id: 'ghent-altarpiece', cityId: 'ghent', category: 'museums', type: 'museum', name: 'Ghent Altarpiece', lat: 51.0530, lng: 3.7270, rating: 4.8, costLevel: 2, description: "Van Eyck's Adoration of the Mystic Lamb in St Bavo's Cathedral." },

  // Zurich
  { id: 'zurich-lake', cityId: 'zurich', category: 'outdoors', type: 'beach', name: 'Lake Zurich swimming baths', lat: 47.3620, lng: 8.5420, rating: 4.7, costLevel: 1, description: 'Wooden lake and river baths that turn into bars at night.' },
  { id: 'zurich-kunsthaus', cityId: 'zurich', category: 'museums', type: 'museum', name: 'Kunsthaus Zürich', lat: 47.3703, lng: 8.5481, rating: 4.6, costLevel: 3, description: 'Giacometti, Munch and Monet in a big new extension.' },
  { id: 'zurich-bahnhofstrasse', cityId: 'zurich', category: 'shopping', type: 'shop', name: 'Bahnhofstrasse', lat: 47.3717, lng: 8.5390, rating: 4.3, costLevel: 3, description: 'One of the world\'s most expensive shopping streets.' },
  { id: 'zurich-niederdorf', cityId: 'zurich', category: 'food', type: 'restaurant', name: 'Niederdorf fondue', lat: 47.3730, lng: 8.5440, rating: 4.4, costLevel: 3, description: 'Old-town lanes for fondue and rösti.' },
  { id: 'zurich-langstrasse', cityId: 'zurich', category: 'nightlife', type: 'neighbourhood', name: 'Langstrasse', lat: 47.3780, lng: 8.5270, rating: 4.2, costLevel: 2, description: 'Zurich\'s grittier, livelier bar district.' },
  { id: 'zurich-grossmunster', cityId: 'zurich', category: 'history', type: 'church', name: 'Grossmünster', lat: 47.3700, lng: 8.5440, rating: 4.5, costLevel: 0, description: 'Twin-towered church where the Swiss Reformation began.' },
  // Lucerne
  { id: 'lucerne-chapel-bridge', cityId: 'lucerne', category: 'history', type: 'landmark', name: 'Chapel Bridge', lat: 47.0517, lng: 8.3075, rating: 4.6, costLevel: 0, description: 'A covered wooden bridge from 1333 with painted panels.' },
  { id: 'lucerne-rigi', cityId: 'lucerne', category: 'outdoors', type: 'viewpoint', name: 'Mount Rigi', lat: 47.0567, lng: 8.4850, rating: 4.8, costLevel: 3, description: 'Boat then cogwheel train to the "Queen of the Mountains".' },
  { id: 'lucerne-transport-museum', cityId: 'lucerne', category: 'museums', type: 'museum', name: 'Swiss Museum of Transport', lat: 47.0526, lng: 8.3355, rating: 4.6, costLevel: 3, description: 'Trains, planes and a huge Swiss rail history hall.' },

  // Vienna
  { id: 'vienna-naschmarkt', cityId: 'vienna', category: 'food', type: 'market', name: 'Naschmarkt', lat: 48.1985, lng: 16.3630, rating: 4.4, costLevel: 2, description: "Vienna's best-known market, with stalls and small restaurants." },
  { id: 'vienna-prater', cityId: 'vienna', category: 'outdoors', type: 'park', name: 'Prater', lat: 48.2166, lng: 16.3960, rating: 4.5, costLevel: 0, description: 'Wide park with the giant Ferris wheel at one end.' },
  { id: 'vienna-belvedere', cityId: 'vienna', category: 'museums', type: 'museum', name: 'Belvedere', lat: 48.1916, lng: 16.3808, rating: 4.7, costLevel: 2, description: "Baroque palace home to Klimt's The Kiss." },
  { id: 'vienna-bermuda', cityId: 'vienna', category: 'nightlife', type: 'neighbourhood', name: 'Bermuda Triangle', lat: 48.2115, lng: 16.3745, rating: 4.1, costLevel: 2, description: 'A tight cluster of bars in the old town.' },
  { id: 'vienna-schonbrunn', cityId: 'vienna', category: 'history', type: 'palace', name: 'Schönbrunn Palace', lat: 48.1845, lng: 16.3122, rating: 4.7, costLevel: 2, description: 'The Habsburg summer palace and its free formal gardens.' },
  { id: 'vienna-kohlmarkt', cityId: 'vienna', category: 'shopping', type: 'shop', name: 'Kohlmarkt and Demel', lat: 48.2090, lng: 16.3680, rating: 4.4, costLevel: 3, description: 'Elegant shopping street with the historic Demel confectioner.' },
  // Graz
  { id: 'graz-schlossberg', cityId: 'graz', category: 'outdoors', type: 'viewpoint', name: 'Schlossberg', lat: 47.0760, lng: 15.4375, rating: 4.7, costLevel: 0, description: 'A hill in the city centre with the clock tower and views.' },
  { id: 'graz-kunsthaus', cityId: 'graz', category: 'museums', type: 'museum', name: 'Kunsthaus Graz', lat: 47.0712, lng: 15.4340, rating: 4.3, costLevel: 2, description: 'A blob-shaped contemporary art museum nicknamed "the friendly alien".' },
  { id: 'graz-kaiser-josef-markt', cityId: 'graz', category: 'food', type: 'market', name: 'Kaiser-Josef-Markt', lat: 47.0680, lng: 15.4450, rating: 4.5, costLevel: 1, description: 'Farmers\' market for Styrian pumpkin-seed oil and cheese.' },
  // Salzburg
  { id: 'salzburg-hohensalzburg', cityId: 'salzburg', category: 'history', type: 'castle', name: 'Hohensalzburg Fortress', lat: 47.7950, lng: 13.0470, rating: 4.7, costLevel: 2, description: 'One of Europe\'s largest medieval castles, reached by funicular.' },
  { id: 'salzburg-mirabell', cityId: 'salzburg', category: 'outdoors', type: 'park', name: 'Mirabell Gardens', lat: 47.8058, lng: 13.0418, rating: 4.6, costLevel: 0, description: 'Baroque gardens framing the fortress, famous from The Sound of Music.' },
  { id: 'salzburg-mozart', cityId: 'salzburg', category: 'museums', type: 'museum', name: "Mozart's Birthplace", lat: 47.8000, lng: 13.0430, rating: 4.3, costLevel: 2, description: 'The yellow house on Getreidegasse where Mozart was born.' },
  { id: 'salzburg-augustiner', cityId: 'salzburg', category: 'nightlife', type: 'bar', name: 'Augustiner Bräu Mülln', lat: 47.8060, lng: 13.0340, rating: 4.7, costLevel: 1, description: 'Monastery brewery with beer poured from wooden barrels.' },
  { id: 'salzburg-getreidegasse', cityId: 'salzburg', category: 'shopping', type: 'shop', name: 'Getreidegasse', lat: 47.7998, lng: 13.0425, rating: 4.4, costLevel: 3, description: 'A narrow lane of wrought-iron shop signs.' },
  { id: 'salzburg-stiegl', cityId: 'salzburg', category: 'food', type: 'restaurant', name: 'St. Peter Stiftskulinarium', lat: 47.7975, lng: 13.0460, rating: 4.5, costLevel: 3, description: 'Claims to be the oldest restaurant in Central Europe.' },

  // Prague
  { id: 'prague-naplavka', cityId: 'prague', category: 'food', type: 'market', name: 'Náplavka Farmers Market', lat: 50.0700, lng: 14.4140, rating: 4.5, costLevel: 1, description: 'Saturday riverside market with local food and drink.' },
  { id: 'prague-petrin', cityId: 'prague', category: 'outdoors', type: 'park', name: 'Petřín Hill', lat: 50.0833, lng: 14.3950, rating: 4.6, costLevel: 0, description: 'Orchards, gardens and a mini Eiffel Tower lookout.' },
  { id: 'prague-national', cityId: 'prague', category: 'museums', type: 'museum', name: 'National Museum', lat: 50.0790, lng: 14.4310, rating: 4.5, costLevel: 1, description: 'Grand neo-Renaissance building at the top of Wenceslas Square.' },
  { id: 'prague-u-fleku', cityId: 'prague', category: 'nightlife', type: 'bar', name: 'U Fleků', lat: 50.0786, lng: 14.4169, rating: 4.3, costLevel: 2, description: 'Brewery pub pouring its own dark lager since 1499.' },
  { id: 'prague-castle', cityId: 'prague', category: 'history', type: 'castle', name: 'Prague Castle', lat: 50.0911, lng: 14.4016, rating: 4.7, costLevel: 2, description: 'The largest ancient castle complex in the world, with St Vitus Cathedral.' },
  { id: 'prague-parizska', cityId: 'prague', category: 'shopping', type: 'shop', name: 'Czech design shops', lat: 50.0880, lng: 14.4190, rating: 4.3, costLevel: 2, description: 'Bohemian glass and local design around Old Town.' },
  // Brno
  { id: 'brno-villa-tugendhat', cityId: 'brno', category: 'history', type: 'landmark', name: 'Villa Tugendhat', lat: 49.2073, lng: 16.6160, rating: 4.8, costLevel: 2, description: 'Mies van der Rohe\'s modernist masterpiece. Book ahead.' },
  { id: 'brno-cocktail-bars', cityId: 'brno', category: 'nightlife', type: 'bar', name: 'Bar, který neexistuje', lat: 49.1960, lng: 16.6100, rating: 4.7, costLevel: 2, description: '"The bar that doesn\'t exist", flagship of a big cocktail scene.' },
  { id: 'brno-cabbage-market', cityId: 'brno', category: 'food', type: 'market', name: 'Zelný trh', lat: 49.1920, lng: 16.6085, rating: 4.3, costLevel: 1, description: 'Cabbage Market square with stalls and a baroque fountain.' },

  // Athens
  { id: 'athens-varvakios', cityId: 'athens', category: 'food', type: 'market', name: 'Varvakios Agora', lat: 37.9812, lng: 23.7265, rating: 4.4, costLevel: 1, description: 'Central meat and fish market ringed by old tavernas.' },
  { id: 'athens-philopappos', cityId: 'athens', category: 'outdoors', type: 'viewpoint', name: 'Philopappos Hill', lat: 37.9676, lng: 23.7194, rating: 4.7, costLevel: 0, description: 'Pine-covered hill with the best view of the Acropolis.' },
  { id: 'athens-acropolis-museum', cityId: 'athens', category: 'museums', type: 'museum', name: 'Acropolis Museum', lat: 37.9685, lng: 23.7285, rating: 4.8, costLevel: 2, description: 'Parthenon sculptures in a glass building below the rock.' },
  { id: 'athens-psyrri', cityId: 'athens', category: 'nightlife', type: 'neighbourhood', name: 'Psyrri', lat: 37.9780, lng: 23.7230, rating: 4.4, costLevel: 1, description: 'Bars, rooftops and live rebetiko music late into the night.' },
  { id: 'athens-acropolis', cityId: 'athens', category: 'history', type: 'ruins', name: 'Acropolis', lat: 37.9715, lng: 23.7257, rating: 4.8, costLevel: 2, description: 'The Parthenon. Go at opening time to beat heat and crowds.' },
  { id: 'athens-monastiraki', cityId: 'athens', category: 'shopping', type: 'market', name: 'Monastiraki Flea Market', lat: 37.9765, lng: 23.7240, rating: 4.3, costLevel: 1, description: 'Antiques, sandals and souvenirs below the Acropolis.' },
  // Thessaloniki
  { id: 'thessaloniki-modiano', cityId: 'thessaloniki', category: 'food', type: 'market', name: 'Modiano and Kapani markets', lat: 40.6370, lng: 22.9420, rating: 4.5, costLevel: 1, description: 'Old covered markets with ouzeries tucked between stalls.' },
  { id: 'thessaloniki-rotunda', cityId: 'thessaloniki', category: 'history', type: 'landmark', name: 'Rotunda and Arch of Galerius', lat: 40.6330, lng: 22.9530, rating: 4.6, costLevel: 1, description: 'A Roman rotunda later used as a church and a mosque.' },
  { id: 'thessaloniki-ladadika', cityId: 'thessaloniki', category: 'nightlife', type: 'neighbourhood', name: 'Ladadika', lat: 40.6360, lng: 22.9360, rating: 4.4, costLevel: 1, description: 'Restored warehouse district full of tavernas and bars.' },

  // Dubrovnik
  { id: 'dubrovnik-walls', cityId: 'dubrovnik', category: 'history', type: 'landmark', name: 'City Walls', lat: 42.6415, lng: 18.1090, rating: 4.8, costLevel: 3, description: '2 km walk around the old town on top of the walls.' },
  { id: 'dubrovnik-lokrum', cityId: 'dubrovnik', category: 'outdoors', type: 'beach', name: 'Lokrum Island', lat: 42.6250, lng: 18.1210, rating: 4.6, costLevel: 2, description: 'A short ferry to rocky swimming spots and peacocks.' },
  { id: 'dubrovnik-buza', cityId: 'dubrovnik', category: 'nightlife', type: 'bar', name: 'Buža bars', lat: 42.6393, lng: 18.1100, rating: 4.6, costLevel: 2, description: 'Cliffside bars reached through a hole in the city wall.' },
  { id: 'dubrovnik-gruz-market', cityId: 'dubrovnik', category: 'food', type: 'market', name: 'Gruž market', lat: 42.6590, lng: 18.0860, rating: 4.3, costLevel: 1, description: 'Morning fish and produce market by the ferry port.' },
  { id: 'dubrovnik-rectors-palace', cityId: 'dubrovnik', category: 'museums', type: 'museum', name: "Rector's Palace", lat: 42.6405, lng: 18.1105, rating: 4.4, costLevel: 2, description: 'Gothic-Renaissance palace of the old Republic of Ragusa.' },
  { id: 'dubrovnik-stradun', cityId: 'dubrovnik', category: 'shopping', type: 'shop', name: 'Stradun', lat: 42.6410, lng: 18.1080, rating: 4.2, costLevel: 3, description: 'The polished limestone main street, best before 9am.' },
  // Šibenik
  { id: 'sibenik-cathedral', cityId: 'sibenik', category: 'history', type: 'landmark', name: 'Cathedral of St James', lat: 43.7370, lng: 15.8900, rating: 4.7, costLevel: 1, description: 'A UNESCO-listed stone cathedral with 71 carved faces.' },
  { id: 'sibenik-krka', cityId: 'sibenik', category: 'outdoors', type: 'park', name: 'Krka National Park', lat: 43.8050, lng: 15.9640, rating: 4.7, costLevel: 2, description: 'Waterfalls and boardwalks a short drive from town.' },
  { id: 'sibenik-st-michael', cityId: 'sibenik', category: 'outdoors', type: 'viewpoint', name: "St Michael's Fortress", lat: 43.7385, lng: 15.8880, rating: 4.5, costLevel: 1, description: 'A hilltop fortress with an open-air stage and sea views.' },
  // Split
  { id: 'split-diocletian', cityId: 'split', category: 'history', type: 'palace', name: "Diocletian's Palace", lat: 43.5081, lng: 16.4402, rating: 4.7, costLevel: 0, description: 'A Roman palace that people still live and shop inside.' },
  { id: 'split-marjan', cityId: 'split', category: 'outdoors', type: 'park', name: 'Marjan Hill', lat: 43.5100, lng: 16.4200, rating: 4.7, costLevel: 0, description: 'Forest park with trails, chapels and swimming coves.' },
  { id: 'split-green-market', cityId: 'split', category: 'food', type: 'market', name: 'Pazar green market', lat: 43.5085, lng: 16.4420, rating: 4.3, costLevel: 1, description: 'Figs, cheese and olive oil just outside the palace walls.' },
  { id: 'split-bacvice', cityId: 'split', category: 'nightlife', type: 'bar', name: 'Bačvice beach bars', lat: 43.5020, lng: 16.4480, rating: 4.3, costLevel: 2, description: 'Sandy city beach that turns into a party at night.' },

  // London
  { id: 'london-borough-market', cityId: 'london', category: 'food', type: 'market', name: 'Borough Market', lat: 51.5055, lng: -0.0910, rating: 4.6, costLevel: 2, description: 'A thousand-year-old market with the city\'s best street food.' },
  { id: 'london-hampstead-heath', cityId: 'london', category: 'outdoors', type: 'park', name: 'Hampstead Heath', lat: 51.5610, lng: -0.1650, rating: 4.8, costLevel: 0, description: 'Wild heath, swimming ponds and the view from Parliament Hill.' },
  { id: 'london-british-museum', cityId: 'london', category: 'museums', type: 'museum', name: 'British Museum', lat: 51.5194, lng: -0.1270, rating: 4.7, costLevel: 0, description: 'Free, enormous, and home to the Rosetta Stone.' },
  { id: 'london-soho', cityId: 'london', category: 'nightlife', type: 'neighbourhood', name: 'Soho', lat: 51.5136, lng: -0.1365, rating: 4.4, costLevel: 3, description: 'Pubs, cocktail bars and theatres packed into a few streets.' },
  { id: 'london-tower', cityId: 'london', category: 'history', type: 'castle', name: 'Tower of London', lat: 51.5081, lng: -0.0759, rating: 4.7, costLevel: 3, description: 'Nearly a thousand years of history and the Crown Jewels.' },
  { id: 'london-columbia-road', cityId: 'london', category: 'shopping', type: 'market', name: 'Columbia Road Flower Market', lat: 51.5290, lng: -0.0700, rating: 4.6, costLevel: 1, description: 'Sunday flower market lined with small independent shops.' },
  // York
  { id: 'york-minster', cityId: 'york', category: 'history', type: 'church', name: 'York Minster', lat: 53.9623, lng: -1.0819, rating: 4.8, costLevel: 2, description: 'One of the largest Gothic cathedrals in northern Europe.' },
  { id: 'york-shambles', cityId: 'york', category: 'shopping', type: 'shop', name: 'The Shambles', lat: 53.9594, lng: -1.0802, rating: 4.6, costLevel: 2, description: 'An overhanging medieval street of small shops.' },
  { id: 'york-railway-museum', cityId: 'york', category: 'museums', type: 'museum', name: 'National Railway Museum', lat: 53.9600, lng: -1.0960, rating: 4.7, costLevel: 0, description: 'Free museum with royal carriages and the Mallard.' },
  // Edinburgh
  { id: 'edinburgh-castle', cityId: 'edinburgh', category: 'history', type: 'castle', name: 'Edinburgh Castle', lat: 55.9486, lng: -3.1999, rating: 4.6, costLevel: 3, description: 'Fortress on an extinct volcano, home to the Scottish crown jewels.' },
  { id: 'edinburgh-arthurs-seat', cityId: 'edinburgh', category: 'outdoors', type: 'viewpoint', name: "Arthur's Seat", lat: 55.9441, lng: -3.1618, rating: 4.8, costLevel: 0, description: 'A 45-minute climb to the top of the city.' },
  { id: 'edinburgh-national-museum', cityId: 'edinburgh', category: 'museums', type: 'museum', name: 'National Museum of Scotland', lat: 55.9469, lng: -3.1897, rating: 4.7, costLevel: 0, description: 'Free museum with a rooftop terrace over the Old Town.' },
  { id: 'edinburgh-grassmarket', cityId: 'edinburgh', category: 'nightlife', type: 'bar', name: 'Grassmarket pubs', lat: 55.9474, lng: -3.1960, rating: 4.4, costLevel: 2, description: 'Old pubs under the castle crag, some with live folk music.' },
  { id: 'edinburgh-stockbridge', cityId: 'edinburgh', category: 'food', type: 'market', name: 'Stockbridge Market', lat: 55.9580, lng: -3.2080, rating: 4.5, costLevel: 2, description: 'Sunday food market in a village-like neighbourhood.' },
  { id: 'edinburgh-victoria-street', cityId: 'edinburgh', category: 'shopping', type: 'shop', name: 'Victoria Street', lat: 55.9480, lng: -3.1930, rating: 4.5, costLevel: 2, description: 'A curving, colourful street of independent shops.' },

  // Dublin
  { id: 'dublin-temple-bar', cityId: 'dublin', category: 'nightlife', type: 'bar', name: 'Traditional music pubs', lat: 53.3455, lng: -6.2640, rating: 4.3, costLevel: 2, description: 'Nightly trad sessions in pubs around Temple Bar and beyond.' },
  { id: 'dublin-trinity', cityId: 'dublin', category: 'history', type: 'landmark', name: 'Trinity College and the Book of Kells', lat: 53.3438, lng: -6.2546, rating: 4.5, costLevel: 2, description: 'A 9th-century gospel book and the Long Room library.' },
  { id: 'dublin-national-gallery', cityId: 'dublin', category: 'museums', type: 'museum', name: 'National Gallery of Ireland', lat: 53.3409, lng: -6.2525, rating: 4.6, costLevel: 0, description: 'Free, with Caravaggio, Vermeer and Jack B. Yeats.' },
  { id: 'dublin-phoenix-park', cityId: 'dublin', category: 'outdoors', type: 'park', name: 'Phoenix Park', lat: 53.3559, lng: -6.3298, rating: 4.7, costLevel: 0, description: 'One of Europe\'s largest city parks, with wild deer.' },
  { id: 'dublin-fallon-byrne', cityId: 'dublin', category: 'food', type: 'restaurant', name: 'Fallon & Byrne food hall', lat: 53.3430, lng: -6.2630, rating: 4.4, costLevel: 2, description: 'Irish produce downstairs, wine cellar and restaurant above.' },
  { id: 'dublin-grafton-street', cityId: 'dublin', category: 'shopping', type: 'shop', name: 'Grafton Street', lat: 53.3410, lng: -6.2600, rating: 4.3, costLevel: 2, description: 'Pedestrian shopping street with buskers.' },
  // Galway
  { id: 'galway-latin-quarter', cityId: 'galway', category: 'nightlife', type: 'bar', name: 'Latin Quarter pubs', lat: 53.2715, lng: -9.0530, rating: 4.7, costLevel: 2, description: 'Some of Ireland\'s best trad sessions, every night.' },
  { id: 'galway-salthill', cityId: 'galway', category: 'outdoors', type: 'walk', name: 'Salthill Promenade', lat: 53.2590, lng: -9.0800, rating: 4.6, costLevel: 0, description: 'A seafront walk ending with a kick of the wall for luck.' },
  { id: 'galway-market', cityId: 'galway', category: 'food', type: 'market', name: 'Galway Market', lat: 53.2730, lng: -9.0530, rating: 4.5, costLevel: 1, description: 'Weekend market by St Nicholas\' Church, great for oysters.' },
]

export const places = raw.map((p) => ({
  image: null,
  ...p,
  latitude: p.lat,
  longitude: p.lng,
  estimatedCost: p.estimatedCost ?? PLACE_COST_EUR[p.costLevel] ?? 0,
}))

export const placeById = Object.fromEntries(places.map((p) => [p.id, p]))
export const getPlace = (id) => placeById[id]
export const placesInCity = (cityId) => places.filter((p) => p.cityId === cityId)
