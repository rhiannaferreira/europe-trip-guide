// The planner's map (Explore, a country, a city, My trip, and the Days tab), on the shared MapLibre map.
// Same props as the Leaflet MapView it replaces, plus `journeys` (saved trains) and `onAsk`.
//
// Modes come from the props rather than separate maps:
//   EXPLORE  cities and discovery places (clustered), live places when zoomed into a city
//   TRIP     the route between trip cities (rail-styled, saved trains through their real stations)
//   DAY      one day's stops, numbered in order and joined, everything else faded
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { placeById } from '../data/places.js'
import { cityById } from '../data/cities.js'
import { placesAt } from '../services/live/places.js'
import { track } from '../lib/analytics.js'
import { useLiveEnabled } from '../components/LiveBits.jsx'
import MapLegend from '../components/MapLegend.jsx'
import { pinKind } from '../lib/pinKinds.js'
import { WELL_KNOWN, useFame } from '../lib/fame.js'
import { placeIcon } from '../lib/placeIcons.js'
import EuroWanderMap, { useEWMap } from './EuroWanderMap.jsx'
import { useGeoLayer, useLayerEvents, useMapEvent } from './useMapLayer.js'
import { LABELS_START } from './styles/euroWanderStyle.js'
import { interestRings, pinIconId } from './mapMarkers.js'
import { cityData, dayData, stationData, tripRouteData } from './mapRoutes.js'
import { calm, collection, frame, point } from './mapUtils.js'
import { LIVE_MIN_ZOOM, useLivePins } from './useLivePins.js'
import { TAP_MIN_ZOOM } from './MapPlaceItem.jsx'
import { CardShell, LegCardBody, LiveCardBody, PlaceCardBody, TapCardBody } from './MapCard.jsx'

const BOLD = ['Noto Sans Bold']
const REGULAR = ['Noto Sans Regular']
const z = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops]
const LIVE_ATTRIBUTION = 'Places: <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Powered by Geoapify</a>'
const TRAIN_ATTRIBUTION = 'Trains: <a href="https://transitous.org/" target="_blank" rel="noopener">Transitous</a>'

// ---------- Layers ----------

function RouteLayer({ routeCities, legs, journeys, selectedHop, onPick }) {
  const data = useMemo(() => tripRouteData(routeCities, legs, { journeys, selectedHop }), [routeCities, legs, journeys, selectedHop])
  useGeoLayer(
    'ew-route',
    data,
    (P) => {
      const width = z(3, 2.4, 7, 4, 12, 6)
      const mode = (m) => ['all', ['==', ['get', 'mode'], m], ['!', ['==', ['get', 'journey'], true]]]
      return [
        // A soft glow under the selected hop.
        {
          id: 'ew-route-glow',
          type: 'line',
          filter: ['==', ['get', 'selected'], true],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.accentSoft, 'line-width': z(3, 12, 10, 20), 'line-blur': 2 },
        },
        {
          id: 'ew-route-case',
          type: 'line',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.routeCase, 'line-width': z(3, 4.6, 7, 6.6, 12, 9), 'line-opacity': 0.85 },
        },
        // Rail hops: the route colour with sleepers, the EuroWander train look. Estimates a touch lighter.
        {
          id: 'ew-route-rail',
          type: 'line',
          filter: mode('train'),
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.route, 'line-width': width, 'line-opacity': ['case', ['==', ['get', 'estimated'], true], 0.82, 1] },
        },
        {
          id: 'ew-route-bus',
          type: 'line',
          filter: mode('bus'),
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.route, 'line-width': width, 'line-dasharray': [1.6, 1.2] },
        },
        {
          id: 'ew-route-ferry',
          type: 'line',
          filter: mode('rail + ferry'),
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.route, 'line-width': width, 'line-dasharray': [0.1, 1.8] },
        },
        {
          id: 'ew-route-flight',
          type: 'line',
          filter: mode('flight'),
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.route, 'line-width': width, 'line-dasharray': [3, 2] },
        },
        // A saved, real train: the deeper rail colour, so booked journeys read apart from planned hops.
        {
          id: 'ew-route-journey',
          type: 'line',
          filter: ['==', ['get', 'journey'], true],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.train, 'line-width': width },
        },
        {
          id: 'ew-route-ties',
          type: 'line',
          minzoom: 4,
          filter: ['any', mode('train'), ['==', ['get', 'journey'], true]],
          paint: { 'line-color': P.routeCase, 'line-width': z(4, 1, 8, 1.6, 12, 2.4), 'line-dasharray': [0.25, 2.6], 'line-opacity': 0.9 },
        },
      ]
    },
    { before: LABELS_START },
  )
  // Direction of travel: small chevrons along the line, above the labels so they stay visible.
  useGeoLayer('ew-route-dir', data, (P) => [
    {
      id: 'ew-route-arrows',
      type: 'symbol',
      minzoom: 4,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 160,
        'text-field': '›',
        'text-font': BOLD,
        'text-size': z(4, 14, 10, 20),
        'text-keep-upright': false,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-offset': [0, -0.08],
      },
      paint: { 'text-color': P.routeCase, 'text-opacity': 0.95 },
    },
  ])
  useLayerEvents(['ew-route-rail', 'ew-route-bus', 'ew-route-ferry', 'ew-route-flight', 'ew-route-journey'], { click: (f) => onPick(f.properties.hop) })
  return null
}

