// Where a piece of data comes from, as one small label. Used by place cards, train cards and the copilot.
//
//   LIVE              fetched from a live provider just now / recently (live places)
//   EUROWANDER PICK   EuroWander's curated guide
//   OPENSTREETMAP     notable places added from OpenStreetMap when a city opens
//   SCHEDULED         a real timetable, with no real-time information
//   REAL-TIME         times updated by the operator's live feed
//   ESTIMATE          worked out by EuroWander (sample train times, distance estimates)
//
// The order the copilot trusts them in (never let general AI knowledge override 1):
//   1 live provider data · 2 verified saved data · 3 curated guide · 4 deterministic estimates · 5 general knowledge
export const SOURCES = {
  live: { label: 'Live', tone: 'live', title: 'Fetched from a live places service' },
  curated: { label: 'EuroWander pick', tone: 'pick', title: 'From EuroWander’s own guide' },
  osm: { label: 'OpenStreetMap', tone: 'muted', title: 'A notable place listed on OpenStreetMap' },
  scheduled: { label: 'Scheduled', tone: 'muted', title: 'From the timetable. No live updates for this train.' },
  realtime: { label: 'Real-time', tone: 'live', title: 'Updated by the operator’s live data' },
  estimate: { label: 'Estimate', tone: 'estimate', title: 'Worked out by EuroWander, not a timetable' },
}

export function placeSource(place) {
  if (!place) return 'curated'
  if (place.source === 'live') return 'live'
  if (place.source === 'osm') return 'osm'
  return 'curated'
}

export const DATA_PRIORITY = ['live', 'verified', 'curated', 'estimate', 'general']
