// Builds the EuroWander base map style (MapLibre style spec) from a palette and a tile provider.
// Works with any vector tiles in the OpenMapTiles schema, so the provider can change without touching it.
//
// What the style does on purpose:
//   - Europe zoom (3-6): land, sea, coastlines, country borders and names, major cities, main rail lines.
//     Motorways only as faint hairlines, no minor roads, no POIs.
//   - Region zoom (7-11): towns, rivers, parks and forests, peaks, main roads still quiet.
//   - City zoom (12+): streets, neighbourhoods, parks, then (15+) a few useful POI names.
// EuroWander's own layers (cities, routes, pins) are added on top by the map components, under the
// base map's labels where that keeps names readable (see LABELS_START).
//
// options.simple: Travel Mode's outdoor look: fewer POIs, bigger, higher-contrast street names.
import { baseMap } from '../config.js'

export const BASE_SOURCE = 'basemap'
// The first base label layer. EuroWander lines go below it, pins go above everything.
export const LABELS_START = 'label-water'

const name = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]
const z = (stops) => ['interpolate', ['exponential', 1.4], ['zoom'], ...stops]

export function buildStyle(palette, { provider = baseMap(), simple = false } = {}) {
  const P = palette
  const f = provider.fonts
  const src = BASE_SOURCE
  const labelScale = simple ? 1.12 : 1
  const text = (size) => (typeof size === 'number' ? size * labelScale : size)

  const layers = [
    { id: 'land', type: 'background', paint: { 'background-color': P.land } },

    // Landcover and landuse: soft, so the geography reads without competing with the trip.
    {
      id: 'landcover-wood',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      minzoom: 5,
      filter: ['==', ['get', 'class'], 'wood'],
      paint: { 'fill-color': P.wood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 0.9] },
    },
    {
      id: 'landcover-grass',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      minzoom: 8,
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]],
      paint: { 'fill-color': P.grass, 'fill-opacity': 0.6 },
    },
    {
      id: 'landcover-rock',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      minzoom: 4,
      filter: ['==', ['get', 'class'], 'rock'],
      paint: { 'fill-color': P.rock, 'fill-opacity': 0.8 },
    },
    {
      id: 'landcover-ice',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      minzoom: 3,
      filter: ['==', ['get', 'class'], 'ice'],
      paint: { 'fill-color': P.ice, 'fill-opacity': 0.9 },
    },
    {
      id: 'landcover-sand',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      minzoom: 9,
      filter: ['==', ['get', 'class'], 'sand'],
      paint: { 'fill-color': P.sand, 'fill-opacity': 0.8 },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      source: src,
      'source-layer': 'landuse',
      minzoom: 10,
      filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]],
      paint: { 'fill-color': P.residential, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 12, 0.8] },
    },
    {
      id: 'park',
      type: 'fill',
      source: src,
      'source-layer': 'park',
      minzoom: 6,
      paint: { 'fill-color': P.park, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 11, 0.9] },
    },
    {
      id: 'landuse-green',
      type: 'fill',
      source: src,
      'source-layer': 'landuse',
      minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['park', 'cemetery', 'pitch', 'garden', 'grass']]],
      paint: { 'fill-color': P.park, 'fill-opacity': 0.7 },
    },

    // Water
    {
      id: 'water',
      type: 'fill',
      source: src,
      'source-layer': 'water',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: { 'fill-color': P.water, 'fill-antialias': true },
    },
    {
      id: 'water-coast',
      type: 'line',
      source: src,
      'source-layer': 'water',
      minzoom: 3,
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: { 'line-color': P.waterLine, 'line-width': z([3, 0.3, 10, 0.8]), 'line-opacity': 0.7 },
    },
    {
      id: 'waterway',
      type: 'line',
      source: src,
      'source-layer': 'waterway',
      minzoom: 7,
      filter: ['all', ['!=', ['get', 'brunnel'], 'tunnel'], ['in', ['get', 'class'], ['literal', ['river', 'canal']]]],
      paint: { 'line-color': P.water, 'line-width': z([7, 0.6, 12, 1.6, 16, 4]) },
    },
    {
      id: 'waterway-small',
      type: 'line',
      source: src,
      'source-layer': 'waterway',
      minzoom: 12,
      filter: ['all', ['!=', ['get', 'brunnel'], 'tunnel'], ['in', ['get', 'class'], ['literal', ['stream', 'drain', 'ditch']]]],
      paint: { 'line-color': P.water, 'line-width': z([12, 0.4, 16, 1.4]) },
    },

    {
      id: 'aeroway',
      type: 'fill',
      source: src,
      'source-layer': 'aeroway',
      minzoom: 11,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': P.aeroway, 'fill-opacity': 0.7 },
    },
    {
      id: 'building',
      type: 'fill',
      source: src,
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': P.building,
        'fill-outline-color': P.buildingEdge,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, simple ? 0.6 : 0.85],
      },
    },

    // Borders: countries clear, regions barely there, sea borders hidden.
    {
      id: 'boundary-region',
      type: 'line',
      source: src,
      'source-layer': 'boundary',
      minzoom: 6,
      filter: ['all', ['in', ['get', 'admin_level'], ['literal', [3, 4]]], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': P.boundaryRegion, 'line-width': z([6, 0.5, 12, 1]), 'line-dasharray': [3, 2] },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: src,
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1], ['!=', ['get', 'disputed'], 1]],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': P.boundary, 'line-width': z([3, 0.6, 6, 1.1, 12, 1.8]) },
    },
    {
      id: 'boundary-disputed',
      type: 'line',
      source: src,
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['==', ['get', 'disputed'], 1]],
      paint: { 'line-color': P.boundary, 'line-width': 1, 'line-dasharray': [2, 2] },
    },

    // Roads: only the network you'd notice at each zoom, and quietly.
    {
      id: 'road-far',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 5,
      maxzoom: 9,
      filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': P.roadFar, 'line-width': z([5, 0.4, 9, 1]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 8, 0.9] },
    },
    {
      id: 'road-minor-case',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['in', ['get', 'class'], ['literal', ['minor', 'service', 'pedestrian']]], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': P.roadMinorCase, 'line-width': z([13, 1.2, 16, 6, 18, 16]) },
    },
    {
      id: 'road-major-case',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': P.roadMajorCase, 'line-width': z([9, 1, 12, 2.5, 16, 11, 18, 24]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 11, 1] },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['in', ['get', 'class'], ['literal', ['minor', 'service', 'pedestrian']]], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': P.roadMinor, 'line-width': z([13, 0.6, 16, 4.5, 18, 13]) },
    },
    {
      id: 'road-path',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 15,
      filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]],
      paint: { 'line-color': P.roadMinorCase, 'line-width': z([15, 0.6, 18, 2]), 'line-dasharray': [2, 1.5] },
    },
    {
      id: 'road-major',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': P.roadMajor, 'line-width': z([9, 0.4, 12, 1.5, 16, 9, 18, 21]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 11, 1] },
    },

    // Rail: main lines as a thin grey corridor from Europe zoom, classic sleepers closer in.
    // EuroWander's own train legs are drawn on top in a stronger colour, so this stays background.
    {
      id: 'rail',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 5,
      filter: ['all', ['==', ['get', 'class'], 'rail'], ['==', ['get', 'subclass'], 'rail'], ['!=', ['get', 'brunnel'], 'tunnel'], ['!', ['has', 'service']]],
      paint: { 'line-color': P.rail, 'line-width': z([5, 0.4, 10, 1, 16, 2]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.45, 9, 0.8] },
    },
    {
      id: 'rail-ties',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['==', ['get', 'class'], 'rail'], ['==', ['get', 'subclass'], 'rail'], ['!=', ['get', 'brunnel'], 'tunnel']],
      paint: { 'line-color': P.rail, 'line-width': z([13, 3, 16, 6]), 'line-dasharray': [0.2, 3], 'line-opacity': 0.6 },
    },

    // ---- Labels (everything from here on is above EuroWander's lines) ----
    {
      id: LABELS_START,
      type: 'symbol',
      source: src,
      'source-layer': 'water_name',
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': name,
        'text-font': f.italic,
        'text-size': z([3, 10, 8, 13]),
        'text-letter-spacing': 0.15,
        'text-max-width': 6,
      },
      paint: { 'text-color': P.waterLabel, 'text-halo-color': P.halo, 'text-halo-width': 0.8 },
    },
    {
      id: 'label-waterway',
      type: 'symbol',
      source: src,
      'source-layer': 'waterway',
      minzoom: 13,
      filter: ['in', ['get', 'class'], ['literal', ['river', 'canal']]],
      layout: { 'text-field': name, 'text-font': f.italic, 'text-size': 11, 'symbol-placement': 'line', 'text-letter-spacing': 0.1 },
      paint: { 'text-color': P.waterLabel, 'text-halo-color': P.halo, 'text-halo-width': 1 },
    },
    {
      id: 'label-street',
      type: 'symbol',
      source: src,
      'source-layer': 'transportation_name',
      minzoom: simple ? 14 : 13,
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'minor', 'pedestrian']]],
      layout: {
        'text-field': name,
        'text-font': f.regular,
        'text-size': z([13, text(10), 17, text(13)]),
        'symbol-placement': 'line',
        'text-max-angle': 30,
        'text-padding': 4,
      },
      paint: { 'text-color': simple ? P.label : P.labelMuted, 'text-halo-color': P.halo, 'text-halo-width': 1.4 },
    },
    {
      id: 'label-peak',
      type: 'symbol',
      source: src,
      'source-layer': 'mountain_peak',
      minzoom: 9,
      filter: ['all', ['==', ['get', 'class'], 'peak'], ['<=', ['coalesce', ['get', 'rank'], 99], simple ? 1 : 3]],
      layout: { 'text-field': ['concat', '▲ ', name], 'text-font': f.italic, 'text-size': 10.5, 'text-anchor': 'top', 'text-max-width': 7 },
      paint: { 'text-color': P.peak, 'text-halo-color': P.halo, 'text-halo-width': 1 },
    },
    {
      id: 'label-park',
      type: 'symbol',
      source: src,
      'source-layer': 'park',
      minzoom: 12,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: { 'text-field': name, 'text-font': f.italic, 'text-size': text(11), 'text-max-width': 7, 'text-padding': 6 },
      paint: { 'text-color': P.poiLabel, 'text-halo-color': P.halo, 'text-halo-width': 1.2 },
    },
    // A few useful places by name only (no icons) at street level. EuroWander's own pins are the icons.
    {
      id: 'label-poi',
      type: 'symbol',
      source: src,
      'source-layer': 'poi',
      minzoom: 15,
      filter: [
        'all',
        ['<=', ['coalesce', ['get', 'rank'], 99], simple ? 6 : 14],
        [
          'in',
          ['get', 'class'],
          [
            'literal',
            ['museum', 'art_gallery', 'attraction', 'castle', 'monument', 'place_of_worship', 'theatre', 'park', 'garden', 'railway', 'town_hall', 'library', 'zoo', 'information'],
          ],
        ],
      ],
      layout: {
        'text-field': name,
        'text-font': f.regular,
        'text-size': text(10.5),
        'text-max-width': 8,
        'text-padding': 8,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.4,
      },
      paint: { 'text-color': P.poiLabel, 'text-halo-color': P.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-neighbourhood',
      type: 'symbol',
      source: src,
      'source-layer': 'place',
      minzoom: 12,
      maxzoom: 16,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood']]],
      layout: {
        'text-field': name,
        'text-font': f.regular,
        'text-size': z([12, text(10), 15, text(12)]),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
        'text-max-width': 7,
        'text-padding': 6,
      },
      paint: { 'text-color': P.labelMuted, 'text-halo-color': P.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-village',
      type: 'symbol',
      source: src,
      'source-layer': 'place',
      minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['village', 'hamlet']]],
      layout: { 'text-field': name, 'text-font': f.regular, 'text-size': text(11), 'text-max-width': 7 },
      paint: { 'text-color': P.label, 'text-halo-color': P.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-town',
      type: 'symbol',
      source: src,
      'source-layer': 'place',
      minzoom: 8,
      filter: ['==', ['get', 'class'], 'town'],
      layout: { 'text-field': name, 'text-font': f.regular, 'text-size': z([8, text(10.5), 13, text(14)]), 'text-max-width': 7 },
      paint: { 'text-color': P.label, 'text-halo-color': P.halo, 'text-halo-width': 1.3 },
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: src,
      'source-layer': 'place',
      minzoom: 5,
      maxzoom: 14,
      filter: ['all', ['==', ['get', 'class'], 'city'], ['<=', ['coalesce', ['get', 'rank'], 99], 12]],
      layout: {
        'text-field': name,
        'text-font': f.regular,
        'text-size': z([5, text(10.5), 10, text(15)]),
        'text-max-width': 7,
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      },
      paint: { 'text-color': P.label, 'text-halo-color': P.halo, 'text-halo-width': 1.3 },
    },
    {
      id: 'label-country',
      type: 'symbol',
      source: src,
      'source-layer': 'place',
      minzoom: 2,
      maxzoom: 7,
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': name,
        'text-font': f.bold,
        'text-size': z([2, 9, 6, 13]),
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.18,
        'text-max-width': 6,
      },
      paint: { 'text-color': P.countryLabel, 'text-halo-color': P.halo, 'text-halo-width': 1.2, 'text-opacity': 0.85 },
    },
  ]

  return {
    version: 8,
    name: `EuroWander ${P.name}`,
    glyphs: provider.glyphs,
    sources: {
      [src]: { type: 'vector', url: provider.tiles, attribution: provider.attribution },
    },
    layers,
  }
}

