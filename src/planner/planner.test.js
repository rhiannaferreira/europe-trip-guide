// Tests for the trip builder's deterministic planning logic. Run with `npm test` (Node's built-in runner).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { distanceKm } from '../utils/distance.js'
import { normalizePreferences, addDaysIso } from './preferences.js'
import { legBetween, flightMinutes, routeLegs } from './transport.js'
import { allocateNights, bestOrder, generatePlan, orderCost, targetStopCount } from './route.js'
import { planTimeline, planTotals, stopDays, withStops } from './plan.js'
import { computeStats, feasibilityWarnings } from './feasibility.js'
import { alternativesFor, costlyStop } from './alternatives.js'
import { addStop, changeNights, makeRelaxed, moveStop, optimizeOrder, reduceTravel, regenerateFrom, removeStop, replaceStop, setNights } from './modify.js'
import { dayCapacity, lightenDay, planDays } from './dayPlanner.js'
import { planBudget } from './budget.js'
import { applyRainSuggestion, classifyForecast, rainSuggestions, weatherOutlook } from './weatherPlan.js'
import { europeNotes } from './europe.js'
import { planToTrip, tripToPlan } from './convert.js'
import { migrate } from '../lib/tripModel.js'
import { buildDays } from '../utils/tripCalculations.js'
import { tripLegs } from '../lib/trip.js'
import { validateAction } from './assistant/actions.js'
import { parseIntent } from './assistant/intents.js'
import { runAction } from './assistant/run.js'

const TODAY = '2026-09-30'
const gen = (input, opts = {}) => generatePlan(input, { today: TODAY, ...opts })
const ids = (plan) => plan.stops.map((s) => s.cityId)
const planOf = (stops, prefs = {}) => {
  const { prefs: p } = normalizePreferences({ days: 10, ...prefs }, { today: TODAY })
  return withStops({ version: 1, prefs: p, stops: [] }, stops.map(([cityId, nights, role = 'pick']) => ({ cityId, nights, role, why: [] })))
}

// ---------- Preferences and days ----------

test('dates set the number of days, counting both ends', () => {
  const { prefs } = normalizePreferences({ startDate: '2027-05-10', endDate: '2027-05-21' }, { today: TODAY })
  assert.equal(prefs.days, 12)
  assert.equal(prefs.nights, 11)
  assert.equal(prefs.month, 5)
})

test('an end date before the start date is ignored with an error note', () => {
  const { prefs, notes } = normalizePreferences({ startDate: '2027-05-10', endDate: '2027-05-01', days: 7 }, { today: TODAY })
  assert.equal(prefs.days, 7)
  assert.equal(prefs.endDate, '2027-05-16')
  assert.ok(notes.some((n) => n.level === 'error' && n.field === 'endDate'))
})

test('impossible dates are dropped, not trusted', () => {
  const { prefs, notes } = normalizePreferences({ startDate: '2027-02-30x', days: 5 }, { today: TODAY })
  assert.equal(prefs.startDate, '')
  assert.ok(notes.some((n) => n.field === 'startDate'))
})

test('trip length is clamped and defaults apply when nothing is given', () => {
  assert.equal(normalizePreferences({ days: 400 }, { today: TODAY }).prefs.days, 45)
  const { prefs } = normalizePreferences({}, { today: TODAY })
  assert.equal(prefs.days, 10)
  assert.equal(prefs.pace, 'moderate')
  assert.equal(prefs.budget, null)
})

test('unknown cities and countries are left out with a note', () => {
  const { prefs, notes } = normalizePreferences({ startCityId: 'atlantis', mustVisit: ['paris', 'paris', 'nowhere'], includeCountries: ['XX'] }, { today: TODAY })
  assert.equal(prefs.startCityId, '')
  assert.deepEqual(prefs.mustVisit, ['paris'])
  assert.deepEqual(prefs.includeCountries, [])
  assert.ok(notes.length >= 3)
})

test('addDaysIso crosses month and year ends', () => {
  assert.equal(addDaysIso('2026-12-30', 3), '2027-01-02')
  assert.equal(addDaysIso('2028-02-28', 1), '2028-02-29')
})

// ---------- Distance and travel times ----------

test('great-circle distance is about right', () => {
  const km = distanceKm(cityById.london, cityById.paris)
  assert.ok(km > 330 && km < 360, `London–Paris ${km}`)
})

