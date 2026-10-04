// Travel Mode's rules: trip status in the destination's time zone, today's schedule, next up, free time,
// travel days, nearby places, the changes it makes to the trip, and that the rest of the app keeps them.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { migrate } from '../lib/tripModel.js'
import { applyDaysToTrip, itineraryDays, openTripHandle } from '../assistant/tripHandle.js'
import { tripToPlan } from '../planner/convert.js'
import {
  clockIn,
  daySchedule,
  daySummary,
  dayProgress,
  directionsUrl,
  freeTime,
  nextUp,
  placesNear,
  referencePoint,
  savedNearby,
  toMinutes,
  tripStatus,
} from './travelModel.js'
import { addToDay, markDone, markSkipped, moveToDay, setDeparture, setStartTime, shiftInDay } from './travelActions.js'
import { travelContext } from './travelContext.js'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
})

// London (2 days) → Paris (2) → Athens (2): three time zones (BST, CEST, EEST).
const sample = (itinerary = {}) =>
  migrate({
    version: 3,
    name: 'Summer',
    startDate: '2026-06-15',
    endDate: '2026-06-20',
    stops: [
      { cityId: 'london', auto: false, placeIds: ['london-british-museum', 'london-tower'], days: 2 },
      { cityId: 'paris', auto: false, placeIds: ['paris-louvre', 'paris-tuileries', 'paris-orsay', 'paris-marche-enfants-rouges', 'paris-concorde'], days: 2 },
      { cityId: 'athens', auto: false, placeIds: ['athens-acropolis'], days: 2 },
    ],
    statuses: {},
    itinerary,
  })
const at = (iso) => new Date(iso)

test('timezones: clocks read in the destination, not the device', () => {
  const now = at('2026-06-14T23:30:00Z')
  assert.deepEqual(clockIn('Europe/London', now), { date: '2026-06-15', minutes: 30 })
  assert.deepEqual(clockIn('Europe/Paris', now), { date: '2026-06-15', minutes: 90 })
  assert.deepEqual(clockIn('Europe/Athens', now), { date: '2026-06-15', minutes: 150 })
})

test('trip status: future trip, starts today, middle, final day, completed', () => {
  const t = sample()
  const before = tripStatus(t, at('2026-06-10T12:00:00Z'))
  assert.equal(before.status, 'upcoming')
  assert.equal(before.daysUntil, 5)
  // 23:30 UTC on the 14th is already 00:30 on the 15th in London: the trip has started.
  const start = tripStatus(t, at('2026-06-14T23:30:00Z'))
  assert.equal(start.status, 'active')
  assert.equal(start.today.number, 1)
  const middle = tripStatus(t, at('2026-06-17T10:00:00Z'))
  assert.equal(middle.today.number, 3)
  assert.equal(middle.today.cityId, 'paris')
  assert.ok(middle.today.leg, 'day 3 is the travel day into Paris')
  // 20:30 UTC is 23:30 in Athens on the last day: still travelling. An hour later it's over.
  assert.equal(tripStatus(t, at('2026-06-20T20:30:00Z')).today.number, 6)
  assert.equal(tripStatus(t, at('2026-06-20T21:30:00Z')).status, 'completed')
  assert.equal(tripStatus(migrate({ stops: [{ cityId: 'rome', placeIds: [] }] })).status, 'nodates')
  assert.equal(tripStatus(migrate(null)).status, 'empty')
})

test('schedule: suggested times from the order, a lunch break, and set times win', () => {
  const t = sample({ 4: { placeIds: ['paris-louvre', 'paris-tuileries', 'paris-orsay', 'paris-concorde'], note: '' } })
  const day = tripStatus(t, at('2026-06-18T07:00:00Z')).today
  assert.equal(day.number, 4)
  const s = daySchedule(t, day)
  const [louvre, tuileries, orsay] = s.entries
  assert.equal(louvre.start, toMinutes('09:30'))
  assert.equal(louvre.timeSource, 'suggested')
  assert.ok(tuileries.start > louvre.end, 'the next place starts after the visit and the walk')
  assert.equal(s.lunch.length, 1, 'a lunch break is left in the middle of the day')
  assert.ok(orsay.start >= s.lunch[0].end)

  const timed = setStartTime(t, 4, 'paris-orsay', '08:45')
  const s2 = daySchedule(timed, day)
  assert.equal(s2.entries[0].id, 'paris-orsay', 'a place timed earlier moves to the top')
  assert.equal(s2.entries[0].timeSource, 'set')
})

