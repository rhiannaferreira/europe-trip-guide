// "Plan my days": picks places for each day of a plan from Eurowander's place data, grouped so each day
// stays in one part of town. Plain functions; the rules are listed here.
//
// How many things a day holds (lunch and dinner come on top):
//   full day         the pace's number (relaxed 2, moderate 3, fast-paced 4)
//   first trip day   one fewer (arrival time unknown)
//   travel day       journey under 1h 30m: one fewer; under 3h: half; 3h or more: 1, in the evening
//   last trip day    one fewer; on a round trip with a journey home, 1 in the morning
//
// Which places: each place gets points for matching an interest (+3), for its sample rating
// ((rating − 4) × 2) and −0.5 for a $$$ entry when there's a budget. The best ones fill the city's days.
//
// Grouping: the days in a city get one "anchor" each, spread as far apart as possible, and every chosen
// place joins the day of its nearest anchor that still has room. Within a day, places are visited in
// nearest-neighbour order starting with a museum or sight, so mornings go to indoor sights and evenings
// to nightlife, viewpoints and neighbourhoods. Lunch is the food place nearest the morning's last stop.
// Opening hours aren't in the data, so every day plan carries that caveat.
import { cityById } from '../data/cities.js'
import { getCountryTips } from '../data/countryTips.js'
import { placesInCity } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { distanceKm, formatDistance } from '../utils/distance.js'
import { nearestNeighbourOrder } from '../utils/routeOptimizer.js'
import { appInterests, builderInterestById, paceById } from './preferences.js'
import { planLegs, planTimeline } from './plan.js'
import { modeIcon } from './transport.js'

const EVENING_TYPES = new Set(['bar', 'club', 'neighbourhood', 'viewpoint', 'walk'])
const MORNING_CATEGORIES = new Set(['museums', 'history'])
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dayCapacity(day, { pace, totalDays }) {
  const base = paceById[pace]?.activitiesPerDay || 3
  if (day.departure) return 1
  if (day.leg) {
    const m = day.leg.minutes
    if (m < 90) return Math.max(1, base - 1)
    if (m < 180) return Math.max(1, Math.floor(base / 2))
    return 1
  }
  if (day.number === 1 || day.number === totalDays) return Math.max(1, base - 1)
  return base
}

export function placePoints(place, prefs) {
  const wanted = appInterests(prefs.interests)
  const types = prefs.interests.flatMap((id) => builderInterestById[id]?.placeTypes || [])
  let pts = 0
  if (wanted.includes(place.category) || types.includes(place.type)) pts += 3
  if (typeof place.rating === 'number') pts += (place.rating - 4) * 2
  if (prefs.budget && place.costLevel === 3) pts -= 0.5
  return pts
}

function whyPlace(place, prefs) {
  const reasons = []
  const hit = prefs.interests.find((id) => {
    const def = builderInterestById[id]
    return def?.interests.includes(place.category) || def?.placeTypes?.includes(place.type)
  })
  if (hit) reasons.push(`Matches ${builderInterestById[hit].label.toLowerCase()}`)
  if (place.costLevel === 0) reasons.push('Free')
  return reasons
}

// Spread `k` anchors across the places: start with the best one, then keep taking the place farthest
// from every anchor so far.
function anchors(places, k) {
  if (!places.length) return []
  const out = [places[0]]
  while (out.length < Math.min(k, places.length)) {
    let best = null
    let bestD = -1
    for (const p of places) {
      if (out.includes(p)) continue
      const d = Math.min(...out.map((a) => distanceKm(a, p)))
      if (d > bestD) {
        bestD = d
        best = p
      }
    }
    out.push(best)
  }
  return out
}

