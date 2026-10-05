// The live data client's own rules: times on station clocks, listed opening hours, what a journey's
// status may say, picked trains in the saved trip and in Travel Mode, curated events and station names.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { agoText, clock, dayIn, delayMinutes, durationText, zonedIso } from './time.js'
import { openNow, parseOpeningHours } from './openingHours.js'
import { journeySnapshot, journeyState, stationName, statusWindow } from './trains.js'
import { searchEvents } from './events.js'
import { toAppPlace } from './places.js'
import { placeSource } from './models.js'
import { cleanJourney, journeyKey, migrate } from '../../lib/tripModel.js'
import { daySchedule, misdatedJourney, pickedJourney, travelDays } from '../../travel/travelModel.js'
import { setJourney } from '../../travel/travelActions.js'
import { travelContext } from '../../travel/travelContext.js'
import { stationQuery, hasRail } from '../../data/stations.js'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
})

// Eurostar London St Pancras 09:01 BST → Paris Nord 12:20 CEST.
const eurostar = (over = {}) => ({
  id: 'opaque-itinerary-id',
  provider: 'transitous',
  origin: { id: 'gb_STPX', name: 'London St Pancras International', lat: 51.531, lng: -0.126, tz: 'Europe/London' },
  destination: { id: 'fr_PNO', name: 'Paris Nord', lat: 48.881, lng: 2.355, tz: 'Europe/Paris' },
  departure: { scheduled: '2026-06-17T08:01:00Z', expected: null, track: null, scheduledTrack: '5' },
  arrival: { scheduled: '2026-06-17T10:20:00Z', expected: null },
  durationMin: 139,
  transfers: 0,
  changes: [],
  operators: ['Eurostar'],
  legs: [
    {
      mode: 'train',
      operator: 'Eurostar',
      service: 'Eurostar 9014',
      tripId: 'trip-9014',
      from: { id: 'gb_STPX', name: 'London St Pancras International', tz: 'Europe/London', scheduled: '2026-06-17T08:01:00Z', scheduledTrack: '5' },
      to: { id: 'fr_PNO', name: 'Paris Nord', tz: 'Europe/Paris', scheduled: '2026-06-17T10:20:00Z' },
      realtime: false,
      cancelled: false,
      alerts: [],
    },
  ],
  realtime: false,
  cancelled: false,
  bookingUrl: 'https://www.eurostar.com/',
  ...over,
})

const trip = (journeys = {}) =>
  migrate({
    version: 3,
    startDate: '2026-06-15',
    endDate: '2026-06-20',
    stops: [
      { cityId: 'london', auto: false, placeIds: [], days: 2 },
      { cityId: 'paris', auto: false, placeIds: ['paris-louvre'], days: 2 },
      { cityId: 'athens', auto: false, placeIds: [], days: 2 },
    ],
    itinerary: { 3: { placeIds: ['paris-louvre'], note: '' } },
    journeys,
  })

test('times are read on the station’s own clock, with the right offset', () => {
  assert.equal(zonedIso('2026-06-17', '09:00', 'Europe/London'), '2026-06-17T09:00:00+01:00')
  assert.equal(zonedIso('2026-12-17', '09:00', 'Europe/Paris'), '2026-12-17T09:00:00+01:00')
  assert.equal(zonedIso('2026-06-17', '09:00', 'Europe/Athens'), '2026-06-17T09:00:00+03:00')
  assert.equal(clock('2026-06-17T08:01:00Z', 'Europe/London'), '09:01')
  assert.equal(clock('2026-06-17T10:20:00Z', 'Europe/Paris'), '12:20')
  assert.equal(dayIn('2026-06-17T22:30:00Z', 'Europe/Athens'), '2026-06-18')
  assert.equal(delayMinutes({ scheduled: '2026-06-17T08:00:00Z', expected: '2026-06-17T08:15:00Z' }), 15)
  assert.equal(delayMinutes({ scheduled: '2026-06-17T08:00:00Z' }), null)
  assert.equal(durationText(139), '2h 19m')
  assert.equal(durationText(45), '45 min')
  const now = Date.parse('2026-06-17T10:00:00Z')
  assert.equal(agoText('2026-06-17T09:57:00Z', { now }), 'Updated 3 min ago')
  assert.equal(agoText('2026-06-17T09:59:50Z', { now }), 'Updated just now')
})

