// The one map component every EuroWander map is built on (Explore, My trip, Days, Build, Travel Mode).
// It creates the MapLibre map once and keeps it: React state changes update sources, layers and filters
// through the hooks in useMapLayer.js, never by rebuilding the map.
//
//   - Base map: the EuroWander style (styles/) on the configured tile provider (config.js).
//   - Theme: follows the app's light/dark setting and repaints in place (no reload, no flash).
//   - Fallback: if the tiles can't load, swaps to a built-in country-outline base map; if WebGL isn't
//     available at all, shows a short notice instead (every list, card and itinerary still works).
//   - Controls: zoom, optional "fit" button, optional "my location" (asks only when pressed), attribution.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 loads its worker from a separate file next to its own script; once bundled that file has
// to be shipped as an asset and pointed at explicitly.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { buildStyle, fallbackStyle, paintChanges } from './styles/euroWanderStyle.js'
import light from './styles/euroWanderLight.js'
import dark from './styles/euroWanderDark.js'
import { installIcons } from './mapMarkers.js'
import { baseMap } from './config.js'

maplibregl.setWorkerUrl(workerUrl)

const MapContext = createContext(null)
// { map, palette, theme, styleKey } for the components inside a <EuroWanderMap>. styleKey changes when the
// base style is replaced (fallback), so layers know to add themselves again.
export const useEWMap = () => useContext(MapContext)

// The app's theme: <html data-theme> when the person picked one, else the system setting.
function currentTheme() {
  if (typeof document === 'undefined') return 'light'
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useAppTheme() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => {
    const update = () => setTheme(currentTheme())
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener?.('change', update)
    return () => {
      obs.disconnect()
      media?.removeEventListener?.('change', update)
    }
  }, [])
  return theme
}

let outlinePromise = null
const loadOutline = () => (outlinePromise ||= import('../data/europe-outline.json').then((m) => m.default).catch(() => null))

function webglOk() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// A map button in MapLibre's control style, driven by React state.
class ButtonControl {
  constructor({ label, icon, onClick, className = '' }) {
    this.opts = { label, icon, onClick, className }
  }
  onAdd() {
    const box = document.createElement('div')
    box.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `ew-ctrl ${this.opts.className}`
    b.title = this.opts.label
    b.setAttribute('aria-label', this.opts.label)
    b.innerHTML = `<span aria-hidden="true">${this.opts.icon}</span>`
    b.addEventListener('click', () => this.opts.onClick())
    box.appendChild(b)
    this.box = box
    return box
  }
  onRemove() {
    this.box?.remove()
  }
}