function StationLayer({ routeCities, journeys, selectedHop }) {
  const { map } = useEWMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvent('zoomend', () => setZoom(map.getZoom()))
  // Stations only where they help: the hop you picked, or every saved train once zoomed in on the trip.
  const all = zoom >= 7
  const data = useMemo(() => stationData(routeCities, { journeys, selectedHop, all }), [routeCities, journeys, selectedHop, all])
  useGeoLayer(
    'ew-stations',
    data,
    (P) => [
      {
        id: 'ew-station-dot',
        type: 'circle',
        paint: { 'circle-radius': ['case', ['==', ['get', 'role'], 'change'], 3.5, 5], 'circle-color': P.card, 'circle-stroke-color': P.train, 'circle-stroke-width': 2.5 },
      },
      {
        id: 'ew-station-label',
        type: 'symbol',
        layout: { 'text-field': ['get', 'name'], 'text-font': REGULAR, 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.7], 'text-max-width': 9, 'text-optional': true },
        paint: { 'text-color': P.train, 'text-halo-color': P.halo, 'text-halo-width': 1.4 },
      },
    ],
    { attribution: TRAIN_ATTRIBUTION },
  )
  return null
}

function DayLayer({ places, selectedId, dayKey, onPick }) {
  const { map } = useEWMap()
  const { stops, line } = useMemo(() => dayData(places, { selectedId }), [places, selectedId])
  useGeoLayer(
    'ew-day-line',
    line,
    (P) => [
      { id: 'ew-day-case', type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.dayCase, 'line-width': 7, 'line-opacity': 0.8 } },
      { id: 'ew-day-path', type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.day, 'line-width': 3.5, 'line-dasharray': [0.1, 1.8] } },
    ],
    { before: LABELS_START },
  )
  useGeoLayer('ew-day-stops', stops, (P) => [
    { id: 'ew-day-halo', type: 'circle', filter: ['==', ['get', 'selected'], true], paint: { 'circle-radius': 22, 'circle-color': P.accentSoft } },
    {
      id: 'ew-day-dot',
      type: 'circle',
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 15, 13],
        'circle-color': ['case', ['==', ['get', 'selected'], true], P.accent, P.day],
        'circle-stroke-color': P.dayCase,
        'circle-stroke-width': 2.5,
      },
    },
    {
      id: 'ew-day-num',
      type: 'symbol',
      layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': BOLD, 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: { 'text-color': '#ffffff' },
    },
    {
      id: 'ew-day-name',
      type: 'symbol',
      minzoom: 13,
      layout: { 'text-field': ['get', 'name'], 'text-font': BOLD, 'text-size': 12, 'text-anchor': 'left', 'text-offset': [1.4, 0], 'text-max-width': 10, 'text-optional': true },
      paint: { 'text-color': P.ink, 'text-halo-color': P.card, 'text-halo-width': 1.6 },
    },
  ])
  useLayerEvents(['ew-day-dot'], { click: (f) => onPick(f.properties.id) })
  // Frame the day when it (or its set of stops) changes; reordering alone only redraws.
  useEffect(() => {
    if (!dayKey) return
    if (places.length) frame(map, places, { padding: 70, maxZoom: 15, single: 15 })
  }, [dayKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function CityLayer({ cities, routeCities, currentId, onSelectCity }) {
  const data = useMemo(() => cityData(cities, { routeCities, selectedId: currentId, currentId }), [cities, routeCities, currentId])
  useGeoLayer('ew-cities', data, (P) => {
    const inTrip = ['>', ['get', 'stop'], 0]
    const label = (extra) => ({
      type: 'symbol',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['case', ['any', inTrip, ['==', ['get', 'selected'], true]], ['literal', BOLD], ['literal', REGULAR]],
        'text-size': ['case', ['==', ['get', 'selected'], true], 15, inTrip, 13.5, ['==', ['get', 'major'], true], 12.5, 11.5],
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-radial-offset': ['case', inTrip, 1.15, 0.75],
        'text-justify': 'auto',
        'symbol-sort-key': ['get', 'rank'],
        'text-padding': 3,
        ...extra.layout,
      },
      paint: {
        'text-color': ['case', ['==', ['get', 'selected'], true], P.accent, inTrip, P.ink, ['==', ['get', 'gem'], true], P.gem, P.label],
        'text-halo-color': P.halo,
        'text-halo-width': 1.6,
      },
      ...extra.rest,
    })
    return [
      { id: 'ew-city-halo', type: 'circle', filter: ['==', ['get', 'selected'], true], paint: { 'circle-radius': z(3, 13, 10, 18), 'circle-color': P.accentSoft } },
      {
        id: 'ew-city-dot',
        type: 'circle',
        // At street level the city's dot fades back so its places lead.
        paint: {
          // MapLibre allows one zoom curve per expression, so the size cases sit inside it.
          'circle-radius': z(
            3, ['case', inTrip, 8.5, ['==', ['get', 'selected'], true], 6, ['==', ['get', 'major'], true], 3.6, 3],
            8, ['case', inTrip, 11, ['==', ['get', 'selected'], true], 8, ['==', ['get', 'major'], true], 6, 5],
          ),
          'circle-color': ['case', inTrip, P.accent, ['==', ['get', 'selected'], true], P.accent, P.card],
          'circle-stroke-color': ['case', inTrip, P.routeCase, ['==', ['get', 'selected'], true], P.routeCase, ['==', ['get', 'gem'], true], P.gem, P.accent],
          'circle-stroke-width': ['case', inTrip, 2.5, 2],
          'circle-opacity': z(11, 1, 13, 0.85),
          'circle-stroke-opacity': z(11, 1, 13, 0.85),
        },
      },
      {
        id: 'ew-city-num',
        type: 'symbol',
        filter: inTrip,
        layout: { 'text-field': ['to-string', ['get', 'stop']], 'text-font': BOLD, 'text-size': z(3, 10, 8, 12.5), 'text-allow-overlap': true, 'text-ignore-placement': true },
        paint: { 'text-color': '#ffffff' },
      },
      // Labels by importance: trip cities and the open city always, big cities from a country view, the
      // rest (and hidden gems) once zoomed into a region. Base-map city names give way to these.
      { id: 'ew-city-label-trip', ...label({ layout: {}, rest: { filter: ['any', inTrip, ['==', ['get', 'selected'], true]] } }) },
      { id: 'ew-city-label-major', ...label({ layout: {}, rest: { filter: ['all', ['!', inTrip], ['!', ['==', ['get', 'selected'], true]], ['==', ['get', 'major'], true]], minzoom: 4.3, maxzoom: 12 } }) },
      {
        id: 'ew-city-label-other',
        ...label({ layout: {}, rest: { filter: ['all', ['!', inTrip], ['!', ['==', ['get', 'selected'], true]], ['!', ['==', ['get', 'major'], true]]], minzoom: 5.6, maxzoom: 12 } }),
      },
    ]
  })
  useLayerEvents(['ew-city-dot', 'ew-city-label-trip', 'ew-city-label-major', 'ew-city-label-other'], { click: (f) => onSelectCity(f.properties.id) })
  return null
}

// Pins for EuroWander's places and live places. Clustered while many share the screen ("Amsterdam 24"),
// one by one when zoomed in. Saved and focused places are never clustered away.
function PlaceLayer({ id, features, theme, cluster = true, dim = false, attribution, onPick }) {
  const { map } = useEWMap()
  // Only new pins (or new looks) reach the map; re-renders with the same pins send nothing.
  const featureKey = features.map((f) => `${f.properties.id}:${f.properties.icon}`).join('|')
  const data = useMemo(() => collection(features), [featureKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useGeoLayer(
    id,
    data,
    (P) => [
      ...(cluster
        ? [
            {
              id: `${id}-cluster`,
              type: 'circle',
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': P.card,
                'circle-stroke-color': P.muted,
                'circle-stroke-width': 1.5,
                'circle-radius': ['step', ['get', 'point_count'], 13, 10, 16, 40, 20],
                'circle-opacity': dim ? 0.5 : 0.95,
                'circle-stroke-opacity': dim ? 0.5 : 1,
              },
            },
            {
              id: `${id}-count`,
              type: 'symbol',
              filter: ['has', 'point_count'],
              layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': BOLD, 'text-size': 11.5, 'text-allow-overlap': true },
              paint: { 'text-color': P.ink, 'text-opacity': dim ? 0.5 : 1 },
            },
          ]
        : []),
      {
        id: `${id}-pin`,
        type: 'symbol',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-allow-overlap': true,
          'symbol-sort-key': ['get', 'sort'],
          'text-field': ['step', ['zoom'], '', 15, ['get', 'name']],
          'text-font': REGULAR,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.35],
          'text-max-width': 9,
          'text-optional': true,
        },
        paint: {
          'icon-opacity': dim ? 0.45 : 1,
          'text-color': P.label,
          'text-halo-color': P.halo,
          'text-halo-width': 1.4,
          'text-opacity': dim ? 0 : 1,
        },
      },
    ],
    { source: cluster ? { cluster: true, clusterRadius: 46, clusterMaxZoom: 14 } : {}, attribution },
  )
  useLayerEvents(cluster ? [`${id}-pin`, `${id}-cluster`] : [`${id}-pin`], {
    click: async (f) => {
      if (f.properties.cluster_id != null) {
        // Open a cluster: zoom to where it breaks apart.
        const src = map.getSource(id)
        try {
          const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id)
          map.easeTo(calm({ center: f.geometry.coordinates, zoom: Math.min(zoom + 0.2, 16) }))
        } catch {
          map.easeTo(calm({ center: f.geometry.coordinates, zoom: map.getZoom() + 2 }))
        }
        return
      }
      onPick(f.properties.id)
    },
  })
  return null
}

