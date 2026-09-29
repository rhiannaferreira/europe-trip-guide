// Trip calculations. Plain rules, all written out here so the numbers are easy to check.
import { cityById } from '../data/cities.js'
import { events } from '../data/events.js'
import { getTrainTime } from '../data/trainTimes.js'
import { distanceKm } from './geo.js'
import { formatDuration, monthNames } from './format.js'

const DAY_MS = 24 * 60 * 60 * 1000
const parseDate = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null)

// Number of calendar days from start to end, counting both. Null if either date is missing or out of order.
export function tripDays(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end || end < start) return null
  return Math.round((end - start) / DAY_MS) + 1
}

// Rough rail time when we have no sample data: rail lines run about 25% longer than a straight
// line, at an average of about 100 km/h, plus 20 minutes for getting on and off.
export const estimateMinutes = (km) => Math.round(((km * 1.25) / 100) * 60 + 20)
const LONG_KM = 1000

// One entry per hop between consecutive stops.
export function tripLegs(cityIds) {
  return cityIds.slice(1).map((toId, i) => {
    const from = cityById[cityIds[i]]
    const to = cityById[toId]
    const km = distanceKm(from, to)
    const known = getTrainTime(from.id, to.id)
    if (known) return { from, to, km, minutes: known.minutes, mode: known.mode, note: known.note, estimated: false }
    return {
      from,
      to,
      km,
      minutes: estimateMinutes(km),
      mode: 'train',
      estimated: true,
      note: km > LONG_KM ? 'Long way by rail: a night train or a flight may suit better.' : 'No sample timetable; estimated from distance.',
    }
  })
}

// Pace rule: under 2 days per city is fast-paced, 2 to 3 is moderate, over 3 is relaxed.
export const PACE_RULE = 'Under 2 days per city is fast-paced, 2–3 is moderate, more than 3 is relaxed.'
export function tripPace(days, cityCount) {
  if (!days || cityCount === 0) return null
  const perCity = days / cityCount
  const label = perCity < 2 ? 'Fast-paced' : perCity <= 3 ? 'Moderate' : 'Relaxed'
  return { perCity, label }
}

// Gentle suggestions when the plan looks tight. Each rule is listed in the order it's checked.
export function tripSuggestions({ days, cityIds, legs }) {
  const out = []
  const n = cityIds.length
  if (days && n >= 3 && days / n < 1.5) {
    out.push(`Your trip has ${n} cities in ${days} days. Consider removing one stop for more time in each city.`)
  } else if (days && n >= 2 && days < n) {
    out.push(`You have fewer days than cities (${days} days, ${n} cities). A day trip from a nearby base might be easier.`)
  }
  const travelMinutes = legs.reduce((sum, l) => sum + l.minutes, 0)
  if (days && travelMinutes / days > 180) {
    out.push(`That's about ${formatDuration(travelMinutes)} of travel over ${days} days. Swapping a far-off stop for a closer one would free up time.`)
  }
  const longLeg = legs.find((l) => l.minutes >= 420)
  if (longLeg) {
    out.push(`${longLeg.from.name} → ${longLeg.to.name} is a long journey (${formatDuration(longLeg.minutes)}). A night train or a stop in between can break it up.`)
  }
  return out
}

// Month-day strings ("09-19") to a Date in a given year.
const md = (year, mmdd) => new Date(`${year}-${mmdd}T00:00:00`)

// Events whose yearly dates overlap the trip, limited to cities on the trip.
export function eventsDuringTrip(startDate, endDate, cityIds) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end || end < start) return []
  const onTrip = new Set(cityIds)
  const matches = []
  for (const e of events) {
    if (!onTrip.has(e.cityId)) continue
    // Check the event's run in each year the trip touches (and the year before, for New Year events).
    for (let y = start.getFullYear() - 1; y <= end.getFullYear(); y++) {
      const eStart = md(y, e.start)
      const eEnd = e.end < e.start ? md(y + 1, e.end) : md(y, e.end)
      if (eStart <= end && eEnd >= start) {
        matches.push({ event: e, city: cityById[e.cityId] })
        break
      }
    }
  }
  return matches
}

// Months (1–12) the trip touches.
export function tripMonths(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end || end < start) return []
  const months = new Set()
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1, 1)) months.add(d.getMonth() + 1)
  months.add(end.getMonth() + 1)
  return [...months]
}

// Season notes for the stops, from each city's hardcoded seasons. Cities sharing a note are grouped.
export function seasonNotes(startDate, endDate, cityIds) {
  const months = tripMonths(startDate, endDate)
  if (months.length === 0) return []
  const monthText = months.map((m) => monthNames[m - 1]).join('/')
  const hit = (list) => list && months.some((m) => list.includes(m))
  const names = (list) => list.map((c) => c.name).join(', ').replace(/, ([^,]*)$/, ' and $1')
  const special = []
  const busy = []
  const cheaper = []
  const goodWeather = []
  for (const id of cityIds) {
    const c = cityById[id]
    const s = c.seasons
    for (const sp of s.special || []) if (hit(sp.months)) special.push(`${sp.label} in ${c.name}`)
    if (hit(s.busy)) busy.push(c)
    else if (hit(s.lowerCost)) cheaper.push(c)
    else if (hit(s.bestWeather)) goodWeather.push(c)
  }
  const notes = []
  if (special.length) notes.push({ tone: 'good', text: `In season during your visit: ${special.join(', ')}.` })
  if (busy.length) notes.push({ tone: 'warn', text: `Busy season in ${names(busy)}. Book rooms and big sights ahead.` })
  if (cheaper.length) notes.push({ tone: 'good', text: `${names(cheaper)} ${cheaper.length === 1 ? 'is' : 'are'} usually cheaper in ${monthText}.` })
  if (goodWeather.length) notes.push({ tone: 'good', text: `${monthText} is a good weather window for ${names(goodWeather)}.` })
  return notes
}
