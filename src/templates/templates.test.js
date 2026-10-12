// Tests for ready-made trips: the data, turning a template into a plan and a trip, the page's facts, and
// the copilot changes the template page offers.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { CITY_DAYS, TEMPLATE_DETAILS } from '../data/templateDays.js'
import { TEMPLATE_CATEGORIES, featuredTemplates, templateById, templateBySlug, templateDayCount, tripTemplates } from '../data/tripTemplates.js'
import { KEYS, readJSON } from '../lib/storage.js'
import { migrate } from '../lib/tripModel.js'
import { cleanProps } from '../lib/analytics.js'
import { computeStats } from '../planner/feasibility.js'
import { fitToDays } from '../planner/modify.js'
import { planTotals } from '../planner/plan.js'
import { saveGeneratedTrip } from '../builder/saveTrip.js'
import { loadPlanIntoBuilder } from '../builder/usePlanner.js'
import { parseAppIntent } from '../assistant/appIntents.js'
import { check, respond } from '../assistant/copilot.js'
import { openTripHandle } from '../assistant/tripHandle.js'
import { filterTemplates } from './templateFacts.js'
import { quieterSwaps, templateDays, templatePlan, templateTrip, whyItWorks, withStartDate } from './templatePlan.js'
import { templateMeta } from './templateMeta.js'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
})

const italy = templateById['classic-italy-10']

test('templates use only cities and places Eurowander has', () => {
  assert.ok(tripTemplates.length >= 12 && tripTemplates.length <= 16)
  for (const t of tripTemplates) {
    for (const s of t.stops) assert.ok(cityById[s.cityId], `${t.id}: unknown city ${s.cityId}`)
    assert.ok(cityById[t.heroCityId], `${t.id}: hero city`)
    for (const c of t.categories) assert.ok(TEMPLATE_CATEGORIES.some((x) => x.id === c), `${t.id}: category ${c}`)
    for (const v of t.variants) assert.ok(templateById[v], `${t.id}: variant ${v}`)
    assert.ok(TEMPLATE_DETAILS[t.id], `${t.id}: details`)
    // Every night has a day outline in its city.
    for (const s of t.stops) assert.ok((CITY_DAYS[s.cityId] || []).length >= s.nights, `${t.id}: ${s.cityId} needs ${s.nights} outline days`)
  }
  for (const [cityId, days] of Object.entries(CITY_DAYS)) {
    assert.ok(cityById[cityId], `outline for unknown city ${cityId}`)
    for (const d of days) for (const id of d.places) assert.equal(placeById[id]?.cityId, cityId, `${cityId}: place ${id}`)
  }
  assert.equal(new Set(tripTemplates.map((t) => t.slug)).size, tripTemplates.length)
  assert.ok(featuredTemplates.length >= 6 && featuredTemplates.length <= 8)
})

test('every template is a sensible plan: overland, no leg over its limit, in a good order', () => {
  for (const t of tripTemplates) {
    const plan = templatePlan(t)
    const stats = computeStats(plan)
    assert.equal(stats.days, templateDayCount(t), t.id)
    assert.ok(stats.legs.every((l) => l.mode !== 'flight'), `${t.id} has a flight`)
    assert.deepEqual(stats.overLimit, [], `${t.id} has a leg over its limit`)
    assert.ok(stats.backtracking.extraMinutes < 30, `${t.id} backtracks ${stats.backtracking.extraMinutes}m`)
    assert.ok(whyItWorks(plan, stats).length >= 2, `${t.id}: why it works`)
  }
})

test('day plans: one per day, curated ideas, departure day last', () => {
  const plan = templatePlan(italy)
  const days = templateDays(plan)
  assert.equal(days.length, 10)
  assert.equal(days[0].title, 'Historic centre walk')
  assert.ok(days[0].ideas.includes('Pantheon'))
  assert.deepEqual(days[1].items.map((i) => i.placeId), ['rome-forum', 'rome-monti'])
  assert.equal(days[3].items[0].slot, 'travel') // Florence's first day starts with the train
  assert.equal(days[9].title, 'Departure or a free day')
  // A city without an outline (a swap) falls back to the planner's own picks.
  const swapped = quieterSwaps(plan).find((s) => s.cityId === 'venice').options.find((o) => o.cityId === 'treviso').plan
  assert.ok(templateDays(swapped).some((d) => d.cityId === 'treviso' && d.title))
})