test('sample train times are used in both directions', () => {
  assert.equal(legBetween('paris', 'london').minutes, 136)
  assert.equal(legBetween('london', 'paris').minutes, 136)
  assert.equal(legBetween('london', 'paris').source, 'sample')
})

test('pairs without a sample time get a labelled distance estimate', () => {
  const leg = legBetween('paris', 'rome')
  assert.equal(leg.source, 'estimate')
  assert.equal(leg.estimated, true)
  const km = distanceKm(cityById.paris, cityById.rome)
  assert.equal(leg.minutes, Math.round(((km * 1.25) / 100) * 60 + 20))
})

test('flights are only suggested when the traveller allows them', () => {
  assert.notEqual(legBetween('amsterdam', 'athens', { transport: 'train' }).mode, 'flight')
  const fly = legBetween('amsterdam', 'athens', { transport: 'mixed' })
  assert.equal(fly.mode, 'flight')
  assert.equal(fly.source, 'flight-estimate')
  assert.equal(fly.minutes, flightMinutes(fly.km))
  assert.ok(fly.groundMinutes > fly.minutes)
})

test('a round trip adds the journey home', () => {
  const legs = routeLegs(['lisbon', 'porto'], { returnTo: 'lisbon' })
  assert.equal(legs.length, 2)
  assert.equal(legs[1].isReturn, true)
})

test('unknown cities give no leg instead of crashing', () => {
  assert.equal(legBetween('paris', 'atlantis'), null)
})

// ---------- Route ordering ----------

test('route ordering avoids zig-zags', () => {
  const order = bestOrder(['paris', 'rome', 'amsterdam', 'barcelona'], { start: 'amsterdam' })
  assert.deepEqual(order, ['amsterdam', 'paris', 'barcelona', 'rome'])
})

test('fixed start and end stay in place', () => {
  const order = bestOrder(['munich', 'london', 'brussels', 'paris', 'amsterdam'], { start: 'london', end: 'munich' })
  assert.equal(order[0], 'london')
  assert.equal(order[order.length - 1], 'munich')
  const zigzag = ['london', 'amsterdam', 'paris', 'brussels', 'munich']
  assert.ok(orderCost(order) <= orderCost(zigzag))
})

test('long routes (more than 10 stops) still get a sensible order', () => {
  const many = ['lisbon', 'porto', 'madrid', 'seville', 'barcelona', 'paris', 'brussels', 'amsterdam', 'berlin', 'prague', 'vienna', 'munich', 'zurich']
  const order = bestOrder(many, { start: 'lisbon' })
  assert.equal(order.length, many.length)
  assert.equal(new Set(order).size, many.length)
  assert.ok(orderCost(order) < orderCost(many))
})

// ---------- Generating plans ----------

test('the example trip: London, 12 days, train-first, 4-hour limit', () => {
  const { plan } = gen({ startDate: '2027-05-10', endDate: '2027-05-21', startCityId: 'london', budget: 3000, currency: 'USD', interests: ['food', 'history', 'nightlife', 'nature'], transport: 'train', pace: 'moderate', maxLegMinutes: 240, mix: 'balanced' })
  assert.equal(plan.stops[0].cityId, 'london')
  assert.equal(planTotals(plan).days, 12)
  assert.ok(plan.stops.length >= 3 && plan.stops.length <= 6)
  assert.equal(new Set(ids(plan)).size, plan.stops.length, 'no duplicate cities')
  assert.ok(plan.stops.every((s) => s.nights >= 1))
  const stats = computeStats(plan)
  assert.equal(stats.overLimit.length, 0, 'no leg over 4 hours')
  assert.ok(stats.countries.length >= 2, 'multi-country')
})

test('pace changes the number of cities', () => {
  const relaxed = gen({ days: 15, startCityId: 'paris', pace: 'relaxed' }).plan
  const fast = gen({ days: 15, startCityId: 'paris', pace: 'fast' }).plan
  assert.ok(fast.stops.length > relaxed.stops.length)
  assert.equal(targetStopCount({ nights: 14, pace: 'moderate' }), 6)
})

