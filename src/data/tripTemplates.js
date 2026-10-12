// Ready-made trips ("trip ideas"): curated routes people can open, explore and copy into their own trip.
//
// A template is a Build My Trip plan in disguise: an ordered list of stops with nights, plus a few
// preferences. Everything else (countries, photos, journeys, travel time, pace, budget, hidden gems) is
// worked out from the city data and the planner, so it's never stored twice and never goes stale.
// The day-by-day ideas live in templateDays.js, which only the template's own page loads.
//
// Shape of a template:
//   id            stable id, used in analytics and links between templates (never shown)
//   slug          the address: /trip-ideas/<slug>
//   title         the card and page title ("10 Days in Italy")
//   name          a short name for the trip ("Classic Italy")
//   stops         [{ cityId, nights }] in travel order (cities from cities.js). A trip of N nights has N + 1
//                 days: the last day is for leaving (the same rule as the rest of the app, see planner/plan.js)
//   interests     Build My Trip interest ids (planner/preferences.js), used for day plans and "more like this"
//   tags          short labels for the card
//   categories    ids from TEMPLATE_CATEGORIES
//   description   one sentence for the card
//   featured      shown on the home page
//   heroCityId    whose photo the card uses
//   variants      ids of related templates ("7 days", "Hidden Italy"...)
//   maxLegMinutes optional: the longest journey the trip expects (the builder warns above it)
//
// Only cities Eurowander covers well are used; templates.test.js checks every id.
export const TEMPLATE_CATEGORIES = [
  { id: 'popular', label: 'Popular', icon: '⭐' },
  { id: 'quick', label: 'Quick getaways', icon: '⚡' },
  { id: 'train', label: 'By train', icon: '🚆' },
  { id: 'gems', label: 'Hidden gems', icon: '💎' },
  { id: 'food-culture', label: 'Food & culture', icon: '🍝' },
  { id: 'nature', label: 'Nature', icon: '🏔️' },
  { id: 'multi-country', label: 'Multi-country', icon: '🇪🇺' },
]