test('states, next up and free time follow the destination clock', () => {
  const t = sample({ 4: { placeIds: ['paris-louvre', 'paris-orsay'], note: '', times: { 'paris-louvre': '09:30', 'paris-orsay': '16:00' } } })
  const day = tripStatus(t, at('2026-06-18T08:00:00Z')).today
  const now = toMinutes('10:00')
  const s = daySchedule(t, day, { nowMin: now })
  assert.equal(s.entries[0].state, 'current')
  const n = nextUp(s, now)
  assert.equal(n.entry.id, 'paris-louvre')
  assert.equal(n.inProgress, true)

  const later = toMinutes('12:00')
  const s2 = daySchedule(markDone(t, 4, 'paris-louvre'), day, { nowMin: later })
  const n2 = nextUp(s2, later)
  assert.equal(n2.entry.id, 'paris-orsay')
  assert.equal(n2.startsIn, 240)
  assert.ok(n2.open, 'four hours until the next plan: the afternoon is open')
  const gaps = freeTime(s2, later)
  assert.equal(gaps[0].from, later)
  assert.equal(gaps[0].to, toMinutes('16:00'))
})

test('no itinerary today, single activity, busy day', () => {
  const t = sample({ 4: { placeIds: ['paris-louvre'], note: '' }, 5: { placeIds: [], note: 'Free day' } })
  const days = tripStatus(t, at('2026-06-18T08:00:00Z')).days
  const empty = daySchedule(t, days[1], { nowMin: 600 })
  assert.equal(empty.entries.length, 0)
  assert.ok(nextUp(empty, 600).open, 'an empty day is open')
  const one = daySchedule(t, days[3], { nowMin: 480 })
  assert.equal(nextUp(one, 480).entry.id, 'paris-louvre')
  const busy = sample({ 4: { placeIds: ['paris-louvre', 'paris-tuileries', 'paris-orsay', 'paris-marche-enfants-rouges', 'paris-concorde'], note: '' } })
  const bs = daySchedule(busy, days[3])
  assert.equal(bs.entries.length, 5)
  assert.ok(bs.entries.every((e, i) => i === 0 || e.start > bs.entries[i - 1].start), 'times only go forward')
})

test('travel day: places before the train, the journey, places after arriving', () => {
  const t = sample({ 3: { placeIds: ['london-tower', 'paris-louvre'], note: '' } })
  const day = tripStatus(t, at('2026-06-17T05:00:00Z')).today
  assert.equal(day.number, 3)
  const unknown = daySchedule(t, day)
  assert.equal(unknown.entries[1].kind, 'journey')
  assert.equal(unknown.entries[1].start, null, 'no departure time is made up')
  assert.equal(unknown.entries[2].start, null)
  const withTrain = setDeparture(t, 3, '11:00')
  const s = daySchedule(withTrain, day)
  assert.deepEqual(s.entries.map((e) => e.part ?? e.kind), ['before', 'journey', 'after'])
  assert.equal(s.depart, 660)
  assert.equal(s.arrive, 660 + day.leg.minutes)
  assert.ok(s.entries[2].start >= s.arrive + 45)
  assert.equal(setDeparture(withTrain, 3, null).itinerary[3].depart, undefined)
})

