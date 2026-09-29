// Shareable trip links. The whole trip is packed into the link itself (after the #), so sharing
// needs no server or account, and the trip never reaches a server when the link is opened.
//
// Format: "z" + base64url(deflate-raw(JSON)) when the browser can compress, otherwise "j" + base64url(JSON).
// The JSON is a compact copy of the trip:
//   { v: 1, n: name, a: startDate, b: endDate,
//     s: [[cityId, days|null, auto(0/1), [placeIds]]],     stops in order
//     t: { placeId: status },                              statuses other than "saved"
//     i: { dayNumber: [[placeIds], note] },                itinerary
//     o: tripNote, c: { cityId: note },                    notes
//     x: [place, ...] }                                    places from OpenStreetMap the trip uses (not in the built-in data)
import { HASH_MODE } from './router.jsx'
import { SITE_URL } from './meta.js'

const toBase64Url = (bytes) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromBase64Url = (text) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0))
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export function packTrip(trip, extraPlaces = []) {
  const data = { v: 1, s: trip.stops.map((s) => [s.cityId, s.days, s.auto ? 1 : 0, s.placeIds]) }
  if (trip.name) data.n = trip.name
  if (trip.startDate) data.a = trip.startDate
  if (trip.endDate) data.b = trip.endDate
  const t = Object.fromEntries(Object.entries(trip.statuses).filter(([, st]) => st !== 'saved'))
  if (Object.keys(t).length) data.t = t
  const i = Object.fromEntries(Object.entries(trip.itinerary).map(([n, d]) => [n, d.note ? [d.placeIds, d.note] : [d.placeIds]]))
  if (Object.keys(i).length) data.i = i
  if (trip.notes.trip) data.o = trip.notes.trip
  const c = Object.fromEntries(Object.entries(trip.notes.cities).filter(([, text]) => text))
  if (Object.keys(c).length) data.c = c
  if (extraPlaces.length) data.x = extraPlaces
  return data
}

// Back to the trip shape useTrip understands (it validates everything again when loading).
export function unpackTrip(data) {
  if (!data || data.v !== 1 || !Array.isArray(data.s)) throw new Error('Not a trip link')
  const placeIds = data.s.flatMap((s) => (Array.isArray(s[3]) ? s[3] : []))
  const statuses = Object.fromEntries(placeIds.map((id) => [id, data.t?.[id] || 'saved']))
  return {
    trip: {
      version: 3,
      name: data.n || '',
      stops: data.s.map(([cityId, days, auto, ids]) => ({ cityId, days, auto: Boolean(auto), placeIds: ids || [] })),
      startDate: data.a || '',
      endDate: data.b || '',
      statuses,
      itinerary: Object.fromEntries(Object.entries(data.i || {}).map(([n, [ids, note]]) => [n, { placeIds: ids || [], note: note || '' }])),
      notes: { trip: data.o || '', cities: data.c || {} },
    },
    extraPlaces: Array.isArray(data.x) ? data.x : [],
  }
}

export async function encodeTrip(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  if (typeof CompressionStream === 'function') {
    try {
      return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))
    } catch {
      // Fall through to the uncompressed form.
    }
  }
  return 'j' + toBase64Url(bytes)
}

export async function decodeTrip(code) {
  const kind = code[0]
  let bytes = fromBase64Url(code.slice(1))
  if (kind === 'z') {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot open compressed trip links')
    bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
  } else if (kind !== 'j') throw new Error('Unknown link format')
  return unpackTrip(JSON.parse(new TextDecoder().decode(bytes)))
}

export async function shareUrl(trip, extraPlaces) {
  const code = await encodeTrip(packTrip(trip, extraPlaces))
  // The preview build runs inside another page, so its links point at the real site.
  const origin = HASH_MODE ? SITE_URL : window.location.origin
  return `${origin}/trip#share=${code}`
}
