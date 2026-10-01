// More real places for a city from OpenStreetMap (via the free Overpass API), added to the
// built-in sample places when a city is opened.
//
// Only named places that also have a Wikidata entry are used, which keeps it to notable
// museums, landmarks, parks, markets and the like rather than every café. Places already in the
// built-in data are skipped. Results are cached per city for two weeks, and the built-in places
// are always shown whether or not this works.
import { useEffect, useState } from 'react'
import { placesInCity } from '../data/places.js'
import { createCache, fetchJSON } from './net.js'
import { normalize } from './search.js'
import { registerPlaces } from './extraPlaces.js'
import { distanceKm } from '../utils/distance.js'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const MAX_PER_CITY = 24
const cache = createCache('osm-places', { ttlDays: 14, max: 60 })

const RULES = [
  ['tourism', '^(museum|gallery)$', 'museums'],
  ['historic', '^(castle|monument|memorial|ruins|archaeological_site|city_gate|fort|palace|church|cathedral)$', 'history'],
  ['amenity', '^(place_of_worship)$', 'history'],
  ['tourism', '^(viewpoint|attraction)$', null], // category from other tags, else history
  ['leisure', '^(park|garden|nature_reserve)$', 'outdoors'],
  ['natural', '^(peak|beach)$', 'outdoors'],
  ['amenity', '^(marketplace|restaurant|cafe)$', 'food'],
  ['amenity', '^(bar|pub|nightclub|biergarten)$', 'nightlife'],
  ['shop', '^(mall|department_store)$', 'shopping'],
]

export function overpassQuery(city) {
  const r = city.size === 'major' ? 6000 : 3500
  const around = `(around:${r},${city.lat},${city.lng})`
  const lines = RULES.map(([k, re]) => `nwr${around}["${k}"~"${re}"]["name"]["wikidata"];`)
  return `[out:json][timeout:25];(${lines.join('')});out center tags 200;`
}

const LABELS = {
  museum: 'Museum', gallery: 'Art gallery', castle: 'Castle', monument: 'Monument', memorial: 'Memorial', ruins: 'Ruins',
  archaeological_site: 'Archaeological site', city_gate: 'City gate', fort: 'Fort', palace: 'Palace', church: 'Church',
  cathedral: 'Cathedral', place_of_worship: 'Place of worship', viewpoint: 'Viewpoint', attraction: 'Sight', park: 'Park',
  garden: 'Garden', nature_reserve: 'Nature reserve', peak: 'Hill or peak', beach: 'Beach', marketplace: 'Market',
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Pub', nightclub: 'Club', biergarten: 'Beer garden',
  mall: 'Shopping centre', department_store: 'Department store',
}

function classify(tags) {
  for (const [k, re, category] of RULES) {
    const v = tags[k]
    if (!v || !new RegExp(re).test(v)) continue
    if (category) return { category, type: v }
    // tourism=attraction/viewpoint: viewpoints are outdoors; attractions follow any historic tag.
    if (v === 'viewpoint') return { category: 'outdoors', type: v }
    return { category: tags.historic ? 'history' : tags.leisure || tags.natural ? 'outdoors' : 'history', type: tags.historic || v }
  }
  return null
}

// Overpass elements → places in the app's shape, without the ones the built-in data already has.
export function toPlaces(city, elements) {
  const builtIn = placesInCity(city.id).filter((p) => p.source !== 'osm').map((p) => ({ ...p, n: normalize(p.name) }))
  const seen = new Set()
  const out = []
  for (const el of elements || []) {
    const tags = el.tags || {}
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    const name = tags['name:en'] || tags.name
    const kind = classify(tags)
    if (!name || lat == null || lng == null || !kind) continue
    const n = normalize(name)
    if (seen.has(tags.wikidata) || seen.has(n)) continue
    // Same as a built-in place: same name, or one name inside the other and close together.
    if (builtIn.some((p) => p.n === n || ((p.n.includes(n) || n.includes(p.n)) && distanceKm(p, { lat, lng }) < 0.5))) continue
    seen.add(tags.wikidata)
    seen.add(n)
    const wiki = /^en:/.test(tags.wikipedia || '') ? tags.wikipedia.slice(3) : null
    out.push({
      id: `osm-${el.type[0]}${el.id}`,
      cityId: city.id,
      category: kind.category,
      type: kind.type,
      name,
      lat,
      lng,
      description: `${LABELS[kind.type] || 'Place'} listed on OpenStreetMap.`,
      wiki,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      website: tags.website || tags['contact:website'] || null,
      rank: (wiki ? 2 : 0) + (tags.wikipedia ? 1 : 0),
    })
  }
  // Best-known first (with an English Wikipedia article), then spread across interests.
  out.sort((a, b) => b.rank - a.rank)
  const byCategory = {}
  out.forEach((p) => (byCategory[p.category] ||= []).push(p))
  const picked = []
  while (picked.length < MAX_PER_CITY && Object.values(byCategory).some((l) => l.length)) {
    for (const list of Object.values(byCategory)) if (list.length && picked.length < MAX_PER_CITY) picked.push(list.shift())
  }
  return picked.map(({ rank, ...p }) => p) // eslint-disable-line no-unused-vars
}

const inflight = new Map()

async function fetchCity(city) {
  const data = await fetchJSON(OVERPASS, {
    timeout: 30000,
    init: { method: 'POST', body: new URLSearchParams({ data: overpassQuery(city) }) },
  })
  return toPlaces(city, data.elements)
}

// The same, outside React (the travel copilot): registers the city's OpenStreetMap places and returns them.
// Throws if Overpass can't be reached and nothing is cached.
export async function loadOsmPlaces(city) {
  const cached = cache.get(city.id)
  if (cached) {
    registerPlaces(cached)
    return cached
  }
  if (!inflight.has(city.id)) inflight.set(city.id, fetchCity(city).finally(() => inflight.delete(city.id)))
  const list = await inflight.get(city.id)
  cache.set(city.id, list)
  registerPlaces(list)
  return list
}

// { status: 'idle' | 'loading' | 'ready' | 'error', count, error, retry }
export function useOsmPlaces(city) {
  const [state, setState] = useState({ status: 'idle', count: 0 })
  const [attempt, setAttempt] = useState(0)
  const id = city?.id

  useEffect(() => {
    if (!city) return setState({ status: 'idle', count: 0 })
    const cached = cache.get(city.id)
    if (cached) {
      registerPlaces(cached)
      return setState({ status: 'ready', count: cached.length })
    }
    let live = true
    setState({ status: 'loading', count: 0 })
    if (!inflight.has(city.id)) inflight.set(city.id, fetchCity(city).finally(() => inflight.delete(city.id)))
    inflight.get(city.id).then(
      (list) => {
        cache.set(city.id, list)
        registerPlaces(list)
        if (live) setState({ status: 'ready', count: list.length })
      },
      (error) => live && setState({ status: 'error', count: 0, error }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
