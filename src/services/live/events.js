// eventsService: searchEvents({ cityId, startDate, endDate, categories }) → normalized events.
//
// Today the only provider is EuroWander's own curated list (data/events.js), whose dates are
// approximate. A live provider (Ticketmaster Discovery, say) would be a second adapter returning the same
// shape from the gateway; callers wouldn't change.
//
// Event: { id, provider, name, cityId, start 'YYYY-MM-DD', end, category, description, emoji,
//          dateConfidence: 'approximate' | 'confirmed', url? }
import { events as curated } from '../../data/events.js'

export const EVENT_CATEGORIES = ['festival', 'market', 'concert', 'sports', 'culture', 'seasonal']

const CATEGORY_OF = (e) =>
  /christmas|market|winter/i.test(e.name) ? 'market' : /music|festival of lights|fringe|arts|opera|concert|spring festival/i.test(e.name + e.description) ? 'culture' : 'festival'

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const ymd = (d) => d.toISOString().slice(0, 10)

// The curated month-day ranges as dates in a given year range (an end before the start runs over New Year).
function curatedIn(cityId, from, to) {
  const out = []
  for (let y = from.getUTCFullYear() - 1; y <= to.getUTCFullYear(); y++) {
    for (const e of curated) {
      if (cityId && e.cityId !== cityId) continue
      const start = parse(`${y}-${e.start}`)
      const end = parse(`${e.end < e.start ? y + 1 : y}-${e.end}`)
      if (end < from || start > to) continue
      out.push({
        id: `${e.id}-${y}`,
        provider: 'eurowander',
        name: e.name,
        cityId: e.cityId,
        start: ymd(start),
        end: ymd(end),
        category: CATEGORY_OF(e),
        description: e.description,
        emoji: e.emoji,
        dateConfidence: 'approximate',
      })
    }
  }
  return out
}

export async function searchEvents({ cityId = null, startDate, endDate, categories = [] } = {}) {
  const from = parse(startDate)
  const to = parse(endDate || startDate)
  const list = curatedIn(cityId, from, to).filter((e) => !categories.length || categories.includes(e.category))
  return { events: list.sort((a, b) => a.start.localeCompare(b.start)), source: 'curated' }
}