function orderForDay(places) {
  if (places.length < 2) return places
  const first = places.find((p) => MORNING_CATEGORIES.has(p.category)) || places.find((p) => !EVENING_TYPES.has(p.type) && p.category !== 'nightlife') || places[0]
  const ordered = nearestNeighbourOrder([first, ...places.filter((p) => p !== first)])
  // Nightlife goes last whatever its position.
  return [...ordered.filter((p) => p.category !== 'nightlife'), ...ordered.filter((p) => p.category === 'nightlife')]
}

const nearest = (from, list) => (from && list.length ? [...list].sort((a, b) => distanceKm(from, a) - distanceKm(from, b))[0] : list[0] || null)

// Day plans for every day of the plan.
// Returns [{ number, date, cityId, kind, leg, departure, items: [{ slot, placeId, label, reasons }], notes }]
//   kind   'full' | 'arrival' | 'first' | 'last'
//   slot   'travel' | 'morning' | 'lunch' | 'afternoon' | 'evening'
// `placesFor(cityId)` can add places beyond the built-in ones (OpenStreetMap extras).
export function planDays(plan, { placesFor = placesInCity, legs = planLegs(plan) } = {}) {
  const timeline = planTimeline(plan, legs)
  const totalDays = timeline.length
  const { prefs } = plan
  const out = []

  plan.stops.forEach((stop, stopIndex) => {
    const days = timeline.filter((d) => d.stopIndex === stopIndex)
    if (!days.length) return
    const all = placesFor(stop.cityId).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    const ranked = [...all].sort((a, b) => placePoints(b, prefs) - placePoints(a, prefs) || a.id.localeCompare(b.id))
    const food = ranked.filter((p) => p.category === 'food')
    const sights = ranked.filter((p) => p.category !== 'food')
    const caps = days.map((d) => dayCapacity(d, { pace: prefs.pace, totalDays }))
    const chosen = sights.slice(0, caps.reduce((a, b) => a + b, 0))
    // Full days first, so they get the anchors.
    const byRoom = days.map((d, i) => ({ d, i, cap: caps[i] })).sort((a, b) => b.cap - a.cap || a.i - b.i)
    const anchorList = anchors(chosen, byRoom.length)
    const bucket = days.map(() => [])
    const anchorOf = new Map(byRoom.slice(0, anchorList.length).map((x, k) => [x.i, anchorList[k]]))
    for (const p of chosen) {
      const options = [...anchorOf.entries()]
        .filter(([i]) => bucket[i].length < caps[i])
        .sort((a, b) => distanceKm(a[1], p) - distanceKm(b[1], p))
      const target = options[0]?.[0] ?? byRoom.find((x) => bucket[x.i].length < x.cap)?.i
      if (target !== undefined) bucket[target].push(p)
    }
    const foodLeft = [...food]
    const takeFood = (near) => {
      const f = nearest(near, foodLeft)
      if (f) foodLeft.splice(foodLeft.indexOf(f), 1)
      return f
    }

    days.forEach((day, i) => {
      const kind = day.leg ? 'arrival' : day.departure ? 'last' : day.number === 1 ? 'first' : day.number === totalDays ? 'last' : 'full'
      const items = []
      const notes = []
      const places = orderForDay(bucket[i])
      const item = (slot, p, extra = []) => items.push({ slot, placeId: p.id, label: p.name, reasons: [...whyPlace(p, prefs), ...extra] })
      if (day.leg) {
        const l = day.leg
        items.push({
          slot: 'travel',
          placeId: null,
          label: `${modeIcon(l.mode)} ${l.from.name} → ${l.to.name}, ~${formatDuration(l.minutes)}${l.source === 'sample' ? '' : ' (estimate)'}`,
          reasons: [l.minutes >= 180 ? 'Arrival in the afternoon or evening: check in and keep it easy' : 'Check in, then explore'],
        })
        const light = places[0]
        if (light) item(day.leg.minutes >= 180 ? 'evening' : 'afternoon', light)
        places.slice(1).forEach((p) => item('evening', p))
        const dinner = takeFood(light || cityById[stop.cityId])
        if (dinner) item('evening', dinner, ['Dinner near where you stay'])
        else items.push({ slot: 'evening', placeId: null, label: 'Dinner near where you stay', reasons: [] })
      } else {
        const morning = places.filter((p) => p.category !== 'nightlife').slice(0, places.length >= 4 ? 2 : 1)
        const rest = places.filter((p) => !morning.includes(p))
        const evening = rest.filter((p) => p.category === 'nightlife' || EVENING_TYPES.has(p.type)).slice(-1)
        const afternoon = rest.filter((p) => !evening.includes(p))
        morning.forEach((p) => item('morning', p))
        if (!day.departure) {
          const lunch = takeFood(morning[morning.length - 1] || cityById[stop.cityId])
          if (lunch) {
            const from = morning[morning.length - 1]
            item('lunch', lunch, from ? [`${formatDistance(distanceKm(from, lunch))} from ${from.name}`] : [])
          } else items.push({ slot: 'lunch', placeId: null, label: 'Lunch nearby', reasons: ['No food pick in the data here; ask locally'] })
        }
        afternoon.forEach((p) => item('afternoon', p))
        evening.forEach((p) => item('evening', p))
      }
      if (day.departure) {
        const l = day.departure
        items.push({ slot: 'travel', placeId: null, label: `${modeIcon(l.mode)} ${l.from.name} → ${l.to.name}, ~${formatDuration(l.minutes)}${l.source === 'sample' ? '' : ' (estimate)'}`, reasons: ['Journey home'] })
      }
      if (!items.some((it) => it.placeId) && all.length === 0) notes.push('Eurowander has no places for this city yet. Open the city in Explore to load some from OpenStreetMap.')
      if (day.date) {
        const weekday = new Date(`${day.date}T00:00:00`).getDay()
        const tips = getCountryTips(cityById[stop.cityId].country)
        if (weekday === 0 && tips?.sunday) notes.push(`Sunday: ${tips.sunday}`)
        const museumTip = tips?.extra?.find((t) => /museum/i.test(t) && /(monday|tuesday)/i.test(t))
        if (museumTip && (weekday === 1 || weekday === 2) && places.some((p) => p.category === 'museums')) notes.push(`${WEEKDAYS[weekday]}: ${museumTip}`)
      }
      out.push({ number: day.number, date: day.date, cityId: stop.cityId, kind, leg: day.leg, departure: day.departure, items, notes })
    })
  })
  return out
}

