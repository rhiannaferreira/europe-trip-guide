// "Optimize route" for one day: a simple nearest-neighbour ordering.
//
// Start at the day's first place, then keep walking to the closest place not visited yet.
// This usually removes obvious back-and-forth, but it is NOT guaranteed to be the shortest route,
// and it uses straight-line distances, not streets or public transport.
import { distanceKm } from './distance.js'

export function nearestNeighbourOrder(places) {
  if (places.length < 3) return [...places]
  const left = places.slice(1)
  const order = [places[0]]
  while (left.length) {
    const here = order[order.length - 1]
    let best = 0
    for (let i = 1; i < left.length; i++) if (distanceKm(here, left[i]) < distanceKm(here, left[best])) best = i
    order.push(left.splice(best, 1)[0])
  }
  return order
}

// Total straight-line distance when visiting places in the given order, in km.
export function pathLengthKm(places) {
  let km = 0
  for (let i = 1; i < places.length; i++) km += distanceKm(places[i - 1], places[i])
  return km
}

// Suggested order plus the before/after distances, so the UI can say how much it helps.
export function optimizeDay(places) {
  const order = nearestNeighbourOrder(places)
  const before = pathLengthKm(places)
  const after = pathLengthKm(order)
  const changed = order.some((p, i) => p.id !== places[i].id)
  // Only suggest a new order when it's actually shorter.
  return changed && after < before - 0.01 ? { order, before, after, changed: true } : { order: places, before, after: before, changed: false }
}