test('a one-day trip is a single city with no nights', () => {
  const { plan } = gen({ days: 1, startCityId: 'rome' })
  assert.deepEqual(ids(plan), ['rome'])
  assert.equal(plan.stops[0].nights, 0)
  assert.equal(planTotals(plan).days, 1)
  assert.equal(planDays(plan).length, 1)
})

test('a two-day trip stays in one city', () => {
  const { plan } = gen({ days: 2, startCityId: 'vienna' })
  assert.equal(plan.stops.length, 1)
  assert.equal(plan.stops[0].nights, 1)
})

test('a long trip covers many cities without repeating', () => {
  const { plan } = gen({ days: 40, startCityId: 'lisbon', pace: 'moderate' })
  assert.equal(planTotals(plan).days, 40)
  assert.ok(plan.stops.length >= 8)
  assert.equal(new Set(ids(plan)).size, plan.stops.length)
})

test('must-visit cities, end city and avoided countries are respected', () => {
  const { plan } = gen({ days: 14, startCityId: 'amsterdam', endCityId: 'vienna', mustVisit: ['prague'], avoidCountries: ['BE'] })
  assert.equal(ids(plan)[0], 'amsterdam')
  assert.equal(ids(plan).at(-1), 'vienna')
  assert.ok(ids(plan).includes('prague'))
  assert.ok(!plan.stops.some((s) => cityById[s.cityId].country === 'BE'))
})

test('wanted countries are all visited when the length allows', () => {
  const { plan } = gen({ days: 14, includeCountries: ['IT', 'FR'] })
  const countries = new Set(ids(plan).map((id) => cityById[id].country))
  assert.ok(countries.has('IT') && countries.has('FR'))
  assert.ok([...countries].every((c) => c === 'IT' || c === 'FR'))
})

test('a round trip ends near where it started and counts the way home', () => {
  const { plan } = gen({ days: 10, startCityId: 'lisbon', endCityId: 'lisbon' })
  assert.equal(plan.prefs.roundTrip, true)
  assert.equal(ids(plan)[0], 'lisbon')
  assert.equal(new Set(ids(plan)).size, plan.stops.length)
  const days = planTimeline(plan)
  if (plan.stops.length > 1) assert.ok(days.at(-1).departure)
})

test('more must-visits than nights still gives a plan, with a warning', () => {
  const { plan, notes } = gen({ days: 3, startCityId: 'paris', mustVisit: ['rome', 'berlin', 'madrid'] })
  assert.equal(plan.stops.length, 4)
  assert.ok(notes.some((n) => n.field === 'mustVisit'))
  assert.equal(planTotals(plan).days, 3)
})

test('generation never throws on bad input', () => {
  assert.doesNotThrow(() => gen({ days: 'abc', startCityId: 42, interests: 'food', includeCountries: null, budget: '-5' }))
  assert.doesNotThrow(() => gen(undefined))
})

// ---------- Nights ----------

test('nights add up to the trip and every stop gets at least one', () => {
  const prefs = normalizePreferences({ days: 12 }, { today: TODAY }).prefs
  const nights = allocateNights(['london', 'paris', 'brussels', 'amsterdam'], 11, prefs)
  assert.equal(nights.reduce((a, b) => a + b, 0), 11)
  assert.ok(nights.every((n) => n >= 1))
})

test('fewer nights than stops leaves day visits', () => {
  const prefs = normalizePreferences({ days: 3 }, { today: TODAY }).prefs
  assert.deepEqual(allocateNights(['paris', 'reims', 'rouen', 'chartres'], 2, prefs), [1, 1, 0, 0])
})

test('days per stop match the rest of the app', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 2]], { startDate: '2027-05-10' })
  assert.deepEqual(stopDays(plan), [3, 3, 3])
  const timeline = planTimeline(plan)
  assert.equal(timeline.length, 9)
  assert.equal(timeline[3].leg.to.id, 'paris')
  assert.equal(timeline[8].date, '2027-05-18')
  // The same trip through the existing trip maths gives the same travel days.
  const trip = planToTrip(plan)
  const legacy = buildDays({ startDate: trip.startDate, endDate: trip.endDate, stops: trip.stops, legs: tripLegs(trip.stops.map((s) => s.cityId)) })
  assert.deepEqual(legacy.map((d) => d.cityId), timeline.map((d) => d.cityId))
  assert.deepEqual(legacy.map((d) => Boolean(d.leg)), timeline.map((d) => Boolean(d.leg)))
})

