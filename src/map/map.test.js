// Tests for the map's pure parts: style building, theme repaint, route and day geometry.
import test from 'node:test'
import assert from 'node:assert/strict'
import { LABELS_START, buildStyle, fallbackStyle, paintChanges } from './styles/euroWanderStyle.js'
import light from './styles/euroWanderLight.js'
import dark from './styles/euroWanderDark.js'
import { arc, boundsOf } from './mapUtils.js'
import { cityData, dayData, journeyStops, stationData, tripRouteData } from './mapRoutes.js'
import { PROVIDERS, baseMap } from './config.js'

const paris = { id: 'paris', name: 'Paris', lat: 48.8566, lng: 2.3522, size: 'major' }
const brussels = { id: 'brussels', name: 'Brussels', lat: 50.85, lng: 4.35, size: 'major' }
const amsterdam = { id: 'amsterdam', name: 'Amsterdam', lat: 52.37, lng: 4.9, size: 'major' }
const bruges = { id: 'bruges', name: 'Bruges', lat: 51.21, lng: 3.22, hiddenGem: true, size: 'small' }

test('light and dark palettes define the same colours', () => {
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort())
})

test('style: one source on the provider, unique layer ids, labels after shapes', () => {
  const s = buildStyle(light)
  assert.equal(s.version, 8)
  assert.equal(s.sources.basemap.url, PROVIDERS.openfreemap.tiles)
  assert.match(s.sources.basemap.attribution, /OpenStreetMap/)
  assert.match(s.glyphs, /\{fontstack\}.*\{range\}/)
  const ids = s.layers.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length)
  const start = ids.indexOf(LABELS_START)
  assert.ok(start > 0)
  for (const l of s.layers.slice(start)) assert.equal(l.type, 'symbol', `${l.id} should be a label`)
  for (const l of s.layers.slice(1)) assert.equal(l.source, 'basemap')
})

test('style: no POIs or minor roads at Europe zoom', () => {
  const s = buildStyle(light)
  const poi = s.layers.find((l) => l.id === 'label-poi')
  assert.ok(poi.minzoom >= 14)
  for (const l of s.layers.filter((l) => /road-(minor|path)/.test(l.id))) assert.ok(l.minzoom >= 13, l.id)
})

test('style: provider can be swapped without changing layers', () => {
  const custom = { ...baseMap(), tiles: 'https://example.org/tiles.json', glyphs: 'https://example.org/{fontstack}/{range}.pbf' }
  const a = buildStyle(light)
  const b = buildStyle(light, { provider: custom })
  assert.equal(b.sources.basemap.url, 'https://example.org/tiles.json')
  assert.deepEqual(
    a.layers.map((l) => l.id),
    b.layers.map((l) => l.id),
  )
})

test('theme switch repaints only paint values that differ', () => {
  const changes = paintChanges(buildStyle(light), buildStyle(dark))
  assert.ok(changes.length > 20)
  assert.ok(changes.some(([id, prop, v]) => id === 'land' && prop === 'background-color' && v === dark.land))
  assert.equal(paintChanges(buildStyle(dark), buildStyle(dark)).length, 0)
})

test('Travel Mode style keeps the same layers (so the shared map code works) with fewer POIs', () => {
  const normal = buildStyle(light)
  const simple = buildStyle(light, { simple: true })
  assert.deepEqual(
    simple.layers.map((l) => l.id),
    normal.layers.map((l) => l.id),
  )
  const rank = (s) => JSON.stringify(s.layers.find((l) => l.id === 'label-poi').filter)
  assert.notEqual(rank(simple), rank(normal))
})

test('fallback base map has land outlines and the label anchor', () => {
  const outline = { type: 'FeatureCollection', features: [] }
  const s = fallbackStyle(light, outline)
  assert.ok(s.layers.some((l) => l.id === LABELS_START))
  assert.equal(s.sources.outline.data, outline)
  assert.equal(fallbackStyle(dark, null).sources.outline, undefined)
})

test('arc bends gently and ends exactly at both cities', () => {
  const pts = arc(paris, amsterdam)
  assert.deepEqual(pts[0], [paris.lng, paris.lat])
  assert.deepEqual(pts.at(-1), [amsterdam.lng, amsterdam.lat])
  const mid = pts[Math.floor(pts.length / 2)]
  const straight = [(paris.lng + amsterdam.lng) / 2, (paris.lat + amsterdam.lat) / 2]
  const off = Math.hypot(mid[0] - straight[0], mid[1] - straight[1])
  const len = Math.hypot(amsterdam.lng - paris.lng, amsterdam.lat - paris.lat)
  assert.ok(off > 0 && off < len * 0.15)
})

