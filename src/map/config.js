// Where the base map comes from. The map components never name a provider: they ask for `baseMap()`
// and the EuroWander style is built on top of whatever vector tiles it points to. Any provider that
// serves the OpenMapTiles schema works (OpenFreeMap, self-hosted PMTiles, MapTiler, Stadia...).
//
// Build-time overrides (all optional, VITE_ so they reach the browser; none of them is a secret):
//   VITE_MAP_TILES     TileJSON URL (or pmtiles://... once a PMTiles protocol is registered)
//   VITE_MAP_GLYPHS    font URL template with {fontstack} and {range}
//   VITE_MAP_ATTRIBUTION  extra attribution HTML for the tiles
//
// OpenFreeMap (https://openfreemap.org): free, no key, no sign-up, commercial use allowed, donation-
// funded and provided as is (no uptime promise). Attribution is required and comes with its TileJSON;
// MapLibre's attribution control shows it automatically.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

export const PROVIDERS = {
  openfreemap: {
    id: 'openfreemap',
    name: 'OpenFreeMap',
    tiles: 'https://tiles.openfreemap.org/planet',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    // Shown even if the TileJSON's own attribution fails to load.
    attribution:
      '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    fonts: { regular: ['Noto Sans Regular'], bold: ['Noto Sans Bold'], italic: ['Noto Sans Italic'] },
  },
}

export function baseMap() {
  const base = PROVIDERS.openfreemap
  return {
    ...base,
    tiles: env.VITE_MAP_TILES || base.tiles,
    glyphs: env.VITE_MAP_GLYPHS || base.glyphs,
    attribution: env.VITE_MAP_ATTRIBUTION || base.attribution,
    custom: Boolean(env.VITE_MAP_TILES),
  }
}

// Which renderer the planner uses. MapLibre unless the build turns it off (VITE_USE_MAPLIBRE=false) or
// the address asks for the old map (?map=leaflet, remembered for the tab so links keep it).
// Temporary: removed with Leaflet once the MapLibre map is approved.
export function mapLibreOn() {
  if (typeof window !== 'undefined') {
    try {
      const asked = new URLSearchParams(window.location.search).get('map')
      if (asked === 'leaflet' || asked === 'maplibre') sessionStorage.setItem('ew-map', asked)
      const chosen = sessionStorage.getItem('ew-map')
      if (chosen) return chosen === 'maplibre'
    } catch {
      // Storage blocked: fall through to the build setting.
    }
  }
  return env.VITE_USE_MAPLIBRE !== 'false'
}