// ---------- Feasibility ----------

test('statistics are plain arithmetic', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['brussels', 2], ['amsterdam', 3]])
  const s = computeStats(plan)
  assert.equal(s.days, 12)
  assert.equal(s.cities, 4)
  assert.equal(s.transfers, 3)
  assert.equal(s.travelMinutes, 136 + 85 + 115)
  assert.equal(s.avgTransferMinutes, Math.round((136 + 85 + 115) / 3))
  assert.equal(s.daysPerCity, 3)
  assert.equal(s.pace.id, 'moderate')
  assert.ok(Math.abs(s.wakingShare - 336 / (12 * 16 * 60)) < 1e-9)
  assert.deepEqual(s.countries, ['GB', 'FR', 'BE', 'NL'])
})

test('a bad route triggers the expected warnings', () => {
  const plan = planOf([['paris', 1], ['rome', 1], ['amsterdam', 1], ['barcelona', 1], ['lisbon', 2]], { maxLegMinutes: 240 })
  const w = feasibilityWarnings(plan)
  const idsOf = w.map((x) => x.id)
  assert.ok(idsOf.includes('rushed'))
  assert.ok(idsOf.includes('travel-heavy'))
  assert.ok(idsOf.includes('backtracking'))
  assert.ok(idsOf.includes('travel-days'))
  assert.ok(w.some((x) => x.text.startsWith('Paris → Rome exceeds your preferred 4-hour travel limit')))
  assert.ok(w.find((x) => x.id === 'rushed').text === '5 cities in 7 days may feel rushed.')
})

test('a sensible route has no warnings about rushing or backtracking', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['brussels', 2], ['amsterdam', 3]], { maxLegMinutes: 240 })
  const idsOf = feasibilityWarnings(plan).map((x) => x.id)
  assert.ok(!idsOf.includes('rushed') && !idsOf.includes('backtracking') && !idsOf.includes('travel-heavy'))
})

test('single-city trips have no transfers', () => {
  const plan = planOf([['rome', 5]])
  const s = computeStats(plan)
  assert.equal(s.transfers, 0)
  assert.equal(s.travelMinutes, 0)
  assert.ok(feasibilityWarnings(plan).some((w) => w.id === 'single-city'))
})

// ---------- Alternatives and changes ----------

test('a detour city is flagged with closer alternatives', () => {
  const plan = planOf([['paris', 3], ['rome', 3], ['amsterdam', 3]])
  const c = costlyStop(plan)
  assert.equal(c.cityId, 'rome')
  assert.ok(c.alternatives.length > 0)
  assert.ok(c.alternatives.every((a) => a.deltaMinutes < 0))
  assert.ok(c.alternatives[0].reasons.length > 0)
})

test('alternatives never repeat a city already in the plan', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]])
  for (const a of alternativesFor(plan, 1, { limit: 10 })) assert.ok(!['london', 'paris', 'amsterdam'].includes(a.cityId))
})

test('changes keep the rest of the plan', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['brussels', 2], ['amsterdam', 3]])
  const r = replaceStop(plan, 2, 'ghent')
  assert.deepEqual(ids(r.plan), ['london', 'paris', 'ghent', 'amsterdam'])
  assert.deepEqual(r.plan.stops.map((s) => s.nights), [3, 3, 2, 3])
  assert.notEqual(r.plan, plan)
  assert.deepEqual(ids(plan), ['london', 'paris', 'brussels', 'amsterdam'], 'input untouched')
})

test('nights can change with or without keeping the length', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]])
  assert.equal(planTotals(changeNights(plan, 1, 1).plan).days, 11)
  const kept = changeNights(plan, 1, 1, { keepLength: true }).plan
  assert.equal(planTotals(kept).days, 10)
  assert.equal(kept.stops[1].nights, 4)
  assert.equal(setNights(plan, 0, 3).changed, false)
})

test('removing a stop gives its nights to the neighbours', () => {
  const plan = planOf([['london', 3], ['paris', 2], ['amsterdam', 3]])
  const r = removeStop(plan, 1)
  assert.deepEqual(ids(r.plan), ['london', 'amsterdam'])
  assert.equal(planTotals(r.plan).nights, 8)
  assert.equal(removeStop(planOf([['rome', 3]]), 0).changed, false)
})

