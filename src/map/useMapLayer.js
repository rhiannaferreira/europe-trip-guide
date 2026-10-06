// Hooks that keep MapLibre sources and layers in step with React state, without rebuilding the map.
//
//   useGeoLayer(id, data, layers, options)
//     Owns one GeoJSON source `id` and the layers built for it. On each render it sets new data only when
//     `data` changed, and updates each layer's paint, layout, filter and zoom range only where they
//     changed. Layers come from `layers(palette)`, so a theme switch repaints them.
//     options: { source: extra GeoJSON source options (cluster...), before: layer id to insert under,
//                attribution: credit shown while the source is in view }
//
//   useLayerEvents(layerIds, { click, enter, leave })
//     Clicks and hovers on features of those layers (with a pointer cursor while hovering).
import { useEffect, useRef } from 'react'
import { useEWMap } from './EuroWanderMap.jsx'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const EMPTY = { type: 'FeatureCollection', features: [] }

export function useGeoLayer(id, data, makeLayers, { source = {}, before, attribution } = {}) {
  const ctx = useEWMap()
  const map = ctx?.map
  const palette = ctx?.palette
  const styleKey = ctx?.styleKey
  const applied = useRef({}) // layer id → last spec applied
  const lastData = useRef(null)
  const specs = palette ? makeLayers(palette).map((l) => ({ ...l, source: id })) : []

  // (Re)create the source when the map or base style appears. Layers are synced below.
  useEffect(() => {
    if (!map) return undefined
    if (!map.getSource(id)) {
      map.addSource(id, { type: 'geojson', data: data || EMPTY, ...(attribution ? { attribution } : {}), ...source })
      lastData.current = data
      applied.current = {}
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, styleKey, id])

  // Remove everything on unmount.
  useEffect(
    () => () => {
      if (!map) return
      try {
        for (const lid of Object.keys(applied.current)) if (map.getLayer(lid)) map.removeLayer(lid)
        if (map.getSource(id)) map.removeSource(id)
      } catch {
        // The map itself is already gone.
      }
      applied.current = {}
    },
    [map, id],
  )

  // Data.
  useEffect(() => {
    if (!map) return
    const src = map.getSource(id)
    if (!src || data === lastData.current) return
    lastData.current = data
    src.setData(data || EMPTY)
  })

  // Layers.
  useEffect(() => {
    if (!map || !map.getSource(id)) return
    const wanted = new Set(specs.map((l) => l.id))
    for (const lid of Object.keys(applied.current)) {
      if (!wanted.has(lid)) {
        if (map.getLayer(lid)) map.removeLayer(lid)
        delete applied.current[lid]
      }
    }
    for (const spec of specs) {
      const prev = applied.current[spec.id]
      const where = before && map.getLayer(before) ? before : undefined
      if (!prev || !map.getLayer(spec.id)) {
        if (map.getLayer(spec.id)) map.removeLayer(spec.id)
        map.addLayer(spec, where)
        applied.current[spec.id] = spec
        continue
      }
      for (const [k, v] of Object.entries(spec.paint || {})) if (!same(prev.paint?.[k], v)) map.setPaintProperty(spec.id, k, v)
      for (const [k, v] of Object.entries(spec.layout || {})) if (!same(prev.layout?.[k], v)) map.setLayoutProperty(spec.id, k, v)
      if (!same(prev.filter, spec.filter)) map.setFilter(spec.id, spec.filter || null)
      if (prev.minzoom !== spec.minzoom || prev.maxzoom !== spec.maxzoom) map.setLayerZoomRange(spec.id, spec.minzoom ?? 0, spec.maxzoom ?? 24)
      applied.current[spec.id] = spec
    }
  })
}

export function useLayerEvents(layerIds, handlers) {
  const ctx = useEWMap()
  const map = ctx?.map
  const ref = useRef(handlers)
  ref.current = handlers
  const key = layerIds.join(',')
  useEffect(() => {
    if (!map) return undefined
    const offs = []
    for (const lid of layerIds) {
      const click = (e) => {
        const f = e.features?.[0]
        if (f) ref.current.click?.(f, e)
      }
      const enter = (e) => {
        map.getCanvas().style.cursor = 'pointer'
        ref.current.enter?.(e.features?.[0], e)
      }
      const leave = (e) => {
        map.getCanvas().style.cursor = ''
        ref.current.leave?.(e)
      }
      map.on('click', lid, click)
      map.on('mouseenter', lid, enter)
      map.on('mouseleave', lid, leave)
      offs.push(() => {
        map.off('click', lid, click)
        map.off('mouseenter', lid, enter)
        map.off('mouseleave', lid, leave)
      })
    }
    return () => offs.forEach((off) => off())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
}

// Runs fn(map) on map events ('moveend', 'zoomend', 'click'...) with the latest fn.
export function useMapEvent(type, fn) {
  const ctx = useEWMap()
  const map = ctx?.map
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!map) return undefined
    const h = (e) => ref.current(e, map)
    map.on(type, h)
    return () => map.off(type, h)
  }, [map, type])
}