// How full a day is: activities (not meals or travel) plus travel hours. Used for "which day is busiest".
export function dayLoad(day) {
  const activities = day.items.filter((it) => it.placeId && it.slot !== 'lunch' && !(it.slot === 'evening' && /Dinner/.test(it.reasons.join(' ')))).length
  const travel = (day.leg?.minutes || 0) + (day.departure?.minutes || 0)
  return { activities, travelMinutes: travel, score: activities + travel / 120 }
}

// Take one activity off a day (the last non-meal one), for "make day N less busy".
export function lightenDay(dayPlans, number) {
  const day = dayPlans.find((d) => d.number === number)
  if (!day) return { days: dayPlans, summary: `There's no day ${number}.`, changed: false }
  const idx = [...day.items].map((it, i) => ({ it, i })).reverse().find(({ it }) => it.placeId && it.slot !== 'lunch' && it.slot !== 'travel')
  if (!idx) return { days: dayPlans, summary: `Day ${number} is already as light as it gets.`, changed: false }
  const removed = day.items[idx.i]
  const items = day.items.filter((_, i) => i !== idx.i)
  return {
    days: dayPlans.map((d) => (d.number === number ? { ...d, items } : d)),
    summary: `Took ${removed.label} off day ${number}. It stays in the city's list if you want it back.`,
    changed: true,
  }
}

export const OPENING_HOURS_NOTE = 'Opening hours and closing days aren’t in Eurowander’s data. Check them before you go, especially on Sundays and Mondays.'