export const tripTemplates = [
  {
    id: 'classic-italy-10',
    slug: '10-days-in-italy',
    title: '10 Days in Italy',
    name: 'Classic Italy',
    stops: [
      { cityId: 'rome', nights: 3 },
      { cityId: 'florence', nights: 3 },
      { cityId: 'venice', nights: 3 },
    ],
    interests: ['food', 'history', 'museums'],
    tags: ['Food', 'History', 'Art', 'Train-friendly'],
    categories: ['popular', 'train', 'food-culture'],
    description: 'Classic Italy with enough time to actually enjoy each stop.',
    featured: true,
    heroCityId: 'florence',
    variants: ['italy-week-7', 'hidden-italy-8', 'italy-switzerland-12'],
  },
  {
    id: 'italy-week-7',
    slug: '7-days-in-italy',
    title: 'Italy in One Week',
    name: 'Italy in a week',
    stops: [
      { cityId: 'rome', nights: 2 },
      { cityId: 'florence', nights: 2 },
      { cityId: 'venice', nights: 2 },
    ],
    interests: ['history', 'museums', 'food'],
    tags: ['History', 'Art', 'Train-friendly'],
    categories: ['popular', 'train'],
    description: 'Rome, Florence and Venice at a brisker pace, linked by fast trains.',
    featured: false,
    heroCityId: 'rome',
    variants: ['classic-italy-10', 'hidden-italy-8'],
  },
  {
    id: 'hidden-italy-8',
    slug: 'hidden-italy',
    title: '8 Days of Hidden Italy',
    name: 'Hidden Italy',
    stops: [
      { cityId: 'lucca', nights: 3 },
      { cityId: 'treviso', nights: 2 },
      { cityId: 'chioggia', nights: 2 },
    ],
    interests: ['food', 'history', 'nature'],
    tags: ['Hidden gems', 'Food', 'Slow travel'],
    categories: ['gems', 'food-culture', 'train'],
    description: 'Walled Lucca, canal-side Treviso and the fishing town of Chioggia: Italy without the queues.',
    featured: true,
    heroCityId: 'lucca',
    variants: ['classic-italy-10', 'italy-week-7'],
  },
  {
    id: 'italy-switzerland-12',
    slug: 'italy-and-switzerland-by-train',
    title: 'Italy & Switzerland by Train',
    name: 'Italy and the Alps',
    stops: [
      { cityId: 'rome', nights: 3 },
      { cityId: 'florence', nights: 2 },
      { cityId: 'milan', nights: 2 },
      { cityId: 'lucerne', nights: 2 },
      { cityId: 'zurich', nights: 2 },
    ],
    interests: ['history', 'museums', 'nature'],
    tags: ['Art', 'Mountains', 'Scenic trains'],
    categories: ['train', 'multi-country', 'nature'],
    description: 'From Roman ruins to Swiss lakes, crossing the Alps by train.',
    featured: false,
    heroCityId: 'lucerne',
    variants: ['classic-italy-10', 'swiss-alps-7'],
  },
  {
    id: 'spain-highlights-8',
    slug: '8-days-in-spain',
    title: '8 Days in Spain',
    name: 'Spain highlights',
    stops: [
      { cityId: 'barcelona', nights: 3 },
      { cityId: 'madrid', nights: 2 },
      { cityId: 'seville', nights: 2 },
    ],
    interests: ['food', 'nightlife', 'architecture'],
    tags: ['Food', 'Nightlife', 'Architecture', 'Fast trains'],
    categories: ['popular', 'food-culture', 'train'],
    description: 'Gaudí, the Prado and flamenco nights, linked by Spain’s high-speed trains.',
    featured: true,
    heroCityId: 'seville',
    variants: [],
  },
  {
    id: 'portugal-escape-5',
    slug: '5-days-in-portugal',
    title: '5 Days in Portugal',
    name: 'Portugal escape',
    stops: [
      { cityId: 'lisbon', nights: 2 },
      { cityId: 'porto', nights: 2 },
    ],
    interests: ['food', 'history', 'culture'],
    tags: ['Food', 'Views', 'Short break'],
    categories: ['quick', 'food-culture', 'popular'],
    description: 'Two hilly, tiled cities and the wine in between, in one easy long weekend.',
    featured: true,
    heroCityId: 'lisbon',
    variants: ['portugal-rail-7'],
  },
  {
    id: 'portugal-rail-7',
    slug: 'portugal-by-rail',
    title: 'Portugal by Rail',
    name: 'Portugal by rail',
    stops: [
      { cityId: 'lisbon', nights: 3 },
      { cityId: 'coimbra', nights: 1 },
      { cityId: 'porto', nights: 2 },
    ],
    interests: ['food', 'history', 'culture'],
    tags: ['Food', 'History', 'Hidden gem stop'],
    categories: ['train', 'food-culture', 'gems'],
    description: 'Lisbon to Porto with a night in the old university town of Coimbra on the way.',
    featured: false,
    heroCityId: 'porto',
    variants: ['portugal-escape-5'],
  },
  {
    id: 'france-highlights-7',
    slug: '7-days-in-france',
    title: '7 Days in France',
    name: 'France highlights',
    stops: [
      { cityId: 'paris', nights: 2 },
      { cityId: 'lyon', nights: 2 },
      { cityId: 'nice', nights: 2 },
    ],
    interests: ['food', 'museums', 'beaches'],
    tags: ['Food', 'Art', 'Riviera', 'TGV'],
    categories: ['popular', 'food-culture', 'train'],
    description: 'Paris, France’s food capital and the Riviera, all by TGV.',
    featured: true,
    heroCityId: 'paris',
    variants: ['rail-adventure-14'],
  },
  {
    id: 'amsterdam-belgium-6',
    slug: 'amsterdam-and-belgium',
    title: 'Amsterdam & Belgium',
    name: 'Canals and chocolate',
    stops: [
      { cityId: 'amsterdam', nights: 2 },
      { cityId: 'brussels', nights: 1 },
      { cityId: 'bruges', nights: 2 },
    ],
    interests: ['food', 'museums', 'nightlife'],
    tags: ['Canals', 'Beer & chocolate', 'Short hops'],
    categories: ['quick', 'multi-country', 'food-culture', 'train'],
    description: 'Canals, beer and chocolate, with no train longer than two hours.',
    featured: false,
    heroCityId: 'bruges',
    variants: ['rail-adventure-14'],
  },
  {
    id: 'swiss-alps-7',
    slug: 'swiss-alps-by-train',
    title: '7 Days in Switzerland by Train',
    name: 'Swiss Alps by train',
    stops: [
      { cityId: 'zurich', nights: 2 },
      { cityId: 'lucerne', nights: 4 },
    ],
    interests: ['nature', 'history'],
    tags: ['Mountains', 'Lakes', 'Scenic trains'],
    categories: ['nature', 'train'],
    description: 'Lake swims in Zurich, then Lucerne as a base for boats, mountain railways and Rigi.',
    featured: true,
    heroCityId: 'lucerne',
    variants: ['italy-switzerland-12', 'central-europe-10'],
  },
  {
    id: 'austria-rail-7',
    slug: 'austria-by-rail',
    title: 'Austria by Rail',
    name: 'Austria by rail',
    stops: [
      { cityId: 'vienna', nights: 3 },
      { cityId: 'graz', nights: 1 },
      { cityId: 'salzburg', nights: 2 },
    ],
    interests: ['history', 'museums', 'food'],
    tags: ['Coffee houses', 'Music', 'Hidden gem stop'],
    categories: ['train', 'food-culture', 'gems'],
    description: 'Grand Vienna, laid-back Graz and Mozart’s Salzburg, with mountain views from the train.',
    featured: false,
    heroCityId: 'salzburg',
    variants: ['central-europe-10'],
  },
  {
    id: 'central-europe-10',
    slug: 'central-europe-by-train',
    title: '10 Days Through Central Europe',
    name: 'Central Europe by train',
    stops: [
      { cityId: 'munich', nights: 2 },
      { cityId: 'salzburg', nights: 2 },
      { cityId: 'vienna', nights: 3 },
      { cityId: 'prague', nights: 2 },
    ],
    interests: ['history', 'food', 'nightlife'],
    tags: ['History', 'Beer halls', 'Train-friendly'],
    categories: ['popular', 'train', 'multi-country'],
    description: 'Beer gardens, baroque Salzburg, imperial Vienna and Prague’s old town, by train.',
    featured: true,
    heroCityId: 'prague',
    variants: ['austria-rail-7', 'rail-adventure-14'],
  },
  {
    id: 'rail-adventure-14',
    slug: '14-day-europe-by-rail',
    title: '14-Day Europe by Rail',
    name: 'European rail adventure',
    stops: [
      { cityId: 'paris', nights: 3 },
      { cityId: 'brussels', nights: 2 },
      { cityId: 'amsterdam', nights: 3 },
      { cityId: 'berlin', nights: 3 },
      { cityId: 'prague', nights: 2 },
    ],
    interests: ['museums', 'history', 'nightlife'],
    tags: ['Five countries', 'Museums', 'No flights'],
    categories: ['popular', 'train', 'multi-country'],
    description: 'Five capitals and five countries in two weeks, without a single flight.',
    featured: true,
    heroCityId: 'amsterdam',
    variants: ['amsterdam-belgium-6', 'central-europe-10'],
    maxLegMinutes: 360,
  },
  {
    id: 'croatian-coast-7',
    slug: 'croatian-coast',
    title: 'Croatian Coast',
    name: 'Dalmatian coast',
    stops: [
      { cityId: 'sibenik', nights: 1 },
      { cityId: 'split', nights: 3 },
      { cityId: 'dubrovnik', nights: 2 },
    ],
    interests: ['beaches', 'history', 'nature'],
    tags: ['Coast', 'Old towns', 'Coastal buses'],
    categories: ['nature', 'gems'],
    description: 'Waterfalls at Krka, Diocletian’s palace and Dubrovnik’s walls, along the Adriatic.',
    featured: false,
    heroCityId: 'dubrovnik',
    variants: [],
    maxLegMinutes: 300,
  },
  {
    id: 'greek-escape-7',
    slug: 'greek-escape',
    title: 'Greek Escape',
    name: 'Athens and the north',
    stops: [
      { cityId: 'athens', nights: 4 },
      { cityId: 'thessaloniki', nights: 2 },
    ],
    interests: ['history', 'food', 'nightlife'],
    tags: ['Ancient sites', 'Food', 'Nightlife'],
    categories: ['food-culture', 'gems'],
    description: 'The Acropolis and Athens’ neighbourhoods, then Thessaloniki’s markets and waterfront.',
    featured: false,
    heroCityId: 'athens',
    variants: [],
    maxLegMinutes: 300,
  },
  {
    id: 'britain-rail-8',
    slug: 'britain-by-rail',
    title: 'Britain by Rail',
    name: 'London to Edinburgh',
    stops: [
      { cityId: 'london', nights: 3 },
      { cityId: 'york', nights: 2 },
      { cityId: 'edinburgh', nights: 2 },
    ],
    interests: ['history', 'museums', 'nightlife'],
    tags: ['History', 'Museums', 'East Coast line'],
    categories: ['train', 'popular'],
    description: 'London, medieval York and Edinburgh up the East Coast line.',
    featured: false,
    heroCityId: 'edinburgh',
    variants: [],
  },
]

export const templateById = Object.fromEntries(tripTemplates.map((t) => [t.id, t]))
export const templateBySlug = Object.fromEntries(tripTemplates.map((t) => [t.slug, t]))
export const featuredTemplates = tripTemplates.filter((t) => t.featured)
export const categoryById = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c.id, c]))

// Facts every card needs, from the stops alone (no planner, so the home page stays light).
export const templateNights = (t) => t.stops.reduce((n, s) => n + s.nights, 0)
export const templateDayCount = (t) => templateNights(t) + 1
export const templatePath = (t) => `/trip-ideas/${t.slug}`
