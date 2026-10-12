// Is this Tripadvisor listing the same place as ours? Names alone aren't enough ("Café Central" is in
// half the cities of Europe), so a match weighs how alike the names are and how close the two points are,
// and an unsure match is never used: no rating is better than the wrong one.
//
// confidence = 0.65 × name similarity + 0.35 × closeness, both 0..1.
//   ≥ 0.85  high: use it
//   ≥ 0.70  medium: use only if the fresh details confirm it (see confirm())
//   else    low: don't show a rating
// Two candidates within 0.05 of each other also count as unsure.

export const HIGH = 0.85
export const MEDIUM = 0.7

// Words that say what kind of place it is, not which one ("Ristorante Roscioli" = "Roscioli").
const GENERIC = new Set(
  'the a an of and el la le les il lo los las l de del della di da do dos das du der die das den et e y und restaurant restaurante ristorante trattoria osteria taverna taberna pizzeria pizza bar cafe caffe cafeteria coffee bistro brasserie gelateria gastropub pub tavern kitchen museum museo musee museu museum church chiesa basilica eglise iglesia kirche cathedral cattedrale duomo park parco parque jardin garden giardino hotel'.split(
    ' ',
  ),
)

export const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const tokens = (s) => fold(s).split(' ').filter((w) => w && !GENERIC.has(w))

function lev(a, b) {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = t
    }
  }
  return prev[b.length]
}

// 0..1: how alike two names are, ignoring accents, punctuation and words like "Ristorante".
export function nameSimilarity(a, b) {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.length || !tb.length) return fold(a) && fold(a) === fold(b) ? 1 : 0
  const ja = ta.join(' ')
  const jb = tb.join(' ')
  if (ja === jb) return 1
  const edit = 1 - lev(ja, jb) / Math.max(ja.length, jb.length)
  const A = new Set(ta)
  const B = new Set(tb)
  const shared = [...A].filter((w) => B.has(w)).length
  const jaccard = shared / new Set([...A, ...B]).size
  // One name inside the other ("Roscioli" / "Roscioli Salumeria con Cucina"): close, not certain.
  const contained = shared === Math.min(A.size, B.size) && Math.min(ja.length, jb.length) >= 4 ? 0.88 : 0
  return Math.max(edit, jaccard, contained)
}

const toRad = (d) => (d * Math.PI) / 180
export function metres(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// 0..1: how close two points are. Map points for the same place can differ by a building or two.
export function closeness(m) {
  if (!Number.isFinite(m)) return 0
  if (m <= 40) return 1
  if (m <= 80) return 0.85
  if (m <= 150) return 0.6
  if (m <= 250) return 0.3
  return 0
}

function score(place, cand) {
  const name = Math.max(0, ...cand.names.map((n) => nameSimilarity(place.name, n)))
  const m = metres(place, cand)
  return { name, m, confidence: Math.round((0.65 * name + 0.35 * closeness(m)) * 100) / 100 }
}

// place: { name, lat, lng }; candidates: [{ id, names, lat, lng }]
// → { matched, level: 'high' | 'medium' | 'low', confidence, providerId?, reason }
export function bestMatch(place, candidates) {
  const scored = candidates.map((c) => ({ c, ...score(place, c) })).sort((x, y) => y.confidence - x.confidence)
  const [top, next] = scored
  if (!top) return { matched: false, level: 'low', confidence: 0, reason: 'no Tripadvisor listing nearby' }
  const reason = `name ${Math.round(top.name * 100)}% alike, ${Math.round(top.m)} m apart`
  if (next && top.confidence - next.confidence < 0.05 && next.confidence >= MEDIUM) {
    return { matched: false, level: 'low', confidence: top.confidence, reason: `two listings fit equally well (${reason})` }
  }
  // A very different name is never the same place, however close.
  if (top.name < 0.6 || top.confidence < MEDIUM) return { matched: false, level: 'low', confidence: top.confidence, reason }
  return { matched: true, level: top.confidence >= HIGH ? 'high' : 'medium', confidence: top.confidence, providerId: top.c.id, reason }
}

// The fresh details must still describe our place: same kind of name, and close by. A medium match
// needs the details to bring it to high confidence; any match is dropped if the details disagree.
export function confirm(place, details, level) {
  if (!Number.isFinite(details?.lat) || !Number.isFinite(details?.lng)) return false
  const s = score(place, { names: details.names?.length ? details.names : [details.name], lat: details.lat, lng: details.lng })
  if (s.name < 0.6 || s.m > 250) return false
  return level === 'high' ? s.confidence >= MEDIUM : s.confidence >= HIGH
}