test('adding a stop slots it in where it costs least and refuses duplicates', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]])
  const r = addStop(plan, 'brussels')
  assert.equal(ids(r.plan).indexOf('brussels'), 2)
  assert.equal(addStop(plan, 'paris').changed, false)
  assert.equal(addStop(plan, 'atlantis').changed, false)
})

test('reordering, optimizing and relaxing', () => {
  const plan = planOf([['paris', 2], ['amsterdam', 2], ['brussels', 2], ['london', 2]])
  assert.deepEqual(ids(moveStop(plan, 1, 1).plan), ['paris', 'brussels', 'amsterdam', 'london'])
  assert.equal(moveStop(plan, 0, -1).changed, false)
  const o = optimizeOrder(plan)
  assert.equal(o.changed, true)
  assert.equal(ids(o.plan)[0], 'paris')
  const relaxed = makeRelaxed(plan)
  assert.equal(relaxed.plan.stops.length, 3)
  assert.equal(planTotals(relaxed.plan).days, planTotals(plan).days)
})

test('reducing travel on a zig-zag route reorders first', () => {
  const plan = planOf([['paris', 2], ['rome', 2], ['amsterdam', 2], ['barcelona', 2]])
  const r = reduceTravel(plan)
  assert.equal(r.changed, true)
  assert.ok(orderCost(ids(r.plan)) < orderCost(ids(plan)))
})

test('regenerating from a stop keeps the stops before it', () => {
  const { plan } = gen({ days: 14, startCityId: 'london' })
  const r = regenerateFrom(plan, 2)
  assert.deepEqual(ids(r.plan).slice(0, 2), ids(plan).slice(0, 2))
  assert.equal(planTotals(r.plan).nights, planTotals(plan).nights)
  assert.equal(new Set(ids(r.plan)).size, r.plan.stops.length)
})

// ---------- Day plans ----------

test('travel days are lighter than full days', () => {
  const plan = planOf([['paris', 3], ['amsterdam', 3]], { pace: 'moderate' })
  const leg = legBetween('paris', 'amsterdam')
  assert.equal(dayCapacity({ number: 4, leg }, { pace: 'moderate', totalDays: 7 }), 1)
  assert.equal(dayCapacity({ number: 2 }, { pace: 'moderate', totalDays: 7 }), 3)
  const days = planDays(plan)
  const travel = days.find((d) => d.leg)
  const full = days.find((d) => d.kind === 'full')
  const count = (d) => d.items.filter((it) => it.placeId && it.slot !== 'lunch').length
  assert.ok(count(travel) <= 2)
  assert.ok(count(full) >= count(travel))
  assert.ok(travel.items[0].slot === 'travel')
})

test('day plans never repeat a place and stay in the right city', () => {
  const { plan } = gen({ days: 9, startCityId: 'rome', interests: ['history', 'food'] })
  const days = planDays(plan)
  const all = days.flatMap((d) => d.items.map((it) => it.placeId).filter(Boolean))
  assert.equal(new Set(all).size, all.length)
  for (const d of days) for (const it of d.items) if (it.placeId) assert.equal(placeById[it.placeId].cityId, d.cityId)
})

test('places on the same day are closer together than places overall', () => {
  const plan = planOf([['paris', 4]], { pace: 'fast' })
  const days = planDays(plan)
  const groups = days.map((d) => d.items.filter((it) => it.placeId).map((it) => placeById[it.placeId]))
  const mean = (pairs) => pairs.reduce((s, [a, b]) => s + distanceKm(a, b), 0) / pairs.length
  const pairsOf = (list) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b]))
  const within = mean(groups.flatMap(pairsOf))
  const overall = mean(pairsOf(groups.flat()))
  assert.ok(within < overall, `within-day ${within.toFixed(2)} km vs overall ${overall.toFixed(2)} km`)
})

test('a city with no places still gets a day plan', () => {
  const plan = planOf([['paris', 2]])
  const days = planDays(plan, { placesFor: () => [] })
  assert.equal(days.length, 3)
  assert.ok(days[0].notes.some((n) => /no places/.test(n)))
})

test('lightening a day removes one activity', () => {
  const plan = planOf([['paris', 3]], { pace: 'fast' })
  const days = planDays(plan)
  const before = days[1].items.length
  const r = lightenDay(days, 2)
  assert.equal(r.changed, true)
  assert.equal(r.days[1].items.length, before - 1)
  assert.equal(lightenDay(days, 99).changed, false)
})