export default function EuroWanderMap({
  className = 'map',
  label = 'Map',
  center = [8, 48.5],
  zoom = 3.6,
  simple = false,
  scrollZoom = true,
  onFit, // shows a "fit" button when given
  fitLabel = 'Fit the trip on the map',
  locate = false, // shows "my location" (asks for permission only when pressed)
  onLocate, // ({lat, lng}) when a location was found
  onMap, // (map) once, when the map exists
  children,
}) {
  const box = useRef(null)
  const [map, setMap] = useState(null)
  const [styleKey, setStyleKey] = useState(0)
  const [failed, setFailed] = useState(false) // no WebGL, or MapLibre couldn't start
  const [offline, setOffline] = useState(false) // tiles unreachable: showing the outline base map
  const theme = useAppTheme()
  const palette = theme === 'dark' ? dark : light
  const styleRef = useRef(null)
  const fitRef = useRef(onFit)
  fitRef.current = onFit
  const locateRef = useRef(onLocate)
  locateRef.current = onLocate

  // Create the map once.
  useEffect(() => {
    if (!box.current) return undefined
    if (!webglOk()) {
      setFailed(true)
      return undefined
    }
    const style = buildStyle(palette, { simple })
    styleRef.current = style
    let m
    try {
      m = new maplibregl.Map({
        container: box.current,
        style,
        center,
        zoom,
        minZoom: 2,
        maxZoom: 18.5,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        scrollZoom,
        cooperativeGestures: false,
        fadeDuration: 150,
        locale: {
          'NavigationControl.ZoomIn': 'Zoom in',
          'NavigationControl.ZoomOut': 'Zoom out',
          'GeolocateControl.FindMyLocation': 'Show my location',
          'GeolocateControl.LocationNotAvailable': 'Location not available',
        },
      })
    } catch {
      setFailed(true)
      return undefined
    }
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation?.()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    if (onFit) m.addControl(new ButtonControl({ label: fitLabel, icon: '⤢', className: 'ew-ctrl-fit', onClick: () => fitRef.current?.() }), 'top-right')
    if (locate) {
      const geo = new maplibregl.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: false, fitBoundsOptions: { maxZoom: 15 } })
      geo.on('geolocate', (e) => locateRef.current?.({ lat: e.coords.latitude, lng: e.coords.longitude }))
      m.addControl(geo, 'top-right')
    }
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    const stopIcons = installIcons(m)

    // The canvas is the keyboard target (arrows move, + and - zoom): name it and say where else to look.
    const canvas = m.getCanvas()
    canvas.setAttribute('aria-label', label)
    canvas.setAttribute('role', 'region')

    // Tiles that never arrive (provider down, offline): after a few errors with nothing loaded, swap in
    // the outline base map so routes and pins still have land under them.
    let ok = false
    let errors = 0
    const onData = (e) => {
      if (e.sourceId === 'basemap' && e.isSourceLoaded) ok = true
    }
    const onError = (e) => {
      const fromBase = e?.sourceId === 'basemap' || /tiles|glyphs|basemap|Failed to fetch/i.test(String(e?.error?.message || ''))
      if (!fromBase) {
        // Our own layers or data: never fatal, but worth seeing while developing.
        console.warn('EuroWander map:', e?.error?.message || e)
        return
      }
      if (ok) return
      errors += 1
      if (errors >= 3) goOffline()
    }
    let swapped = false
    const goOffline = () => {
      if (swapped) return
      swapped = true
      loadOutline().then((outline) => {
        const fb = fallbackStyle(styleRef.current?.palette || palette, outline)
        fb.glyphs = baseMap().glyphs
        styleRef.current = { ...fb, palette: styleRef.current?.palette || palette, offline: true }
        m.setStyle(fb, { diff: false })
        m.once('style.load', () => setStyleKey((k) => k + 1))
        setOffline(true)
      })
    }
    // Nothing at all after 12 s also counts (a hanging connection never errors).
    const timer = setTimeout(() => {
      if (!ok) goOffline()
    }, 12000)
    m.on('sourcedata', onData)
    m.on('error', onError)
    styleRef.current.palette = palette
    m.once('load', () => {
      setMap(m)
      onMap?.(m)
    })
    return () => {
      clearTimeout(timer)
      stopIcons()
      m.remove()
      setMap(null)
    }
    // The map is made once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Theme switch: repaint the base layers that differ. EuroWander layers repaint themselves (palette).
  useEffect(() => {
    if (!map || !styleRef.current || styleRef.current.palette === palette) return
    if (styleRef.current.offline) {
      for (const [id, prop, v] of [
        ['land', 'background-color', palette.water],
        ['outline-fill', 'fill-color', palette.land],
        ['outline-line', 'line-color', palette.boundary],
      ])
        if (map.getLayer(id)) map.setPaintProperty(id, prop, v)
      styleRef.current.palette = palette
      return
    }
    const next = buildStyle(palette, { simple })
    for (const [id, prop, v] of paintChanges(styleRef.current, next)) if (map.getLayer(id)) map.setPaintProperty(id, prop, v)
    next.palette = palette
    styleRef.current = next
  }, [map, palette, simple])

  useEffect(() => {
    if (!map) return
    if (scrollZoom) map.scrollZoom.enable()
    else map.scrollZoom.disable()
  }, [map, scrollZoom])

  // Keep the canvas sized with its box (panels open and close, phones rotate).
  useEffect(() => {
    if (!map || !box.current || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [map])

  const value = useMemo(() => (map ? { map, palette, theme, styleKey } : null), [map, palette, theme, styleKey])

  if (failed) {
    return (
      <div className={`${className} ew-map ew-map-failed`} role="note">
        <p>The interactive map can’t run in this browser (it needs WebGL). Everything else works: places, your trip, the day plans and the copilot are all in the lists.</p>
      </div>
    )
  }
  return (
    <div className={`${className} ew-map`} data-theme-map={theme}>
      <div ref={box} className="ew-map-canvas" />
      {offline && (
        <div className="map-notice" role="status">
          The map background can’t load right now, so only country outlines show. Markers and routes still work.
        </div>
      )}
      <MapContext.Provider value={value}>{value && children}</MapContext.Provider>
    </div>
  )
}
