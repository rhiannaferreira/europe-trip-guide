// Build My Europe Trip's route map, on the shared MapLibre map: numbered stops and one line per journey,
// styled by how you travel (rail with sleepers, bus dashed, ferry dotted, flight long dashes). Legs over
// your limit are thicker; the way home is faded. Tap a line for its details (also in the plan below).
import { useEffect, useMemo, useState } from 'react'
import { formatDuration } from '../lib/format.js'
import { modeIcon, sourceLabel } from '../planner/transport.js'
import EuroWanderMap, { useEWMap } from './EuroWanderMap.jsx'
import { useGeoLayer, useLayerEvents } from './useMapLayer.js'
import { LABELS_START } from './styles/euroWanderStyle.js'
import { arc, collection, frame, line, point } from './mapUtils.js'
import { CardShell } from './MapCard.jsx'

const BOLD = ['Noto Sans Bold']
const z = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops]

function Layers({ stops, legs, over, onPick, picked }) {
  const { map } = useEWMap()
  const lines = useMemo(
    () => collection(legs.map((l, i) => line(arc(l.from, l.to), { i, mode: l.mode, home: Boolean(l.isReturn), over: over.has(`${l.from.id}-${l.to.id}`), picked: picked === i }))),
    [legs, over, picked],
  )
  const dots = useMemo(() => collection(stops.map((c, i) => point(c.lng, c.lat, { n: i + 1, name: c.name }))), [stops])
  useGeoLayer(
    'plan-legs',
    lines,
    (P) => {
      const width = ['case', ['==', ['get', 'over'], true], 6, ['==', ['get', 'picked'], true], 5.5, 4]
      const opacity = ['case', ['==', ['get', 'home'], true], 0.5, 1]
      const m = (mode) => ['==', ['get', 'mode'], mode]
      return [
        { id: 'plan-glow', type: 'line', filter: ['==', ['get', 'picked'], true], layout: { 'line-cap': 'round' }, paint: { 'line-color': P.accentSoft, 'line-width': 16, 'line-blur': 2 } },
        {
          id: 'plan-case',
          type: 'line',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.routeCase, 'line-width': ['+', width, 3], 'line-opacity': ['*', opacity, 0.85] },
        },
        {
          id: 'plan-train',
          type: 'line',
          filter: m('train'),
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': P.route, 'line-width': width, 'line-opacity': opacity },
        },
        { id: 'plan-ties', type: 'line', filter: m('train'), paint: { 'line-color': P.routeCase, 'line-width': 1.6, 'line-dasharray': [0.25, 2.6], 'line-opacity': opacity } },
        { id: 'plan-bus', type: 'line', filter: m('bus'), paint: { 'line-color': '#9a5b00', 'line-width': width, 'line-dasharray': [1.6, 1.2], 'line-opacity': opacity } },
        {
          id: 'plan-ferry',
          type: 'line',
          filter: m('rail + ferry'),
          layout: { 'line-cap': 'round' },
          paint: { 'line-color': P.day, 'line-width': width, 'line-dasharray': [0.1, 1.8], 'line-opacity': opacity },
        },
        { id: 'plan-flight', type: 'line', filter: m('flight'), paint: { 'line-color': '#6a4c93', 'line-width': width, 'line-dasharray': [3, 2], 'line-opacity': opacity } },
      ]
    },
    { before: LABELS_START },
  )
  useGeoLayer('plan-stops', dots, (P) => [
    { id: 'plan-dot', type: 'circle', paint: { 'circle-radius': z(3, 9, 8, 11), 'circle-color': P.accent, 'circle-stroke-color': P.routeCase, 'circle-stroke-width': 2.5 } },
    {
      id: 'plan-num',
      type: 'symbol',
      layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': BOLD, 'text-size': 11.5, 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: { 'text-color': '#ffffff' },
    },
    {
      id: 'plan-name',
      type: 'symbol',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': BOLD,
        'text-size': 13,
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-radial-offset': 1.2,
        'text-justify': 'auto',
      },
      paint: { 'text-color': P.ink, 'text-halo-color': P.halo, 'text-halo-width': 1.8 },
    },
  ])
  useLayerEvents(['plan-train', 'plan-bus', 'plan-ferry', 'plan-flight'], { click: (f) => onPick(f.properties.i) })
  const key = stops.map((c) => c.id).join(',')
  useEffect(() => {
    frame(map, stops, { padding: 36, maxZoom: 8, single: 7 })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function PlanRouteMap({ stops, legs, overLimit = [] }) {
  const over = useMemo(() => new Set(overLimit.map((l) => `${l.from.id}-${l.to.id}`)), [overLimit])
  const [picked, setPicked] = useState(null)
  const leg = picked != null ? legs[picked] : null
  return (
    <div className="plan-map">
      <EuroWanderMap scrollZoom={false} label="Map of the route. Every stop and journey is also listed in the plan.">
        <Layers stops={stops} legs={legs} over={over} picked={picked} onPick={setPicked} />
        {leg && (
          <CardShell title={`${leg.from.name} to ${leg.to.name}`} onClose={() => setPicked(null)}>
            <div className="ew-card-head">
              <span className="ew-card-icon" aria-hidden="true">
                {modeIcon(leg.mode)}
              </span>
              <div>
                <h3 className="ew-card-title">
                  {leg.from.name} → {leg.to.name}
                </h3>
                <p className="ew-card-meta">
                  About {formatDuration(leg.minutes)} · {sourceLabel(leg.source)}
                  {over.has(`${leg.from.id}-${leg.to.id}`) ? ' · longer than your preferred limit' : ''}
                </p>
              </div>
            </div>
          </CardShell>
        )}
      </EuroWanderMap>
      <p className="map-legend" aria-hidden="true">
        <span className="legend-train">Train</span> <span className="legend-bus">Bus</span> <span className="legend-ferry">Rail + ferry</span>{' '}
        <span className="legend-flight">Flight</span>
      </p>
    </div>
  )
}