// ---------- Budget ----------

test('budget allocation adds up and compares with the budget', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]], { budget: 3000, currency: 'USD', travellers: 2 })
  const b = planBudget(plan, planDays(plan))
  const sum = b.categories.reduce((s, c) => s + c.amount, 0)
  assert.equal(sum, b.total)
  assert.deepEqual(b.categories.map((c) => c.id), ['accommodation', 'transportation', 'food', 'activities', 'other'])
  assert.equal(b.categories.at(-1).amount, Math.round((b.total - b.categories.at(-1).amount) * 0.1))
  assert.equal(b.remaining, 3000 - b.total)
  assert.equal(b.status, 'over')
  assert.ok(b.suggestions.length > 0)
})

test('no budget means no verdict', () => {
  const plan = planOf([['brno', 3]])
  const b = planBudget(plan, [])
  assert.equal(b.status, 'none')
  assert.equal(b.remaining, null)
  assert.equal(b.suggestions.length, 0)
})

test('a generous budget fits', () => {
  const plan = planOf([['brno', 3], ['vienna', 2]], { budget: 20000, currency: 'EUR', travellers: 1 })
  assert.equal(planBudget(plan, planDays(plan)).status, 'fits')
})

// ---------- Weather ----------

test('rain swaps an outdoor plan with a museum on a dry day', () => {
  const plan = planOf([['paris', 4]], { pace: 'fast', interests: ['museums', 'nature'] })
  const days = planDays(plan)
  const outdoorDay = days.find((d) => d.items.some((it) => /buttes|tuileries|montmartre|luxembourg/i.test(it.placeId || '')))
  assert.ok(outdoorDay, 'test needs an outdoor place in the plan')
  const weather = Object.fromEntries(days.map((d) => [d.number, { kind: 'forecast', code: d === outdoorDay ? 63 : 1, rain: d === outdoorDay ? 80 : 10, max: 20, min: 12 }]))
  const s = rainSuggestions(days, weather)
  assert.ok(s.length > 0)
  assert.match(s[0].text, /^Rain expected/)
  const next = applyRainSuggestion(days, s[0])
  assert.ok(!next.find((d) => d.number === s[0].wetDay).items.some((it) => it.placeId === s[0].outPlaceId))
  assert.ok(next.find((d) => d.number === s[0].dryDay).items.some((it) => it.placeId === s[0].outPlaceId))
})

test('last year’s weather and seasons never move anything', () => {
  const plan = planOf([['paris', 3]], { startDate: '2027-05-10' })
  const days = planDays(plan)
  const weather = Object.fromEntries(days.map((d) => [d.number, { kind: 'last-year', code: 63, rain: 5, max: 18, min: 10 }]))
  assert.equal(rainSuggestions(days, weather).length, 0)
  assert.equal(classifyForecast(weather[1]), null)
  assert.equal(weatherOutlook(plan, days, weather).kind, 'last-year')
  assert.equal(weatherOutlook(plan, days, {}).kind, 'seasonal')
})

// ---------- Europe notes ----------

test('crossing into the UK mentions passport control; Schengen-only trips do not', () => {
  const uk = europeNotes(planOf([['paris', 3], ['london', 3]])).find((n) => n.id === 'borders')
  assert.match(uk.text, /passport control/)
  const schengen = europeNotes(planOf([['paris', 3], ['brussels', 3]])).find((n) => n.id === 'borders')
  assert.match(schengen.text, /Schengen area/)
  assert.doesNotMatch(schengen.text, /passport control/)
  const money = europeNotes(planOf([['vienna', 3], ['prague', 3], ['zurich', 2]])).find((n) => n.id === 'currency')
  assert.equal(money.title, '3 currencies')
})

// ---------- Saving as a normal trip ----------

