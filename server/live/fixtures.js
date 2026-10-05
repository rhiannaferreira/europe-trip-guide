// Provider responses shaped like the real ones (Geoapify Places v2, Transitous/MOTIS v6), for tests.

export const geoFeature = (over = {}, raw = {}) => ({
  type: 'Feature',
  properties: {
    name: 'Roscioli',
    country: 'Italy',
    city: 'Rome',
    street: 'Via dei Giubbonari',
    housenumber: '21',
    postcode: '00186',
    lat: 41.8941,
    lon: 12.4735,
    formatted: 'Roscioli, Via dei Giubbonari 21, 00186 Rome RM, Italy',
    address_line1: 'Roscioli',
    address_line2: 'Via dei Giubbonari 21, 00186 Rome RM, Italy',
    categories: ['catering', 'catering.restaurant', 'catering.restaurant.italian'],
    details: ['details.catering'],
    catering: { cuisine: 'italian' },
    opening_hours: 'Mo-Sa 12:30-16:00,19:00-23:30',
    website: 'https://www.salumeriaroscioli.com',
    datasource: { sourcename: 'openstreetmap', attribution: '© OpenStreetMap contributors', license: 'Open Database License', raw: { osm_id: 123456, osm_type: 'n', name: 'Roscioli', cuisine: 'italian', phone: '+39 06 687 5287', ...raw } },
    place_id: '51abc123def',
    distance: 120,
    ...over,
  },
  geometry: { type: 'Point', coordinates: [over.lon ?? 12.4735, over.lat ?? 41.8941] },
})

export const geoResponse = (features) => ({ type: 'FeatureCollection', features })

const t = (h, m, day = '2026-10-06') => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`

export const motisPlace = (name, stopId, time, { scheduled = time, track, scheduledTrack, tz = 'Europe/Paris', cancelled } = {}) => ({
  name,
  stopId,
  lat: 48.88,
  lon: 2.355,
  tz,
  arrival: time,
  departure: time,
  scheduledArrival: scheduled,
  scheduledDeparture: scheduled,
  ...(track ? { track } : {}),
  ...(scheduledTrack ? { scheduledTrack } : {}),
  ...(cancelled ? { cancelled } : {}),
})

export const motisLeg = ({ from, to, dep, arr, schedDep = dep, schedArr = arr, realTime = false, cancelled = false, name = 'EST 9311', agency = 'Eurostar', mode = 'HIGHSPEED_RAIL', tripId = 'trip-1', depTrack, ticket } = {}) => ({
  mode,
  from: motisPlace(from[0], from[1], dep, { scheduled: schedDep, track: depTrack }),
  to: motisPlace(to[0], to[1], arr, { scheduled: schedArr }),
  duration: (Date.parse(arr) - Date.parse(dep)) / 1000,
  startTime: dep,
  endTime: arr,
  scheduledStartTime: schedDep,
  scheduledEndTime: schedArr,
  realTime,
  scheduled: true,
  cancelled,
  agencyName: agency,
  displayName: name,
  headsign: to[0],
  tripId,
  intermediateStops: [{ name: 'Brussels-Midi' }],
  ...(ticket ? { ticketUrls: { web: ticket } } : {}),
})

const walk = (at) => ({ mode: 'WALK', from: { name: 'START', lat: 1, lon: 1 }, to: { name: 'END', lat: 1, lon: 1 }, startTime: at, endTime: at, scheduledStartTime: at, scheduledEndTime: at, realTime: false, scheduled: true, duration: 60 })

export const PARIS = ['Paris Gare du Nord', 'fr-sncf_StopArea:OCE87271007']
export const AMS = ['Amsterdam Centraal', 'nl-ns_NL:S:asd']
export const BRU = ['Brussels-Midi', 'be-sncb_8814001']

export const directItinerary = (over = {}) => ({
  id: 'itin-direct-1',
  duration: 12300,
  startTime: t(6, 25),
  endTime: t(9, 50),
  transfers: 0,
  legs: [walk(t(6, 20)), motisLeg({ from: PARIS, to: AMS, dep: t(6, 25), arr: t(9, 50), ...over }), walk(t(9, 50))],
})

export const transferItinerary = () => ({
  id: 'itin-change-1',
  duration: 15000,
  startTime: t(7, 13),
  endTime: t(11, 23),
  transfers: 1,
  legs: [
    motisLeg({ from: PARIS, to: BRU, dep: t(7, 13), arr: t(8, 35), name: 'EST 9411', tripId: 'trip-a' }),
    motisLeg({ from: BRU, to: AMS, dep: t(9, 10), arr: t(11, 23), name: 'IC 9223', agency: 'NS International', mode: 'LONG_DISTANCE', tripId: 'trip-b' }),
  ],
})

export const planResponse = (itineraries) => ({ requestParameters: {}, debugOutput: {}, from: {}, to: {}, direct: [], itineraries, previousPageCursor: 'prev', nextPageCursor: 'next' })

export const geocodeMatches = [
  { type: 'STOP', name: 'Paris Gare du Nord', id: PARIS[1], lat: 48.8809, lon: 2.3553, country: 'FR', tz: 'Europe/Paris', tokens: [], areas: [{ name: 'Paris', adminLevel: 8, matched: true, default: true }], score: 1, importance: 0.9, modes: ['HIGHSPEED_RAIL', 'REGIONAL_RAIL', 'SUBWAY'] },
  { type: 'STOP', name: 'Paris Gare de Lyon', id: 'fr-sncf_StopArea:OCE87686006', lat: 48.8443, lon: 2.3743, country: 'FR', tz: 'Europe/Paris', tokens: [], areas: [{ name: 'Paris', matched: true }], score: 0.9, importance: 0.85, modes: ['HIGHSPEED_RAIL'] },
  { type: 'STOP', name: 'Paris Rue de Rivoli (bus)', id: 'fr-idf_bus_1', lat: 48.86, lon: 2.34, tokens: [], areas: [], score: 0.5, importance: 0.1, modes: ['BUS'] },
  { type: 'ADDRESS', name: 'Rue de Paris', id: 'addr-1', lat: 48.8, lon: 2.3, tokens: [], areas: [], score: 0.4 },
]