test('copying a template makes an independent, normal trip', () => {
  const plan = withStartDate(templatePlan(italy), '2027-05-03')
  const days = templateDays(plan)
  const trip = templateTrip(italy, plan, days, { name: 'Our Italy' })
  const clean = migrate(JSON.parse(JSON.stringify(trip)))
  assert.equal(clean.name, 'Our Italy')
  assert.deepEqual(clean.stops.map((s) => [s.cityId, s.days]), [['rome', 3], ['florence', 3], ['venice', 4]])
  assert.equal(clean.startDate, '2027-05-03')
  assert.equal(clean.endDate, '2027-05-12')
  assert.match(clean.itinerary[1].note, /Pantheon/)
  assert.deepEqual(clean.itinerary[2].placeIds, ['rome-forum', 'rome-monti'])
  assert.match(clean.notes.trip, /10 Days in Italy/)
  saveGeneratedTrip(trip)
  // Changing the template afterwards doesn't touch the saved trip.
  const before = JSON.stringify(readJSON(KEYS.trip))
  italy.stops[0].nights = 9
  templatePlan(italy)
  italy.stops[0].nights = 3
  assert.equal(JSON.stringify(readJSON(KEYS.trip)), before)
})

test('opening a template in the trip builder keeps the old plan for Undo', () => {
  const old = templatePlan(templateById['spain-highlights-8'])
  loadPlanIntoBuilder(old, null)
  const plan = templatePlan(italy)
  loadPlanIntoBuilder(plan, templateDays(plan), { message: 'Started from Italy' })
  const saved = readJSON(KEYS.builder)
  assert.deepEqual(saved.plan.stops.map((s) => s.cityId), ['rome', 'florence', 'venice'])
  assert.deepEqual(saved.history.at(-1).stops.map((s) => s.cityId), ['barcelona', 'madrid', 'seville'])
  assert.equal(saved.daysPlanned, true)
  assert.equal(saved.dayEdits.days.length, 10)
  assert.equal(saved.message, 'Started from Italy')
})

test('a trip at a new length keeps its route', () => {
  const plan = templatePlan(italy)
  const seven = fitToDays(plan, 7)
  assert.deepEqual(seven.plan.stops.map((s) => [s.cityId, s.nights]), [['rome', 2], ['florence', 2], ['venice', 2]])
  assert.equal(planTotals(seven.plan).days, 7)
  const five = fitToDays(plan, 5)
  assert.equal(five.plan.stops.length, 2)
  assert.equal(five.plan.stops[0].cityId, 'rome')
  const all = fitToDays(plan, 5, { keepAll: true })
  assert.equal(all.plan.stops.length, 3)
  assert.equal(planTotals(all.plan).days, 5)
  assert.equal(fitToDays(plan, 10).changed, false)
  const longer = fitToDays(plan, 14)
  assert.equal(planTotals(longer.plan).days, 14)
})

test('the copilot works on the template page’s copy: length, cheaper, quieter, another country', () => {
  const plan = templatePlan(italy)
  let applied = null
  const handle = openTripHandle({ route: { name: 'tripIdea' }, builder: { plan, days: templateDays(plan), apply: (p) => (applied = p) }, trip: { stops: [] } })
  assert.equal(handle.kind, 'built')
  const ask = (text) => {
    const ctx = { handle, memory: {}, today: '2026-10-12' }
    return respond(check(parseAppIntent(text, ctx), ctx), ctx)
  }
  const options = (r) => r.blocks.flatMap((b) => b.options || [])
  const seven = ask('Make this 7 days')
  assert.deepEqual(options(seven)[0].plan.stops.map((s) => s.nights), [2, 2, 2])
  assert.ok(options(ask('Make this trip cheaper')).length >= 1)
  assert.ok(options(ask('Replace Venice with somewhere less touristy')).every((o) => !o.plan.stops.some((s) => s.cityId === 'venice')))
  const swiss = options(ask('Keep Rome and Florence but add Switzerland'))
  assert.ok(swiss.length && swiss.every((o) => o.plan.stops.some((s) => cityById[s.cityId].country === 'CH') && o.plan.stops.some((s) => s.cityId === 'rome')))
  handle.apply(swiss[0].plan)
  assert.equal(applied, swiss[0].plan)
  // The template itself never changed.
  assert.deepEqual(italy.stops.map((s) => s.cityId), ['rome', 'florence', 'venice'])
})

test('filters, routes, page titles and analytics props', () => {
  assert.equal(filterTemplates(tripTemplates, { duration: '3-5' }).every((t) => templateDayCount(t) <= 5), true)
  assert.ok(filterTemplates(tripTemplates, { countries: 'multi' }).every((t) => new Set(t.stops.map((s) => cityById[s.cityId].country)).size > 1))
  assert.ok(filterTemplates(tripTemplates, { country: 'IT' }).length >= 3)
  assert.ok(filterTemplates(tripTemplates, { style: 'gems' }).some((t) => t.id === 'hidden-italy-8'))
  assert.equal(filterTemplates(tripTemplates, { category: 'quick', duration: '13+' }).length, 0)
  assert.ok(templateBySlug['10-days-in-italy'])
  const meta = templateMeta(italy)
  assert.equal(meta.title, '10 Days in Italy: Rome, Florence & Venice')
  assert.match(meta.description, /^Explore a 10-day Italy itinerary through Rome, Florence and Venice with train-first travel/)
  assert.equal(meta.path, '/trip-ideas/10-days-in-italy')
  for (const t of tripTemplates) assert.deepEqual(cleanProps({ template: t.id }), { template: t.id })
})