test('done, skipped, moved and added change the real trip and survive a reload', () => {
  let t = sample({ 4: { placeIds: ['paris-louvre', 'paris-orsay', 'paris-tuileries'], note: 'Museum day' } })
  t = markDone(t, 4, 'paris-louvre')
  assert.equal(t.statuses['paris-louvre'], 'visited')
  t = markSkipped(t, 4, 'paris-tuileries')
  t = setStartTime(t, 4, 'paris-orsay', '14:00')
  const reloaded = migrate(JSON.parse(JSON.stringify(t)))
  assert.deepEqual(reloaded.itinerary[4], { placeIds: ['paris-louvre', 'paris-orsay', 'paris-tuileries'], note: 'Museum day', times: { 'paris-orsay': '14:00' }, done: ['paris-louvre'], skipped: ['paris-tuileries'] })
  assert.deepEqual(dayProgress(daySchedule(reloaded, { number: 4, cityId: 'paris', leg: null })), { total: 3, done: 1, skipped: 1 })

  const moved = moveToDay(reloaded, 4, 'paris-orsay', 3)
  assert.deepEqual(moved.itinerary[4].placeIds, ['paris-louvre', 'paris-tuileries'])
  assert.equal(moved.itinerary[4].times, undefined, 'the time leaves with the place')
  assert.ok(moved.itinerary[3].placeIds.includes('paris-orsay'))
  // Planning mode reads the same object: day 3 now lists it.
  const plan = tripToPlan(moved)
  assert.ok(itineraryDays(moved, plan).find((d) => d.number === 3).items.some((i) => i.placeId === 'paris-orsay'))

  const undone = markDone(moved, 4, 'paris-louvre', false)
  assert.equal(undone.statuses['paris-louvre'], 'want')
  const added = addToDay(undone, 4, 'paris-notre-dame', '17:30')
  assert.equal(added.statuses['paris-notre-dame'], 'saved')
  assert.equal(added.itinerary[4].times['paris-notre-dame'], '17:30')
  assert.deepEqual(shiftInDay(added, 4, 'paris-notre-dame', -1).itinerary[4].placeIds.slice(-2), ['paris-notre-dame', 'paris-tuileries'])
})

test('copilot changes keep what was done, skipped and timed', () => {
  let t = sample({ 4: { placeIds: ['paris-louvre', 'paris-orsay', 'paris-tuileries'], note: '', times: { 'paris-orsay': '14:00' } } })
  t = markDone(t, 4, 'paris-louvre')
  const handle = openTripHandle({ route: { name: 'travel' }, trip: t, budget: { budget: '', currency: 'EUR', travellers: 1 } })
  const day = handle.days.find((d) => d.number === 4)
  assert.deepEqual(day.items.map((i) => i.placeId), ['paris-orsay', 'paris-tuileries'], 'done places are not offered to the planner')
  // "Make today lighter": the planner drops the last open item.
  const days = handle.days.map((d) => (d.number === 4 ? { ...d, items: d.items.slice(0, 1) } : d))
  const out = applyDaysToTrip(t, days)
  assert.deepEqual(out.itinerary[4].placeIds, ['paris-louvre', 'paris-orsay'])
  assert.deepEqual(out.itinerary[4].done, ['paris-louvre'])
  assert.deepEqual(out.itinerary[4].times, { 'paris-orsay': '14:00' })
})

test('nearby: closest first, kinds, reference point fallbacks, saved places nearby', () => {
  const t = sample({ 4: { placeIds: ['paris-louvre'], note: '' } })
  const day = { number: 4, cityId: 'paris', leg: null }
  const s = daySchedule(t, day, { nowMin: 480 })
  const ref = referencePoint({ position: null, schedule: s, cityId: 'paris' })
  assert.equal(ref.kind, 'activity')
  assert.equal(ref.label, 'Louvre Museum')
  assert.equal(referencePoint({ position: { lat: 48.86, lng: 2.35 }, schedule: s, cityId: 'paris' }).kind, 'you')
  assert.equal(referencePoint({ schedule: { entries: [] }, cityId: 'paris' }).kind, 'city')
  const near = placesNear(ref, { radiusKm: 1.5 })
  assert.ok(near.length > 0)
  assert.ok(near.every((x, i) => i === 0 || x.km >= near[i - 1].km - 0.06))
  assert.ok(placesNear(ref, { finder: 'food', radiusKm: 3 }).every((x) => x.place.category === 'food'))
  assert.deepEqual(placesNear({ lat: 0, lng: 0 }, {}), [], 'nowhere near anything: an empty list')
  // The Musée d'Orsay is saved but on no day, just across the river from the Louvre.
  const hint = savedNearby(t, s, 'paris')
  assert.equal(hint.place.id, 'paris-orsay')
  assert.equal(hint.anchor.id, 'paris-louvre')
  assert.ok(hint.walk < 15)
})