// A focus ring under the selected place.
function FocusRing({ place }) {
  const data = useMemo(() => collection(place ? [point(place.lng, place.lat)] : []), [place])
  useGeoLayer(
    'ew-focus',
    data,
    (P) => [{ id: 'ew-focus-ring', type: 'circle', paint: { 'circle-radius': 24, 'circle-color': P.accentSoft, 'circle-stroke-color': P.accent, 'circle-stroke-width': 1.5 } }],
    { before: 'ew-pinned-pin' },
  )
  return null
}

// ---------- Camera ----------

function Camera({ places, fitCities, routeCities, fitTripRequest, focused, dayActive }) {
  const { map } = useEWMap()
  // Frame the visible places (or the chosen country/city) when that set changes. Live places picked from
  // the map never move it: the map is already there.
  const guide = places.filter((p) => p.source !== 'live')
  const points = guide.length ? guide : fitCities
  const key = points.map((p) => p.id).join(',')
  const first = useRef(true)
  useEffect(() => {
    if (dayActive) return
    if (first.current) {
      first.current = false
      if (!points.length || points.length > 200) return
    }
    if (points.length) frame(map, points, { padding: 40, maxZoom: 14, single: 12 })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  // "View trip": fit the whole route.
  useEffect(() => {
    if (!fitTripRequest || !routeCities.length) return
    frame(map, routeCities, { padding: 60, maxZoom: 11, single: 11 })
  }, [fitTripRequest]) // eslint-disable-line react-hooks/exhaustive-deps
  // A place picked from a list, search or the copilot: fly to it, leaving room for the card below.
  useEffect(() => {
    if (!focused) return
    map.flyTo(calm({ center: [focused.lng, focused.lat], zoom: Math.max(map.getZoom(), 14), offset: [0, -60] }))
  }, [focused, map])
  return null
}

// ---------- The map ----------

export default function ExploreMap({
  places,
  cities,
  fitCities,
  savedIds,
  routeCities,
  legs,
  journeys = {},
  focusedId,
  fitTripRequest,
  dayView,
  currentCityId = null,
  onFocus,
  onFocusPlace,
  onToggleSave,
  onSelectCity,
}) {
  const fitTrip = useRef(null)
  const fitHandler = useCallback(() => fitTrip.current?.(), [])
  return (
    <EuroWanderMap
      label="Map of Europe. Arrow keys move the map, plus and minus zoom. Every place and trip stop on the map is also in the lists on this page."
      onFit={fitHandler}
      fitLabel="Fit the trip on the map"
      locate
    >
      <ExploreLayers
        {...{
          places,
          cities,
          fitCities,
          savedIds,
          routeCities,
          legs,
          journeys,
          focusedId,
          fitTripRequest,
          dayView,
          currentCityId,
          onFocus,
          onFocusPlace,
          onToggleSave,
          onSelectCity,
        }}
        fitTrip={fitTrip}
      />
    </EuroWanderMap>
  )
}

function ExploreLayers({
  places,
  cities,
  fitCities,
  savedIds,
  routeCities,
  legs,
  journeys,
  focusedId,
  fitTripRequest,
  dayView,
  currentCityId,
  onFocus,
  onFocusPlace,
  onToggleSave,
  onSelectCity,
  fitTrip,
}) {
  const { map, theme } = useEWMap()
  const dimmed = Boolean(dayView)
  const liveOn = useLiveEnabled('places') === true
  const [kinds, setKinds] = useState(() => new Set())
  const [bestOnly, setBestOnly] = useState(false)
  const [card, setCard] = useState(null) // { type: 'place'|'live'|'tap'|'leg', ... }
  const [selectedHop, setSelectedHop] = useState(null)

  fitTrip.current = () => {
    if (routeCities.length) frame(map, routeCities, { padding: 60, maxZoom: 11, single: 11 })
    else if (places.length) frame(map, places, { padding: 40, maxZoom: 14 })
  }

  // The focused place opens its card; closing the card clears the focus.
  const focused = focusedId ? placeById[focusedId] : null
  useEffect(() => {
    if (focusedId) setCard({ type: 'place', id: focusedId })
  }, [focusedId])
  const closeCard = useCallback(() => {
    setCard((c) => {
      if (c?.type === 'place') onFocus(null)
      return null
    })
    setSelectedHop(null)
  }, [onFocus])

  // ----- Places -----
  const shownPlaces = kinds.size ? places.filter((p) => kinds.has(pinKind(p))) : places
  const guideIds = useMemo(() => new Set(places.map((p) => p.id)), [places])
  const live = useLivePins({ on: liveOn && !dimmed, kinds })
  const fame = useFame(live.places)

  const pinFeature = (p, variant, state, sort) =>
    point(p.lng, p.lat, {
      id: p.id,
      name: p.name,
      icon: pinIconId(theme, variant, state, interestRings[p.category] || '#7b8794', placeIcon(p)),
      sort,
    })

  const { guideFeatures, pinnedFeatures } = useMemo(() => {
    const g = []
    const pinned = []
    for (const p of shownPlaces) {
      const saved = savedIds.has(p.id)
      const variant = p.source === 'live' ? 'live' : 'guide'
      if (saved || p.id === focusedId) pinned.push(pinFeature(p, variant, saved ? 'saved' : '', saved ? 1 : 2))
      else g.push(pinFeature(p, variant, '', 10))
    }
    return { guideFeatures: g, pinnedFeatures: pinned }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPlaces, savedIds, focusedId, theme])

  const liveFeatures = useMemo(
    () =>
      live.places
        .filter((p) => !guideIds.has(p.id) && (!kinds.size || kinds.has(pinKind(p))) && (!bestOnly || fame(p) >= WELL_KNOWN))
        .map((p) => {
          const known = fame(p)
          const saved = savedIds.has(p.id)
          return pinFeature(p, 'live', saved ? 'saved' : known >= WELL_KNOWN ? 'top' : '', 100 - Math.min(known, 99))
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.places, guideIds, kinds, bestOnly, savedIds, theme, fame],
  )
  const liveById = useMemo(() => new Map(live.places.map((p) => [p.id, p])), [live.places])

  // ----- Tap the map (street level, live places on) -----
  const tapFame = useFame(card?.type === 'tap' ? card.tap.places || [] : [])
  useMapEvent('click', (e) => {
    if (!liveOn || dimmed) return
    // A click on one of EuroWander's own markers or lines is handled by that layer.
    const ours = map.queryRenderedFeatures(e.point).some((f) => f.layer.id.startsWith('ew-'))
    if (ours) return
    const zoom = map.getZoom()
    if (zoom < LIVE_MIN_ZOOM) return
    const at = { lat: e.lngLat.lat, lng: e.lngLat.lng }
    if (zoom < TAP_MIN_ZOOM) {
      setCard({ type: 'tap', tap: { ...at, status: 'zoom' } })
      return
    }
    setCard({ type: 'tap', tap: { ...at, status: 'loading' } })
    placesAt(at.lat, at.lng).then(
      ({ places: found, spot }) => {
        setCard((c) => (c?.type === 'tap' && c.tap.lat === at.lat ? { type: 'tap', tap: { ...at, status: 'ready', places: found, spot } } : c))
        track('live_places_searched', { kind: 'map_tap', anchor: 'map', results: found.length })
      },
      (error) => setCard((c) => (c?.type === 'tap' && c.tap.lat === at.lat ? { type: 'tap', tap: { ...at, status: 'error', error } } : c)),
    )
  })

  const pickPlace = (id) => {
    if (liveById.has(id) && !guideIds.has(id)) {
      setCard({ type: 'live', place: liveById.get(id) })
      return
    }
    onFocus(id)
    setCard({ type: 'place', id })
  }
  const pickHop = (hop) => {
    setSelectedHop(hop)
    setCard({ type: 'leg', hop })
  }

  // ----- Card -----
  let cardBody = null
  let cardTitle = ''
  if (card?.type === 'place' && placeById[card.id]) {
    const p = placeById[card.id]
    cardTitle = p.name
    cardBody = <PlaceCardBody place={p} saved={savedIds.has(p.id)} onToggleSave={onToggleSave} onFocusPlace={onFocusPlace} />
  } else if (card?.type === 'live') {
    cardTitle = card.place.name
    cardBody = <LiveCardBody place={card.place} saved={savedIds.has(card.place.id)} onToggleSave={onToggleSave} fame={fame(card.place)} />
  } else if (card?.type === 'tap') {
    cardTitle = 'What’s here'
    cardBody = <TapCardBody tap={card.tap} savedIds={savedIds} onToggleSave={onToggleSave} fame={tapFame} />
  } else if (card?.type === 'leg' && routeCities[card.hop + 1]) {
    const from = routeCities[card.hop]
    const to = routeCities[card.hop + 1]
    cardTitle = `${from.name} to ${to.name}`
    cardBody = <LegCardBody from={from} to={to} leg={legs[card.hop]} journey={journeys[`${from.id}>${to.id}`]} />
  }

  const dayKey = dayView
    ? `${dayView.day.number}:${dayView.places
        .map((p) => p.id)
        .sort()
        .join(',')}`
    : ''
  const routeKey = routeCities.map((c) => c.id).join(',')
  const stableRoute = useMemo(() => routeCities, [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // Transitous is credited while a saved train (and its stations) is part of the trip on the map.
  const hasJourney = stableRoute.some((c, i) => i > 0 && journeys[`${stableRoute[i - 1].id}>${c.id}`])

  return (
    <>
      <Camera places={places} fitCities={fitCities} routeCities={stableRoute} fitTripRequest={fitTripRequest} focused={focused} dayActive={dimmed} />
      <RouteLayer routeCities={stableRoute} legs={legs} journeys={journeys} selectedHop={selectedHop} onPick={pickHop} />
      <PlaceLayer id="ew-places" features={guideFeatures} theme={theme} dim={dimmed} onPick={pickPlace} />
      {/* Mounted only while live places are on the map, so Geoapify's credit shows exactly then. */}
      {liveFeatures.length > 0 && <PlaceLayer id="ew-live" features={liveFeatures} theme={theme} attribution={LIVE_ATTRIBUTION} onPick={pickPlace} />}
      <CityLayer cities={cities} routeCities={stableRoute} currentId={currentCityId} onSelectCity={onSelectCity} />
      {hasJourney && <StationLayer routeCities={stableRoute} journeys={journeys} selectedHop={selectedHop} />}
      <PlaceLayer id="ew-pinned" features={pinnedFeatures} theme={theme} cluster={false} dim={dimmed} onPick={pickPlace} />
      <FocusRing place={card?.type === 'place' ? placeById[card.id] : null} />
      {dayView && <DayLayer places={dayView.places.filter(Boolean)} selectedId={focusedId} dayKey={dayKey} onPick={pickPlace} />}

      <MapLegend kinds={kinds} onKinds={setKinds} bestOnly={bestOnly} onBestOnly={setBestOnly} liveOn={liveOn} zoom={live.zoom} liveMinZoom={LIVE_MIN_ZOOM} />
      {cardBody && (
        <CardShell title={cardTitle} onClose={closeCard} className={card.type === 'tap' || card.type === 'live' ? 'ew-card-live' : ''}>
          {cardBody}
        </CardShell>
      )}
    </>
  )
}
