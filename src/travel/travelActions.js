// Changes Travel Mode makes to the saved trip. Each takes the trip and returns the changed trip, and goes
// through lib/tripStore.updateSavedTrip, so planning mode (and the copilot) see the same change at once.
// Nothing is ever deleted: done and skipped places stay on their day.
import { placeById } from '../data/places.js'
import { dayExtras, dayHasContent, dayWithout, isTime } from '../lib/tripModel.js'
import { withPlace } from '../lib/tripStore.js'

const dayOf = (t, n) => t.itinerary?.[n] || { placeIds: [], note: '' }

function putDay(t, n, day) {
  const next = { placeIds: day.placeIds, note: day.note || '', ...dayExtras(day) }
  const itinerary = { ...t.itinerary }
  if (dayHasContent(next)) itinerary[n] = next
  else delete itinerary[n]
  return { ...t, itinerary }
}

const toggle = (list = [], id, on) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id))

// Done: also marks the place visited (the planner's own status). Undoing puts it back to "want".
export function markDone(t, n, id, on = true) {
  const day = dayOf(t, n)
  if (!day.placeIds.includes(id)) return t
  const next = putDay(t, n, { ...day, done: toggle(day.done, id, on), skipped: toggle(day.skipped, id, false) })
  const status = t.statuses?.[id]
  if (!status) return next
  if (on) return { ...next, statuses: { ...next.statuses, [id]: 'visited' } }
  return status === 'visited' ? { ...next, statuses: { ...next.statuses, [id]: 'want' } } : next
}

export function markSkipped(t, n, id, on = true) {
  const day = dayOf(t, n)
  if (!day.placeIds.includes(id)) return t
  return putDay(t, n, { ...day, skipped: toggle(day.skipped, id, on), done: toggle(day.done, id, false) })
}

// A start time ('HH:MM', destination time), or null to go back to the suggested one.
export function setStartTime(t, n, id, time) {
  const day = dayOf(t, n)
  if (!day.placeIds.includes(id)) return t
  const times = { ...(day.times || {}) }
  if (isTime(time)) times[id] = time
  else delete times[id]
  return putDay(t, n, { ...day, times })
}

// The traveller's own departure time on a travel day, or null.
export function setDeparture(t, n, time) {
  const day = dayOf(t, n)
  const next = { ...day }
  if (isTime(time)) next.depart = time
  else delete next.depart
  return putDay(t, n, next)
}

// One step earlier or later in the day's order.
export function shiftInDay(t, n, id, delta) {
  const day = dayOf(t, n)
  const i = day.placeIds.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= day.placeIds.length) return t
  const placeIds = [...day.placeIds]
  ;[placeIds[i], placeIds[j]] = [placeIds[j], placeIds[i]]
  return putDay(t, n, { ...day, placeIds })
}

// Move a place to the end of another day. It leaves its old day with its time and marks.
export function moveToDay(t, from, id, to) {
  if (from === to || !Number.isInteger(to) || to < 1) return t
  let next = putDay(t, from, dayWithout(dayOf(t, from), [id]))
  const target = dayOf(next, to)
  next = putDay(next, to, { ...target, placeIds: [...target.placeIds, id] })
  return next
}

// Add a place to a day (saving it first if needed), at the end or with a start time. A place already on
// another day moves.
export function addToDay(t, n, id, time = null) {
  if (!placeById[id]) return t
  let next = withPlace(t, id)
  for (const [k, d] of Object.entries(next.itinerary || {})) if (Number(k) !== n && d.placeIds.includes(id)) next = putDay(next, Number(k), dayWithout(d, [id]))
  const day = dayOf(next, n)
  if (day.placeIds.includes(id)) return next
  const times = isTime(time) ? { ...(day.times || {}), [id]: time } : day.times
  return putDay(next, n, { ...day, placeIds: [...day.placeIds, id], times })
}