test('directions open the maps app with coordinates; daily summary', () => {
  const place = { name: 'Louvre', lat: 48.86, lng: 2.33 }
  assert.match(directionsUrl(place, { apple: false }), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=48\.86,2\.33&travelmode=walking$/)
  assert.match(directionsUrl(place, { apple: true }), /^https:\/\/maps\.apple\.com\/\?daddr=48\.86,2\.33/)
  let t = sample({ 4: { placeIds: ['paris-louvre', 'paris-tuileries', 'paris-orsay'], note: '' } })
  const day = { number: 4, cityId: 'paris', leg: null }
  assert.equal(daySummary(daySchedule(t, day, { nowMin: 900 }), 900), null)
  t = markDone(markDone(markSkipped(t, 4, 'paris-orsay'), 4, 'paris-louvre'), 4, 'paris-tuileries')
  const sum = daySummary(daySchedule(t, day, { nowMin: 900 }), 900)
  assert.equal(sum.visited, 2)
  assert.equal(sum.skipped, 1)
  assert.ok(sum.km > 0 && sum.km < 2)
})

test('what the copilot is told in Travel Mode', () => {
  const t = sample({ 4: { placeIds: ['paris-louvre', 'paris-orsay'], note: '', times: { 'paris-orsay': '15:00' } } })
  const status = tripStatus(t, at('2026-06-18T08:00:00Z'))
  const ctx = travelContext({ trip: t, status, day: status.today, nowMin: 600, weather: null, online: true, position: null })
  assert.equal(ctx.city, 'Paris')
  assert.equal(ctx.localTime, '10:00')
  assert.equal(ctx.today.length, 2)
  assert.equal(ctx.today[1].time, '15:00')
  assert.equal(ctx.today[1].timeIs, 'set by traveller')
  assert.equal(ctx.next.place, 'Louvre Museum')
  assert.match(ctx.weather, /no weather/i)
  assert.equal(JSON.stringify(ctx).includes('48.8'), false, 'no coordinates are sent')
})

test('quick actions read as the right copilot actions for today, without the AI', async () => {
  const { parseAppIntent } = await import('../assistant/appIntents.js')
  const { check, respond } = await import('../assistant/copilot.js')
  const t = sample({ 4: { placeIds: ['paris-louvre', 'paris-orsay', 'paris-tuileries'], note: '' } })
  const handle = openTripHandle({ route: { name: 'travel' }, trip: t, budget: { budget: '', currency: 'EUR', travellers: 1 } })
  const status = tripStatus(t, at('2026-06-18T08:00:00Z'))
  const travel = travelContext({ trip: t, status, day: status.today, nowMin: 600, weather: null })
  const ctx = { handle, today: '2026-06-18', memory: {}, travel }
  assert.deepEqual([parseAppIntent('I’m tired. Make the rest of today easier.', ctx)].map((a) => [a.action, a.day]), [['lighten_day', 4]])
  assert.deepEqual([parseAppIntent('It’s raining. What should I move?', ctx)].map((a) => [a.action, a.day]), [['rain_plan', 4]])
  const lunch = parseAppIntent('Find lunch nearby', ctx)
  assert.equal(lunch.action, 'places_near')
  assert.equal(lunch.category, 'food')
  assert.equal(parseAppIntent('What’s nearby?', ctx).action, 'places_near')
  assert.equal(parseAppIntent('What should we do next?', ctx).action, 'open_question')
  assert.equal(parseAppIntent('We finished early, what now?', ctx).action, 'open_question')
  // Without the AI, an open question in Travel Mode answers with what's left of today.
  const r = respond(check({ ...parseAppIntent('Make my trip cheaper', ctx), action: 'open_question', city: '', cities: [], country: '' }, ctx), { ...ctx, weatherByDay: {} })
  assert.match(r.text, /Next up: Louvre Museum/)
  // "I'm tired" proposes a lighter today, applied only on Apply.
  const tired = respond(check(parseAppIntent('I’m tired. Make the rest of today easier.', ctx), ctx), { ...ctx, weatherByDay: {} })
  assert.ok(tired.blocks?.some((b) => b.type === 'options'), tired.text)
})
