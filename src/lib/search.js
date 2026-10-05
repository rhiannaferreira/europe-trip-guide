import { countries, countryByCode } from '../data/countries.js'
import { cities, cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { places } from '../data/places.js'

const STOPWORDS = new Set(['in', 'the', 'and', 'of', 'near', 'a', 'to'])

// Lowercase and strip accents so "sibenik" finds "Šibenik".
export const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const tokens = (query) => normalize(query).split(/\s+/).filter((t) => t && !STOPWORDS.has(t))

const countryText = (code) => {
  const c = countryByCode[code]
  return [c.name, ...(c.aliases || [])].join(' ')
}

// Everything a place can be found by: its name, type, category (and synonyms), city and country.
const placeText = (p) => {
  const city = cityById[p.cityId]
  const interest = interestById[p.category]
  return normalize([p.name, p.type, p.description, interest.label, ...interest.keywords, city.name, countryText(city.country)].join(' '))
}
const cityText = (c) => normalize([c.name, countryText(c.country)].join(' '))

const placeIndex = places.map((p) => [p, placeText(p)])
const cityIndex = cities.map((c) => [c, cityText(c)])
const placeTextById = Object.fromEntries(placeIndex.map(([p, text]) => [p.id, text]))

// Add a place found while the app runs (see extraPlaces.js) to the search index.
export function indexPlace(p) {
  const text = placeText(p)
  placeIndex.push([p, text])
  placeTextById[p.id] = text
}

const matchesAll = (text, ts) => ts.every((t) => text.includes(t))

// True when a place matches every word of the query (empty query matches everything).
export function placeMatches(place, query) {
  const ts = tokens(query)
  if (ts.length === 0) return true
  return matchesAll(placeTextById[place.id] ?? placeText(place), ts)
}

// How well a name matches: whole name, start of the name, start of a word, anywhere.
function nameScore(name, ts, query) {
  const n = normalize(name)
  const q = normalize(query.trim())
  if (n === q) return 100
  if (n.startsWith(q)) return 80
  if (ts.every((t) => n.split(/[\s'’-]+/).some((w) => w.startsWith(t)))) return 60
  if (ts.every((t) => n.includes(t))) return 20 // inside a word ("rome" in "Promenade")
  return 10 // matched on type, city, country or description only
}

const rank = (list, query, ts, nameOf, bonus = () => 0) =>
  list
    .map(([item, text]) => (matchesAll(text, ts) ? [item, nameScore(nameOf(item), ts, query) + bonus(item)] : null))
    .filter(Boolean)
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item)

// Suggestions for the search dropdown, grouped by kind, best matches first.
export function search(query, limit = 6) {
  const ts = tokens(query)
  if (ts.length === 0) return { countries: [], cities: [], places: [], fuzzy: false }
  const result = {
    countries: rank(countries.map((c) => [c, normalize(countryText(c.code))]), query, ts, (c) => c.name).slice(0, 3),
    cities: rank(cityIndex, query, ts, (c) => c.name, (c) => (c.size === 'major' ? 2 : 0)).slice(0, limit),
    // Places in a city whose name matches ("rome") come before places that only match mid-word.
    places: rank(placeIndex, query, ts, (p) => p.name, (p) => (p.rating || 0) + (normalize(cityById[p.cityId].name).startsWith(ts[0]) ? 30 : 0)).slice(0, limit),
    fuzzy: false,
  }
  if (result.countries.length + result.cities.length + result.places.length > 0) return result
  return { ...closeMatches(normalize(query.trim()), limit), fuzzy: true }
}

// Edit distance (insertions, deletions, substitutions and swapped neighbours), stopping early past `max`.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2 = null
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      best = Math.min(best, v)
    }
    if (best > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

// "Did you mean": names within a typo or two of the query ("barcelna" → Barcelona). Compares the query
// with the whole name and with the start of the name, so half-typed words still find something.
function closeMatches(q, limit) {
  if (q.length < 3) return { countries: [], cities: [], places: [] }
  const max = q.length <= 4 ? 1 : 2
  const near = (name) => {
    const n = normalize(name)
    return Math.min(distance(q, n, max), distance(q, n.slice(0, q.length), max), ...n.split(/\s+/).map((w) => distance(q, w, max)))
  }
  const pick = (list, nameOf, n) =>
    list
      .map((item) => [item, near(nameOf(item))])
      .filter(([, d]) => d <= max)
      .sort((a, b) => a[1] - b[1])
      .slice(0, n)
      .map(([item]) => item)
  return {
    countries: pick(countries, (c) => c.name, 2),
    cities: pick(cities, (c) => c.name, limit),
    places: pick(places, (p) => p.name, limit),
  }
}

// The place in a list whose name best matches `query`: contains it first, then within a typo or two
// ("Colessum" → Colosseum). Null when nothing is close.
export function closestPlace(list, query) {
  const q = normalize(String(query || '').trim())
  if (q.length < 3) return null
  const hit = list.find((p) => normalize(p.name).includes(q))
  if (hit) return hit
  const max = q.length <= 4 ? 1 : 2
  const near = (name) => {
    const n = normalize(name)
    return Math.min(distance(q, n, max), distance(q, n.slice(0, q.length), max), ...n.split(/\s+/).map((w) => distance(q, w, max)))
  }
  const best = list.map((p) => [p, near(p.name)]).filter(([, d]) => d <= max).sort((a, b) => a[1] - b[1])[0]
  return best ? best[0] : null
}

// Split text into [{ text, hit }] parts, marking where the query's words appear (ignoring accents and case).
export function highlight(text, query) {
  const ts = tokens(query)
  if (!ts.length) return [{ text, hit: false }]
  // Normalise one character at a time so positions in the normalised text map back to the original.
  let norm = ''
  const origin = []
  ;[...text].forEach((ch, i) => {
    const n = normalize(ch)
    for (const c of n) {
      norm += c
      origin.push(i)
    }
  })
  const chars = [...text]
  const hit = new Array(chars.length).fill(false)
  for (const t of ts) {
    let from = 0
    let at
    while ((at = norm.indexOf(t, from)) !== -1) {
      for (let k = at; k < at + t.length; k++) hit[origin[k]] = true
      from = at + t.length
    }
  }
  const parts = []
  chars.forEach((ch, i) => {
    const last = parts[parts.length - 1]
    if (last && last.hit === hit[i]) last.text += ch
    else parts.push({ text: ch, hit: hit[i] })
  })
  return parts
}