test('listed opening hours: open, closed, after midnight, and unknown formats', () => {
  assert.ok(parseOpeningHours('Mo-Su 09:00-18:00'))
  assert.equal(parseOpeningHours('by appointment'), null)
  // Wednesday 17 June 2026, 14:00 in Rome.
  const wed2pm = new Date('2026-06-17T12:00:00Z')
  assert.equal(openNow('Mo-Fr 12:00-15:00,19:00-23:00', 'Europe/Rome', wed2pm).text, 'Open until 15:00')
  const wed4pm = new Date('2026-06-17T14:00:00Z')
  assert.equal(openNow('Mo-Fr 12:00-15:00,19:00-23:00', 'Europe/Rome', wed4pm).text, 'Closed · opens 19:00')
  // 01:00 on Thursday, a bar open until 02:00 from Wednesday.
  const thu1am = new Date('2026-06-17T23:00:00Z')
  assert.equal(openNow('We 18:00-02:00', 'Europe/Rome', thu1am).state.open, true)
  assert.equal(openNow('sunrise-sunset', 'Europe/Rome', wed2pm).text, '')
})

test('a journey without real-time data is only ever scheduled, never on time', () => {
  assert.equal(journeyState(eurostar()).kind, 'scheduled')
  const onTime = eurostar({ realtime: true, departure: { scheduled: '2026-06-17T08:01:00Z', expected: '2026-06-17T08:01:00Z' } })
  assert.equal(journeyState(onTime).kind, 'realtime')
  const late = eurostar({ realtime: true, departure: { scheduled: '2026-06-17T08:01:00Z', expected: '2026-06-17T08:16:00Z' } })
  assert.deepEqual(journeyState(late), { kind: 'delayed', delay: 15, at: 'departure' })
  const arrOnly = eurostar({ realtime: true, arrival: { scheduled: '2026-06-17T10:20:00Z', expected: '2026-06-17T10:20:00Z' } })
  assert.equal(journeyState(arrOnly).kind, 'realtime')
  const partial = eurostar({ realtime: true })
  assert.equal(journeyState(partial).kind, 'partial')
  assert.equal(journeyState(eurostar({ cancelled: true })).kind, 'cancelled')
})

test('live status is only checked near the train', () => {
  const j = eurostar()
  assert.equal(statusWindow(j, Date.parse('2026-06-17T03:00:00Z')), 'before')
  assert.equal(statusWindow(j, Date.parse('2026-06-17T05:00:00Z')), 'live')
  assert.equal(statusWindow(j, Date.parse('2026-06-17T10:50:00Z')), 'live')
  assert.equal(statusWindow(j, Date.parse('2026-06-17T11:30:00Z')), 'after')
})

test('picked trains: saved compactly, checked on load, and only for real hops', () => {
  const snap = journeySnapshot(eurostar({ departure: { scheduled: '2026-06-17T08:01:00Z', expected: '2026-06-17T08:20:00Z', track: '7', scheduledTrack: '5' } }), { savedAt: '2026-06-01T10:00:00Z' })
  // Live fields aren't kept: the saved copy is the timetable.
  assert.equal(snap.departure.expected, undefined)
  assert.equal(snap.departure.track, undefined)
  assert.equal(snap.legs[0].service, 'Eurostar 9014')

  const t = trip({ [journeyKey('london', 'paris')]: snap, 'paris>london': snap, 'paris>athens': { nonsense: true } })
  assert.deepEqual(Object.keys(t.journeys), ['london>paris'])
  assert.equal(cleanJourney({ ...snap, bookingUrl: 'javascript:alert(1)' }).bookingUrl, undefined)
  assert.equal(cleanJourney({ ...snap, departure: { scheduled: 'tomorrow' } }), null)
  // Moving a city drops the hop's train on the next load.
  assert.deepEqual(migrate({ ...t, stops: [t.stops[1], t.stops[0], t.stops[2]] }).journeys, {})

  const unset = setJourney(t, 'london', 'paris', null)
  assert.deepEqual(unset.journeys, {})
})

test('Travel Mode uses the picked train’s timetable on its day, and not on another date', () => {
  const t = trip({ 'london>paris': journeySnapshot(eurostar()) })
  const days = travelDays(t)
  const travel = days.find((d) => d.leg && d.cityId === 'paris')
  assert.equal(travel.iso, '2026-06-17')
  assert.ok(pickedJourney(t, travel))
  const s = daySchedule(t, travel)
  assert.equal(s.depart, 9 * 60 + 1)
  assert.equal(s.arrive, 12 * 60 + 20)
  const ctx = travelContext({ trip: t, status: { status: 'active', days }, day: travel, nowMin: 420, weather: null, online: true })
  assert.equal(ctx.travelDay.train.departs, '09:01')
  assert.match(ctx.travelDay.liveStatus, /Never say the train is on time/)

  const moved = { ...t, startDate: '2026-06-16', endDate: '2026-06-21' }
  const movedDay = travelDays(moved).find((d) => d.leg && d.cityId === 'paris')
  assert.equal(pickedJourney(moved, movedDay), null)
  assert.ok(misdatedJourney(moved, movedDay))
  assert.equal(daySchedule(moved, movedDay).train, null)
})