test('a plan becomes a valid Eurowander trip without losing anything', () => {
  const { plan } = gen({ startDate: '2027-05-10', days: 9, startCityId: 'paris', interests: ['food'] })
  const days = planDays(plan)
  const trip = planToTrip(plan, days, { name: 'Test' })
  const again = migrate(trip)
  assert.deepEqual(again.stops.map((s) => s.cityId), ids(plan))
  assert.deepEqual(again.stops.map((s) => s.days), stopDays(plan))
  assert.equal(again.startDate, '2027-05-10')
  assert.equal(again.endDate, '2027-05-18')
  assert.equal(again.name, 'Test')
  const planned = days.flatMap((d) => d.items.map((it) => it.placeId).filter(Boolean))
  assert.equal(Object.values(again.itinerary).flatMap((d) => d.placeIds).length, new Set(planned).size)
  assert.ok(Object.values(again.statuses).every((s) => s === 'want'))
})

test('an existing trip opens in the builder with the same days', () => {
  const trip = migrate({ version: 3, stops: [{ cityId: 'rome', placeIds: [] }, { cityId: 'florence', placeIds: [] }], startDate: '2027-06-01', endDate: '2027-06-07' })
  const plan = tripToPlan(trip)
  assert.equal(planTotals(plan).days, 7)
  assert.deepEqual(ids(plan), ['rome', 'florence'])
})

// ---------- Assistant ----------

test('assistant actions are validated against the plan', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]])
  const ctx = { plan, dayCount: 10 }
  assert.equal(validateAction({ action: 'replace_city', targetCity: 'Amsterdam' }, ctx).action.index, 2)
  assert.equal(validateAction({ action: 'replace_city', targetCity: 'Rome' }, ctx).ok, false)
  assert.equal(validateAction({ action: 'drop_database' }, ctx).ok, false)
  assert.equal(validateAction('replace everything', ctx).ok, false)
  assert.equal(validateAction(null, ctx).ok, false)
  assert.equal(validateAction({ action: 'lighten_day', day: 42 }, ctx).ok, false)
  assert.equal(validateAction({ action: 'change_nights', targetCity: 'paris', delta: 100 }, ctx).action.delta, 1)
  assert.equal(validateAction({ action: 'more_interest', interest: 'skydiving' }, ctx).ok, false)
  assert.equal(validateAction({ action: 'add_city', city: 'Paris' }, ctx).ok, false)
  assert.equal(validateAction({ action: 'answer', question: 'busiest_day', targetCity: '', interest: 'none' }, ctx).ok, true)
  assert.equal(validateAction({ action: 'answer', question: 'reveal_prompt' }, ctx).ok, false)
})

test('the example requests map to the right actions', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]], { startDate: '2027-05-10' })
  const timeline = planTimeline(plan)
  const p = (text) => parseIntent(text, { plan, timeline })
  assert.equal(p('Make day 3 less busy.').action, 'lighten_day')
  assert.equal(p('Replace Amsterdam.').targetCity, 'amsterdam')
  assert.deepEqual([p('Add another day in Paris.').action, p('Add another day in Paris.').delta], ['change_nights', 1])
  assert.equal(p('Can we spend less?').action, 'make_cheaper')
  assert.equal(p('Reduce train time.').action, 'reduce_travel')
  assert.equal(p('Give me somewhere less touristy.').action, 'more_gems')
  assert.equal(p('What should we do if it rains Tuesday?').action, 'rain_plan')
  assert.equal(p('What should we do if it rains Tuesday?').day, 2)
  assert.equal(p('Move museums to the rainy day, day 5').action, 'move_category_to_day')
  assert.equal(p('Add more nightlife.').interest, 'nightlife')
  assert.equal(p('Which day is busiest?').question, 'busiest_day')
  assert.equal(p('Where are we spending the most money?').question, 'most_expensive')
  assert.equal(p('Tell me a joke').action, 'unknown')
})

test('assistant proposals are computed by the planner and leave the plan untouched', () => {
  const plan = planOf([['london', 3], ['paris', 3], ['amsterdam', 3]], { startDate: '2027-05-10', budget: 2000, currency: 'EUR' })
  const v = validateAction({ action: 'replace_city', targetCity: 'amsterdam', lessTouristy: true }, { plan, dayCount: 10 })
  const r = runAction(v.action, { plan })
  assert.equal(r.kind, 'proposal')
  assert.notEqual(ids(r.plan)[2], 'amsterdam')
  assert.equal(ids(plan)[2], 'amsterdam')
  const a = runAction(validateAction({ action: 'answer', question: 'most_expensive' }, { plan, dayCount: 10 }).action, { plan })
  assert.equal(a.kind, 'answer')
  assert.match(a.text, /estimate/)
})
