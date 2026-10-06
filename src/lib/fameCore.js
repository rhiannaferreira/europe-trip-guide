// How well known a place is: the number of Wikipedia language editions with an article about it,
// from Wikidata (free, no key, asked from the visitor's browser like the photos). The Trevi Fountain
// has 70+, a neighbourhood church 1 or 2, most restaurants none. It is a fame signal, not a review
// score, and is only ever shown as what it is ("on Wikipedia in 64 languages").
//
// Requests are batched (50 items each) and cached in localStorage for a month.
import { createCache, fetchJSON } from './net.js'

const API = 'https://www.wikidata.org/w/api.php'
const cache = createCache('fame', { ttlDays: 30, max: 1500 })
export const WELL_KNOWN = 10 // languages: about the point where a place is known well beyond its city

const valid = (id) => typeof id === 'string' && /^Q\d{1,12}$/.test(id)

export function knownFame(id) {
  return valid(id) ? cache.get(id) : undefined
}

export async function loadFame(ids) {
  const todo = [...new Set(ids.filter(valid))].filter((id) => cache.get(id) === undefined)
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50)
    const params = new URLSearchParams({ action: 'wbgetentities', ids: batch.join('|'), props: 'sitelinks', format: 'json', origin: '*' })
    const data = await fetchJSON(`${API}?${params}`)
    for (const id of batch) {
      const links = data?.entities?.[id]?.sitelinks || {}
      // Only Wikipedias ("enwiki", "itwiki"...), not Wikivoyage, Commons or Wikiquote.
      const n = Object.keys(links).filter((k) => /^[a-z_]+wiki$/.test(k) && !['commonswiki', 'specieswiki', 'metawiki', 'wikidatawiki'].includes(k)).length
      cache.set(id, n)
    }
  }
}