test('station names: shouting timetables read normally; cities pick a terminal by direction', () => {
  assert.equal(stationName('ROMA TERMINI'), 'Roma Termini')
  assert.equal(stationName('FIRENZE S. M. NOVELLA'), 'Firenze S. M. Novella')
  assert.equal(stationName('Paris Nord'), 'Paris Nord')
  assert.equal(stationQuery('paris', 'amsterdam'), 'Paris Gare du Nord')
  assert.equal(stationQuery('paris', 'lyon'), 'Paris Gare de Lyon')
  assert.equal(stationQuery('paris', 'strasbourg'), 'Paris Est')
  assert.equal(stationQuery('london', 'paris'), 'London St Pancras International')
  assert.equal(stationQuery('london', 'edinburgh'), 'London Kings Cross')
  assert.equal(stationQuery('rome'), 'Roma Termini')
  assert.equal(hasRail('dubrovnik'), false)
})

test('live places become app places with only the fields the provider sent', () => {
  const p = toAppPlace({ id: 'osm-n1', provider: 'geoapify', providerId: 'abc', name: 'Trattoria', lat: 41.9, lng: 12.49, category: 'food', type: 'restaurant', cuisine: 'italian;pizza', retrievedAt: '2026-06-17T10:00:00Z' })
  assert.equal(p.cityId, 'rome')
  assert.equal(p.description, 'Restaurant · Italian, Pizza')
  assert.equal(p.source, 'live')
  for (const k of ['rating', 'price', 'photo', 'openingHours', 'website']) assert.equal(k in p, false)
  assert.equal(placeSource(p), 'live')
  assert.equal(toAppPlace({ id: 'osm-n2', name: 'Nowhere', lat: 60, lng: 30 }), null)
})

test('events come from the curated list with approximate dates', async () => {
  const r = await searchEvents({ startDate: '2026-01-01', endDate: '2026-12-31' })
  assert.equal(r.source, 'curated')
  assert.ok(r.events.length > 0)
  assert.ok(r.events.every((e) => e.dateConfidence === 'approximate' && e.start <= e.end))
})

test('copilot: train requests and follow-ups read as find_trains, checked against the trip and the rail map', async () => {
  const { parseAppIntent } = await import('../../assistant/appIntents.js')
  const { validateAppAction } = await import('../../assistant/appActions.js')
  const { trainsAnswer, trainFact, livePlaceKind } = await import('../../assistant/liveData.js')
  const today = '2026-10-05'
  const a = parseAppIntent('What trains go from Paris to Amsterdam tomorrow morning?', { today })
  assert.equal(a.action, 'find_trains')
  assert.deepEqual([a.startDate, a.time], ['2026-10-06', '08:00'])
  const checked = validateAppAction(a, { today, memory: {} })
  assert.equal(checked.ok, true)
  assert.deepEqual([checked.action.from, checked.action.to, checked.action.date], ['paris', 'amsterdam', '2026-10-06'])
  assert.equal(validateAppAction({ ...a, cities: ['Split', 'Dubrovnik'] }, { today, memory: {} }).ok, false)
  assert.equal(validateAppAction({ ...a, startDate: '2026-10-01' }, { today, memory: {} }).ok, false)

  const ans = trainsAnswer(checked.action, { journeys: [eurostar()], from: eurostar().origin, to: eurostar().destination, retrievedAt: '2026-10-05T10:00:00Z' })
  assert.equal(ans.blocks[0].type, 'trains')
  assert.equal(ans.memory.lastTrains.lastDeparture, '09:02')
  const later = parseAppIntent('Can I leave later?', { today, memory: ans.memory })
  assert.deepEqual([later.action, later.time], ['find_trains', '09:02'])
  const direct = parseAppIntent('Any direct ones?', { today, memory: ans.memory })
  assert.equal(direct.transfers, 0)

  // No live answer: an estimate, labelled, and never invented trains.
  const down = trainsAnswer(checked.action, { error: { code: 'unavailable' } })
  assert.match(down.text, /temporarily unavailable.*estimate/i)
  assert.equal(down.blocks, undefined)
  assert.deepEqual(down.sources, ['estimate'])

  assert.equal(trainFact(eurostar()).status, 'SCHEDULED: timetable only, no live information')
  assert.equal(trainFact(eurostar({ departure: { scheduled: '2026-06-17T08:01:00Z', expected: '2026-06-17T08:11:00Z' } })).status, 'REAL-TIME: 10 min late')

  assert.equal(livePlaceKind({ action: 'places_near', category: 'food' }, 'find dinner nearby'), 'restaurant')
  assert.equal(livePlaceKind({ action: 'suggest_places', category: 'museums' }, 'museums in Rome'), null)
  assert.equal(livePlaceKind({ action: 'open_question' }, 'where can we get coffee'), 'cafe')
})
