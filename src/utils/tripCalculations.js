// Day-by-day trip maths: which city each day belongs to, the date of each day, and travel days.
// Plain functions with no React, so the rules are easy to read and test.
import { tripDays } from '../lib/trip.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const parseDate = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null)

// The date of day `n` (1-based) of a trip starting on `startDate`, as a Date.
export function dateOfDay(startDate, n) {
  const start = parseDate(startDate)
  if (!start) return null
  // Add days via the calendar (not milliseconds) so daylight-saving changes can't shift the date.
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + n - 1)
}

// "Thu 4 Jun"
export const formatDay = (date) => (date ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '')
// "4 June"
export const formatLongDate = (date) => (date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '')

export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY_MS)

// How many days each stop gets.
// A stop with a whole number in `days` keeps it (the user set it with +/-). The rest of the trip is shared
// evenly between the other stops, in order, with any spare day going to the earlier stops.
// If the fixed numbers add up to more than the trip, days are taken off the last stops first.
// If every stop is fixed and they add up to less, the last stop gets the spare days.
export function allocateDays(totalDays, stops) {
  if (!totalDays || stops.length === 0) return stops.map(() => 0)
  const fixed = stops.map((s) => (Number.isInteger(s.days) && s.days >= 0 ? s.days : null))
  const autoCount = fixed.filter((d) => d === null).length
  const fixedSum = fixed.reduce((sum, d) => sum + (d ?? 0), 0)

  let counts
  if (autoCount > 0 && fixedSum <= totalDays) {
    const left = totalDays - fixedSum
    let spare = left % autoCount
    counts = fixed.map((d) => {
      if (d !== null) return d
      const extra = spare > 0 ? 1 : 0
      spare -= extra
      return Math.floor(left / autoCount) + extra
    })
  } else {
    counts = fixed.map((d) => d ?? 0)
    let diff = totalDays - counts.reduce((a, b) => a + b, 0)
    if (diff > 0) counts[counts.length - 1] += diff
    for (let i = counts.length - 1; diff < 0 && i >= 0; i--) {
      const take = Math.min(counts[i], -diff)
      counts[i] -= take
      diff += take
    }
  }
  return counts
}

// One entry per trip day:
//   { number, date, cityId, stopIndex, leg }
// `leg` is set on the first day at every stop after the first: that's the travel day, and the leg is the
// journey from the previous stop (from tripLegs, so it carries minutes, mode and whether it's estimated).
export function buildDays({ startDate, endDate, stops, legs = [] }) {
  const total = tripDays(startDate, endDate)
  if (!total || stops.length === 0) return []
  const counts = allocateDays(total, stops)
  const days = []
  stops.forEach((stop, i) => {
    for (let k = 0; k < counts[i]; k++) {
      const number = days.length + 1
      days.push({
        number,
        date: dateOfDay(startDate, number),
        cityId: stop.cityId,
        stopIndex: i,
        leg: k === 0 && i > 0 ? legs[i - 1] || null : null,
      })
    }
  })
  return days
}

// Days per stop, for the +/- controls: [{ cityId, count, fixed, firstDay, lastDay }].
export function stopDayRanges(days, stops) {
  const counts = allocateDays(days.length, stops)
  let next = 1
  return stops.map((s, i) => {
    const range = { cityId: s.cityId, count: counts[i], fixed: Number.isInteger(s.days), firstDay: next, lastDay: next + counts[i] - 1 }
    next += counts[i]
    return range
  })
}

// Itinerary day numbers that hold something but are no longer inside the trip (the dates got shorter).
export function daysOutsideTrip(itinerary, dayCount) {
  return Object.keys(itinerary)
    .map(Number)
    .filter((n) => n > dayCount && ((itinerary[n].placeIds || []).length > 0 || (itinerary[n].note || '').trim()))
    .sort((a, b) => a - b)
}

// Saved places that aren't on any day yet.
export function unscheduledPlaceIds(stops, itinerary) {
  const scheduled = new Set(Object.values(itinerary).flatMap((d) => d.placeIds || []))
  return stops.flatMap((s) => s.placeIds).filter((id) => !scheduled.has(id))
}

// The day number a place is on, or null.
export function dayOfPlace(itinerary, placeId) {
  for (const [n, d] of Object.entries(itinerary)) if ((d.placeIds || []).includes(placeId)) return Number(n)
  return null
}

// Travel-time rules for a travel day. Returns null on days without travel.
//   3 hours or more on the move: a travel day, suggest fewer activities.
//   Under 3 hours: a note that part of the day goes to travel.
// Activities are never removed; this is advice only.
export const HEAVY_TRAVEL_MINUTES = 180
export function travelDayAdvice(day, activityCount = 0) {
  if (!day?.leg) return null
  const { minutes } = day.leg
  if (!Number.isFinite(minutes)) return { level: 'unknown', text: 'No travel time for this journey yet. Check timetables before planning the day.' }
  if (minutes >= HEAVY_TRAVEL_MINUTES) {
    const busy = activityCount >= 3 ? ` You have ${activityCount} activities planned; maybe move one to another day.` : ''
    return { level: 'heavy', text: `Travel day — consider planning fewer activities.${busy}` }
  }
  return { level: 'light', text: 'Part of this day goes to travel, so leave some slack around the train.' }
}