// The paint values that change between two palettes, per layer, so a theme switch can repaint the map
// in place (no reload, no flash, EuroWander layers untouched). → [[layerId, property, value]]
export function paintChanges(fromStyle, toStyle) {
  const before = new Map(fromStyle.layers.map((l) => [l.id, l.paint || {}]))
  const out = []
  for (const l of toStyle.layers) {
    const old = before.get(l.id) || {}
    for (const [k, v] of Object.entries(l.paint || {})) if (JSON.stringify(old[k]) !== JSON.stringify(v)) out.push([l.id, k, v])
  }
  return out
}

// A base map that needs no network: sea, and land drawn from the country outlines EuroWander ships with.
// Used when the tile provider can't be reached, so routes and pins still have a map under them.
export function fallbackStyle(palette, outline) {
  return {
    version: 8,
    name: `EuroWander ${palette.name} (offline)`,
    sources: outline ? { outline: { type: 'geojson', data: outline } } : {},
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': palette.water } },
      ...(outline
        ? [
            { id: 'outline-fill', type: 'fill', source: 'outline', paint: { 'fill-color': palette.land } },
            { id: 'outline-line', type: 'line', source: 'outline', paint: { 'line-color': palette.boundary, 'line-width': 0.8 } },
          ]
        : []),
      // Stands in for the base labels so EuroWander lines still have a layer to go under.
      { id: LABELS_START, type: 'background', paint: { 'background-opacity': 0 } },
    ],
  }
}