test('bounds of points', () => {
  assert.deepEqual(boundsOf([paris, amsterdam]), [
    [2.3522, 48.8566],
    [4.9, 52.37],
  ])
  assert.equal(boundsOf([]), null)
})

const journey = {
  origin: { id: 'a', name: 'Paris Gare du Nord', lat: 48.8809, lng: 2.3553 },
  destination: { id: 'c', name: 'Amsterdam Centraal', lat: 52.3791, lng: 4.9003 },
  departure: { scheduled: '2026-06-15T08:25:00Z' },
  arrival: { scheduled: '2026-06-15T11:45:00Z' },
  legs: [
    { mode: 'train', from: { name: 'Paris Gare du Nord', lat: 48.8809, lng: 2.3553 }, to: { name: 'Brussels-Midi', lat: 50.8357, lng: 4.3355 } },
    { mode: 'train', from: { name: 'Brussels-Midi', lat: 50.8357, lng: 4.3355 }, to: { name: 'Amsterdam Centraal', lat: 52.3791, lng: 4.9003 } },
  ],
  durationMin: 200,
}

test('journey stops: origin, change, destination, no repeats', () => {
  const s = journeyStops(journey)
  assert.deepEqual(
    s.map((x) => [x.name, x.role]),
    [
      ['Paris Gare du Nord', 'origin'],
      ['Brussels-Midi', 'change'],
      ['Amsterdam Centraal', 'destination'],
    ],
  )
  assert.deepEqual(journeyStops(null), [])
})

test('trip route: one line per hop, saved trains follow their stations', () => {
  const legs = [
    { mode: 'train', minutes: 120, estimated: false },
    { mode: 'bus', minutes: 180, estimated: true },
  ]
  const plain = tripRouteData([paris, brussels, amsterdam], legs)
  assert.equal(plain.features.length, 2)
  assert.equal(plain.features[1].properties.mode, 'bus')
  assert.equal(plain.features[1].properties.estimated, true)
  const withTrain = tripRouteData([paris, amsterdam], [{ mode: 'train', minutes: 200 }], { journeys: { 'paris>amsterdam': journey }, selectedHop: 0 })
  const f = withTrain.features[0]
  assert.equal(f.properties.journey, true)
  assert.equal(f.properties.selected, true)
  // Passes through Brussels-Midi.
  assert.ok(f.geometry.coordinates.some(([lng, lat]) => lng === 4.3355 && lat === 50.8357))
  assert.deepEqual(f.geometry.coordinates[0], [paris.lng, paris.lat])
  assert.deepEqual(f.geometry.coordinates.at(-1), [amsterdam.lng, amsterdam.lat])
})

test('stations show only for the selected hop unless asked for all', () => {
  const route = [paris, amsterdam]
  const journeys = { 'paris>amsterdam': journey }
  assert.equal(stationData(route, { journeys }).features.length, 0)
  assert.equal(stationData(route, { journeys, selectedHop: 0 }).features.length, 3)
  assert.equal(stationData(route, { journeys, all: true }).features.length, 3)
})

test('cities: trip order numbers, selection and label priority', () => {
  const d = cityData([paris, brussels, amsterdam, bruges], { routeCities: [amsterdam, paris, amsterdam], selectedId: 'bruges' })
  const by = Object.fromEntries(d.features.map((f) => [f.properties.id, f.properties]))
  assert.equal(by.amsterdam.stop, 1)
  assert.equal(by.paris.stop, 2)
  assert.equal(by.brussels.stop, 0)
  assert.equal(by.bruges.selected, true)
  assert.equal(by.bruges.rank, 0)
  assert.ok(by.paris.rank < by.brussels.rank)
})

test('day: numbered in order, skipped stops left out of the walk', () => {
  const a = { id: 'a', name: 'A', lat: 1, lng: 1 }
  const b = { id: 'b', name: 'B', lat: 1.01, lng: 1 }
  const c = { id: 'c', name: 'C', lat: 1.02, lng: 1 }
  const { stops, line } = dayData([a, b, c], { states: { b: 'skipped', a: 'done' }, selectedId: 'c' })
  assert.deepEqual(
    stops.features.map((f) => f.properties.n),
    [1, 2, 3],
  )
  assert.equal(stops.features[2].properties.selected, true)
  assert.equal(line.features.length, 1)
})
