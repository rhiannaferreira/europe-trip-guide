// Travel Mode's map, on the shared MapLibre map with the simpler outdoor style: only today. The day's
// stops in order (done ones faded, the next one larger and named), the walk between them, saved places
// near the route, the station when today has a saved train, and you, once you've shared your location.
// Everything on it is also in the list under the map. Directions open the phone's maps app.
import { useEffect, useMemo } from 'react'
import { placeById } from '../data/places.js'
import { distanceKm } from '../utils/distance.js'
import { nextUp } from '../travel/travelModel.js'
import { Directions } from '../travel/ui.jsx'
import { stationName } from '../services/live/trains.js'
import EuroWanderMap, { useEWMap } from './EuroWanderMap.jsx'
import { useGeoLayer } from './useMapLayer.js'
import { LABELS_START } from './styles/euroWanderStyle.js'
import { calm, collection, frame, point } from './mapUtils.js'
import { dayData } from './mapRoutes.js'

const BOLD = ['Noto Sans Bold']
const REGULAR = ['Noto Sans Regular']

function Layers({ stops, nextId, saved, focusPlace, onDay, position, stations, frameKey, points }) {
  const { map } = useEWMap()
  const states = Object.fromEntries(stops.map((e) => [e.id, e.id === nextId ? 'next' : e.state]))
  const { stops: stopData, line } = useMemo(
    () =>
      dayData(
        stops.map((e) => e.place),
        { states },
      ),
    [JSON.stringify(states), stops.map((e) => e.id).join()],
  ) // eslint-disable-line react-hooks/exhaustive-deps

  useGeoLayer(
    'tm-line',
    line,
    (P) => [
      { id: 'tm-line-case', type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.dayCase, 'line-width': 8, 'line-opacity': 0.85 } },
      {
        id: 'tm-line-path',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': P.day, 'line-width': 4, 'line-dasharray': [0.1, 1.8], 'line-opacity': ['case', ['==', ['get', 'done'], true], 0.35, 0.95] },
      },
    ],
    { before: LABELS_START },
  )

  const savedData = useMemo(() => collection(saved.map((p) => point(p.lng, p.lat, { name: p.name }))), [saved])
  useGeoLayer('tm-saved', savedData, (P) => [
    {
      id: 'tm-saved-icon',
      type: 'symbol',
      layout: {
        'icon-image': `heart|${P.saved}`,
        'icon-allow-overlap': true,
        'text-field': ['get', 'name'],
        'text-font': REGULAR,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-optional': true,
        'text-max-width': 8,
      },
      paint: { 'text-color': P.saved, 'text-halo-color': P.halo, 'text-halo-width': 1.5 },
    },
  ])

  const stationData = useMemo(() => collection(stations.map((s) => point(s.lng, s.lat, { name: stationName(s.name) }))), [stations])
  useGeoLayer('tm-station', stationData, (P) => [
    { id: 'tm-station-dot', type: 'circle', paint: { 'circle-radius': 7, 'circle-color': P.card, 'circle-stroke-color': P.train, 'circle-stroke-width': 3 } },
    {
      id: 'tm-station-name',
      type: 'symbol',
      layout: { 'text-field': ['concat', ['get', 'name'], ' (station)'], 'text-font': BOLD, 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 0.9], 'text-max-width': 9 },
      paint: { 'text-color': P.train, 'text-halo-color': P.halo, 'text-halo-width': 1.8 },
    },
  ])

  useGeoLayer('tm-stops', stopData, (P) => {
    const st = ['get', 'state']
    const faded = ['in', st, ['literal', ['done', 'skipped']]]
    return [
      { id: 'tm-next-halo', type: 'circle', filter: ['==', st, 'next'], paint: { 'circle-radius': 26, 'circle-color': P.accentSoft } },
      {
        id: 'tm-stop-dot',
        type: 'circle',
        paint: {
          'circle-radius': ['case', ['==', st, 'next'], 17, 13],
          'circle-color': ['match', st, 'next', P.accent, 'current', P.accent, 'done', P.muted, 'skipped', P.muted, 'earlier', P.muted, P.day],
          'circle-opacity': ['case', faded, 0.55, 1],
          'circle-stroke-color': P.dayCase,
          'circle-stroke-width': 3,
        },
      },
      {
        id: 'tm-stop-num',
        type: 'symbol',
        layout: {
          'text-field': ['to-string', ['get', 'n']],
          'text-font': BOLD,
          'text-size': ['case', ['==', st, 'next'], 15, 13],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#ffffff', 'text-opacity': ['case', faded, 0.85, 1] },
      },
      {
        id: 'tm-stop-name',
        type: 'symbol',
        layout: {
          'text-field': ['case', ['==', st, 'next'], ['concat', ['get', 'name'], ' · next'], ['get', 'name']],
          'text-font': ['case', ['==', st, 'next'], ['literal', BOLD], ['literal', REGULAR]],
          'text-size': ['case', ['==', st, 'next'], 14, 12],
          'text-anchor': 'left',
          'text-offset': [1.5, 0],
          'text-max-width': 10,
          'symbol-sort-key': ['case', ['==', st, 'next'], 0, 1],
          'text-optional': true,
        },
        paint: { 'text-color': ['case', faded, P.muted, P.ink], 'text-halo-color': P.halo, 'text-halo-width': 2 },
      },
    ]
  })

  const focusData = useMemo(
    () => collection(focusPlace && !onDay.has(focusPlace.id) ? [point(focusPlace.lng, focusPlace.lat, { name: focusPlace.name })] : []),
    [focusPlace, onDay],
  )
  useGeoLayer('tm-focus', focusData, (P) => [
    { id: 'tm-focus-dot', type: 'circle', paint: { 'circle-radius': 12, 'circle-color': P.accent, 'circle-stroke-color': P.dayCase, 'circle-stroke-width': 3 } },
    {
      id: 'tm-focus-name',
      type: 'symbol',
      layout: { 'text-field': ['get', 'name'], 'text-font': BOLD, 'text-size': 13, 'text-anchor': 'left', 'text-offset': [1.4, 0] },
      paint: { 'text-color': P.ink, 'text-halo-color': P.halo, 'text-halo-width': 2 },
    },
  ])

  const youData = useMemo(() => collection(position ? [point(position.lng, position.lat)] : []), [position])
  useGeoLayer('tm-you', youData, (P) => [
    { id: 'tm-you-halo', type: 'circle', paint: { 'circle-radius': 18, 'circle-color': P.you, 'circle-opacity': 0.18 } },
    { id: 'tm-you-dot', type: 'circle', paint: { 'circle-radius': 8, 'circle-color': P.you, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } },
  ])

  useEffect(() => {
    if (focusPlace) map.flyTo(calm({ center: [focusPlace.lng, focusPlace.lat], zoom: 16 }))
    else frame(map, points, { padding: 44, maxZoom: 16, single: 15 })
  }, [frameKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function TravelDayMap({ env, focusId, position }) {
  const { schedule, trip, day, city, nowMin } = env
  const stops = schedule.entries.filter((e) => e.kind === 'place')
  const n = nowMin != null ? nextUp(schedule, nowMin) : null
  const nextId = n?.entry?.kind === 'place' ? n.entry.id : stops.find((e) => e.state === 'upcoming')?.id
  const onDay = useMemo(() => new Set(stops.map((e) => e.id)), [stops.map((e) => e.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  // Saved places in this city, within about 1 km of one of today's stops.
  const saved = useMemo(
    () =>
      Object.keys(trip.statuses || {})
        .map((id) => placeById[id])
        .filter((p) => p && p.cityId === day.cityId && !onDay.has(p.id) && stops.some((e) => distanceKm(e.place, p) <= 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.statuses, day.cityId, onDay],
  )
  // Today's train: its station in this city (arrival, or departure for an evening train out).
  const train = schedule.train
  const stations = useMemo(
    () => (train ? [train.destination, train.origin].filter((s) => s && Number.isFinite(s.lat) && distanceKm(s, city) <= 30).slice(0, 1) : []),
    [train, city],
  )
  const focusPlace = focusId ? placeById[focusId] : null
  const points = [...stops.map((e) => e.place), ...(position ? [position] : [])]
  if (!points.length) points.push(...(stations.length ? stations : [city]))
  const frameKey = `${points.map((p) => `${p.lat},${p.lng}`).join(';')}|${focusId || ''}`
  const next = stops.find((e) => e.id === nextId)
  const first = points[0]

  return (
    <div className="tm-map-wrap">
      <EuroWanderMap
        className="tm-map"
        simple
        scrollZoom={false}
        center={[first.lng, first.lat]}
        zoom={14}
        label="Map of today’s stops. Every stop is also in the list below the map."
      >
        <Layers stops={stops} nextId={nextId} saved={saved} focusPlace={focusPlace} onDay={onDay} position={position} stations={stations} frameKey={frameKey} points={points} />
      </EuroWanderMap>
      <div className="tm-map-under">
        {next && (
          <div className="tm-actions">
            <Directions place={next.place} className="btn btn-primary tm-btn" label={`Directions to ${next.place.name}`} />
          </div>
        )}
        {focusPlace && focusPlace.id !== next?.place.id && (
          <div className="tm-actions">
            <Directions place={focusPlace} className="btn tm-btn" label={`Directions to ${focusPlace.name}`} />
          </div>
        )}
        <ol className="tm-maplist">
          {stops.map((e, i) => (
            <li key={e.id} className={`tm-${e.state}`}>
              {i + 1}. {e.place.name}
              <span className="tm-muted"> · {e.id === nextId ? 'next' : { done: 'done', skipped: 'skipped', current: 'now', earlier: 'earlier', upcoming: 'later' }[e.state]}</span>
            </li>
          ))}
        </ol>
        {stations.length > 0 && <p className="tm-muted">🚉 {stationName(stations[0].name)}: your train’s station today.</p>}
        {saved.length > 0 && <p className="tm-muted">♥ Hearts: places you saved near today’s stops.</p>}
        {position && <p className="tm-muted">🔵 Blue dot: you (read once from your location, not tracked).</p>}
        {!stops.length && <p className="tm-muted">Nothing planned today, so the map shows {city.name}.</p>}
      </div>
    </div>
  )
}
