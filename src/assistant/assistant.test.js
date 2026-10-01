// Tests for the EuroWander travel copilot: reading requests, checking them, and working out the answers
// and proposed trip changes from Eurowander's data and planner.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { APP_ACTION_SCHEMA, APP_ACTIONS, resolvePlace, validateAppAction } from './appActions.js'
import { countriesIn, parseAppIntent, tripDayIn, tripLengthIn } from './appIntents.js'
import { buildInput } from './appRun.js'
import { appContext } from './appContext.js'
import { check, respond } from './copilot.js'
import { chatTitle, storableEntry } from './history.js'
import { applyPlanToTrip, countriesLabel, datesLabel, openTripHandle, tripKey, tripMode } from './tripHandle.js'
import { withCity, withPlace } from '../lib/tripStore.js'
import { emptyTrip } from '../lib/tripModel.js'

const TODAY = '2026-09-30'
const sampleTrip = () => ({
  version: 3,
  name: 'Spring loop',
  stops: ['paris', 'amsterdam', 'berlin', 'prague'].map((cityId) => ({ cityId, auto: false, placeIds: cityId === 'paris' ? ['paris-louvre', 'paris-orsay'] : [], days: null })),
  startDate: '2027-04-06',
  endDate: '2027-04-17',
  statuses: { 'paris-louvre': 'saved', 'paris-orsay': 'want' },
  itinerary: { 1: { placeIds: ['paris-louvre'], note: 'Book ahead' }, 2: { placeIds: ['paris-orsay'], note: '' } },
  notes: { trip: 'private notes', cities: {} },
})
const handleFor = (trip = sampleTrip()) => openTripHandle({ route: { name: 'explore' }, trip, budget: { budget: '3000', currency: 'EUR', travellers: 2 } })

// One conversation: each message is read by the rules, checked and answered, with memory carried over.
function chat(messages, handle = handleFor()) {
  let memory = {}
  return messages.map((q) => {
    const ctx = { handle, pageCityId: null, memory, today: TODAY, weatherByDay: {} }
    const raw = parseAppIntent(q, ctx)
    const checked = check(raw, ctx)
    const r = respond(checked, ctx)
    if (r.memory) memory = { ...memory, ...r.memory }
    return { raw, checked, r }
  })
}
const block = (r, type) => r.blocks?.find((b) => b.type === type)
const options = (r) => block(r, 'options')?.options || []

test('rule outputs always carry every schema field and a known action', () => {
  for (const q of ['open rome', 'plan 5 days in Spain', 'hello', 'Remove Berlin', 'Plan Tuesday']) {
    const raw = parseAppIntent(q, { handle: handleFor(), today: TODAY })
    for (const k of APP_ACTION_SCHEMA.required) assert.ok(k in raw, `${q}: ${k}`)
    assert.ok(APP_ACTIONS.includes(raw.action), `${q}: ${raw.action}`)
  }
})

test('trip lengths, countries, days and places are read from text', () => {
  assert.equal(tripLengthIn('ten days'), 10)
  assert.equal(tripLengthIn('two weeks'), 14)
  assert.deepEqual(countriesIn('Holland then Czechia'), ['NL', 'CZ'])
  assert.equal(resolvePlace('the louvre').id, 'paris-louvre')
  assert.equal(resolvePlace('xyzzy'), null)
  const h = handleFor()
  assert.equal(tripDayIn('plan tuesday', { handle: h, today: TODAY }), 1) // 6 Apr 2027 is a Tuesday
  assert.equal(tripDayIn('day 3', { handle: h, today: TODAY }), 3)
})

test('the trip handle describes the open trip', () => {
  const h = handleFor()
  assert.equal(h.kind, 'saved')
  assert.deepEqual(h.plan.stops.map((s) => s.cityId), ['paris', 'amsterdam', 'berlin', 'prague'])
  assert.equal(h.days.length, 12)
  assert.deepEqual(h.days[0].items.map((i) => i.placeId), ['paris-louvre'])
  assert.equal(countriesLabel(h.plan), 'France, Netherlands +2')
  assert.equal(datesLabel('2027-06-10', '2027-06-21'), 'Jun 10–21')
  assert.equal(tripMode(null, TODAY), 'exploring')
  assert.equal(tripMode(h, TODAY), 'editing')
  assert.equal(tripMode(h, '2027-04-08'), 'traveling')
  assert.equal(openTripHandle({ route: { name: 'explore' }, trip: emptyTrip() }), null)
})

test('the 15 test conversations give sensible, structured answers', () => {
  const [plan10, afterParis, quieter] = chat(['Plan me 10 days in Europe.', 'Where should I go after Paris?', 'Give me somewhere less touristy.'], null)
  assert.equal(plan10.raw.action, 'build_trip')
  assert.ok(plan10.r.followUps.some((f) => f.label === 'Just build it'), 'asks a short follow-up before building')
  assert.equal(afterParis.raw.action, 'next_after')
  assert.ok(block(afterParis.r, 'cities').items.every((i) => i.train && i.train.from === 'paris'))
  assert.equal(quieter.raw.action, 'alternatives_to')
  assert.ok(block(quieter.r, 'cities').items.length > 0)

  const h = handleFor()
  const [addPrague, removeBerlin, cheaper, lessTravel, rushed, tuesday, lighter, rain, priciest, museums, replaceAms, surprise] = chat(
    [
      'Add Prague to my trip.',
      'Remove Berlin.',
      'Make my trip cheaper.',
      'Reduce my train time.',
      'Is my trip too rushed?',
      'Plan Tuesday.',
      'Make Tuesday less busy.',
      'Move outdoor activities off the rainy day.',
      "What's my most expensive city?",
      'Show me museums near my saved places.',
      'Replace Amsterdam with somewhere quieter.',
      'Surprise me.',
    ],
    h,
  )
  assert.match(addPrague.r.text, /already in your trip/)
  assert.deepEqual(options(removeBerlin.r)[0].preview.after.map((s) => s.cityId), ['paris', 'amsterdam', 'prague'])
  assert.ok(options(cheaper.r).length >= 1 && options(cheaper.r).every((o) => o.preview.cost[1] < o.preview.cost[0]))
  assert.ok(options(lessTravel.r).every((o) => o.preview.travel[1] < o.preview.travel[0]))
  assert.equal(rushed.raw.action, 'trip_question')
  assert.ok(block(rushed.r, 'stats'))
  assert.equal(tuesday.raw.action, 'plan_day')
  assert.equal(tuesday.checked.action.day, 1)
  assert.ok(options(tuesday.r)[0].days.find((d) => d.number === 1).items.length > 1)
  assert.equal(lighter.raw.action, 'lighten_day')
  assert.equal(rain.raw.action, 'rain_plan')
  assert.match(rain.r.text, /forecast/)
  assert.ok(block(priciest.r, 'budget'))
  assert.match(priciest.r.text, /most expensive city/)
  assert.ok(block(museums.r, 'places').items.length > 0)
  assert.equal(replaceAms.raw.action, 'replace_city')
  assert.ok(options(replaceAms.r).every((o) => !o.preview.after.some((s) => s.cityId === 'amsterdam')))
  assert.equal(surprise.raw.action, 'surprise')
  assert.equal(block(surprise.r, 'cities').items.length, 1)
})

test('proposals never change the trip; applying writes back to the one real trip', () => {
  const trip = sampleTrip()
  const h = handleFor(trip)
  const before = JSON.stringify(trip)
  const [remove] = chat(['Remove Berlin.'], h)
  assert.equal(JSON.stringify(trip), before)
  const o = options(remove.r)[0]
  const next = applyPlanToTrip(trip, h.plan, o.plan)
  assert.deepEqual(next.stops.map((s) => s.cityId), ['paris', 'amsterdam', 'prague'])
  assert.equal(next.startDate, trip.startDate)
  assert.equal(next.itinerary[1].note, 'Book ahead')
  assert.notEqual(tripKey(handleFor(next)), tripKey(h), 'an old proposal is stale after a change')
})

test('trip commands without a trip, or days without dates, explain what is needed', () => {
  const [noTrip] = chat(['Remove Berlin.'], null)
  assert.equal(noTrip.checked.ok, false)
  assert.ok(noTrip.checked.noTrip)
  assert.ok(noTrip.r.followUps.length > 0)
  const undated = { ...sampleTrip(), startDate: '', endDate: '' }
  const [day] = chat(['Plan day 2'], handleFor(undated))
  assert.equal(day.checked.ok, false)
  assert.ok(day.checked.needsDates)
})

test('bad or unknown values are refused, not guessed', () => {
  assert.equal(validateAppAction({ action: 'delete_everything' }).ok, false)
  assert.equal(validateAppAction({ action: 'open_city', city: 'Atlantis' }).ok, false)
  assert.equal(validateAppAction({ action: 'save_place', place: 'Nowhere Café' }).ok, false)
  assert.equal(validateAppAction({ action: 'remove_city', targetCity: 'Rome' }, { handle: handleFor() }).ok, false)
  const b = validateAppAction({ action: 'build_trip', cities: ['Rome', 'Gotham'], countries: ['Italy'], interests: ['food', 'lasers'], tripDays: 99, pace: 'warp' })
  assert.ok(b.ok)
  assert.deepEqual(b.action.cities, ['rome'])
  assert.deepEqual(b.action.interests, ['food'])
  assert.equal(b.action.tripDays, null)
  assert.equal(b.action.pace, null)
  assert.equal(buildInput(b.action).days, 10)
})

test('navigation happens straight away; saving waits for a button', () => {
  const [rome, louvre] = chat(['open rome', 'show me the Louvre'], null)
  assert.deepEqual(rome.r.now, { type: 'navigate', to: '/city/rome' })
  assert.ok(!louvre.r.now)
  assert.equal(block(louvre.r, 'places').items[0].placeId, 'paris-louvre')
})

test('saved trip helpers', () => {
  let t = withCity(emptyTrip(), 'rome')
  assert.deepEqual(t.stops.map((s) => s.cityId), ['rome'])
  t = withPlace(t, 'paris-louvre')
  assert.equal(t.statuses['paris-louvre'], 'saved')
  assert.equal(withPlace(t, 'paris-louvre'), t)
})

test('the AI context is small, structured, and leaves out private notes', () => {
  const ctx = appContext({ route: { name: 'city', id: 'rome' }, handle: handleFor(), today: TODAY, memory: { lastList: ['reims'], anchorCity: 'paris' } })
  assert.equal(ctx.page.city, 'Rome')
  assert.deepEqual(ctx.trip.stops.map((s) => s.city), ['Paris', 'Amsterdam', 'Berlin', 'Prague'])
  assert.equal(ctx.trip.days[0].weekday, 'Tue')
  assert.deepEqual(ctx.recent.lastShown, ['Reims'])
  const text = JSON.stringify(ctx)
  assert.ok(!text.includes('private notes') && !text.includes('Book ahead'))
  assert.ok(text.length < 14000)
})

test('stored chats keep text and cards but not plans', () => {
  const [remove] = chat(['Remove Berlin.'])
  const entry = { id: '1', q: 'Remove Berlin.', via: 'rules', result: remove.r, done: { 'b0:applied': { option: 0, undo: () => {}, short: 'Applied' } } }
  const stored = JSON.parse(JSON.stringify(storableEntry(entry)))
  const opts = stored.result.blocks.find((b) => b.type === 'options')
  assert.ok(opts.restored)
  assert.ok(opts.options.every((o) => !('plan' in o) && o.preview))
  assert.deepEqual(stored.done['b0:applied'], { short: 'Applied', option: 0 })
  assert.equal(chatTitle([{ q: 'What should I do in Lisbon for three days if it rains a lot?' }]), 'What should I do in Lisbon for three day…')
  assert.equal(chatTitle([{ q: 'Surprise me!' }]), 'Surprise me')
})

// ----- The AI layer: what it's given, and how its answer is checked -----
import { ANSWER_SCHEMA, formatMessage, partialMessage, validateAnswer } from './aiAnswer.js'
import { MAX_AI_CONTEXT, buildAIContext, isFactAction, needsAiAnswer, verifiedFacts } from './aiContext.js'
import { openQuestion } from './copilot.js'

test('plain facts skip the AI; open questions and options get an AI answer', () => {
  const h = handleFor()
  const read = (q) => check(parseAppIntent(q, { handle: h, today: TODAY }), { handle: h, today: TODAY })
  assert.ok(isFactAction(read('How much will my trip cost?').action))
  assert.ok(isFactAction(read('open rome').action))
  assert.ok(!isFactAction(read('Make my trip cheaper').action))
  const cheap = read('Make my trip cheaper')
  assert.ok(needsAiAnswer(cheap.action, respond(cheap, { handle: h, today: TODAY })))
  assert.ok(needsAiAnswer({ action: 'open_question' }, { text: '' }))
  assert.ok(!needsAiAnswer({ action: 'open_city', city: 'rome' }, { now: { type: 'navigate' } }))
})

test('limits: cheaper but keep a country, faster but keep a city, at most an hour more travel', () => {
  const h = handleFor()
  const [keepFrance, keepPrague, limited] = chat(['Make my trip cheaper but don’t remove France.', 'Reduce train time but keep Prague.', 'Make my trip cheaper but keep Paris and no more than an hour of extra train.'], h)
  assert.deepEqual(keepFrance.checked.action.limits.keepCountries, ['FR'])
  for (const o of options(keepFrance.r)) assert.ok(o.preview.after.some((s) => s.cityId === 'paris') && o.preview.cost[1] < o.preview.cost[0])
  assert.deepEqual(keepPrague.checked.action.limits.keepCities, ['prague'])
  for (const o of options(keepPrague.r)) assert.ok(o.preview.after.some((s) => s.cityId === 'prague') && o.preview.travel[1] < o.preview.travel[0])
  assert.equal(limited.checked.action.limits.maxExtraTravel, 60)
  for (const o of options(limited.r)) assert.ok(o.preview.travel[1] - o.preview.travel[0] <= 60)
  // The AI's reading of the same request goes through the same check.
  const ai = check({ ...parseAppIntent('x', {}), action: 'make_cheaper', keepCountries: ['Italy', 'France'], maxExtraTravelMinutes: 60 }, { handle: h })
  assert.deepEqual(ai.action.limits, { keepCities: [], keepCountries: ['FR'], maxExtraTravel: 60 })
})

test('"Add the second one" picks from what the chat just showed', () => {
  const [alts, add] = chat(['Give me somewhere that feels like Amsterdam but is cheaper and quieter.', 'Add the second one.'])
  const second = block(alts.r, 'cities').items[1].cityId
  assert.equal(add.raw.action, 'add_city')
  assert.equal(add.checked.action.city, second)
  assert.ok(options(add.r)[0].preview.after.some((s) => s.cityId === second))
})

test('open questions: anywhere is allowed, and the guide supplies matching cities', () => {
  const c = check({ ...parseAppIntent('x', {}), action: 'open_question', city: 'Ljubljana', interests: ['food'] }, {})
  assert.ok(c.ok)
  const vague = openQuestion({ action: 'open_question', interests: ['food'], month: 11, cities: [] })
  assert.ok(block(vague, 'cities').items.length > 0)
  assert.ok(openQuestion({ action: 'open_question', interests: [], cities: [] }).followUps.length > 0)
})

test('the AI context carries verified numbers, only relevant days, and stays small and private', () => {
  const h = handleFor()
  const [cheap] = chat(['Make my trip cheaper.'], h)
  const ctx = buildAIContext({ message: 'Make my trip cheaper.', action: cheap.checked.action, result: cheap.r, handle: h, memory: {}, today: TODAY })
  const opt = options(cheap.r)[0]
  assert.equal(ctx.verified.proposedChanges[0].estimatedCost.after, Math.round(opt.preview.cost[1]))
  assert.match(ctx.verified.note, /Nothing has changed/)
  assert.deepEqual(ctx.trip.days, []) // no day plans for a whole-trip change
  const text = JSON.stringify(ctx)
  assert.ok(!text.includes('private notes') && !text.includes('Book ahead'))
  assert.ok(text.length <= MAX_AI_CONTEXT)
  // Travelling: today's city and plans, and the places there, for "what should I do tonight?"
  const tonight = buildAIContext({ message: 'I’m exhausted. What should I do tonight?', action: { action: 'open_question', interests: [], cities: [] }, result: { text: '' }, handle: h, today: '2027-04-06' })
  assert.equal(tonight.trip.today.city, 'Paris')
  assert.deepEqual(tonight.trip.days.map((d) => d.day), [1])
  assert.ok(tonight.guide.places.length > 0 && tonight.guide.places.every((p) => p.city === 'Paris'))
  assert.match(tonight.live.weather, /No live forecast/)
})

test('verified facts keep train times as given', () => {
  const v = verifiedFacts({ text: 'x', blocks: [{ type: 'route', legs: [{ from: 'paris', to: 'brussels', minutes: 84, mode: 'train', source: 'sample' }], total: 84 }] })
  assert.deepEqual(v.route.legs, ['Paris → Brussels: 84 min by train'])
})

test('the streamed answer is read as it arrives and checked when complete', () => {
  assert.equal(partialMessage('{"message":"Since you just arr'), 'Since you just arr')
  assert.equal(partialMessage('{"message":"Line one\\nLine \\"two\\"'), 'Line one\nLine "two"')
  assert.equal(partialMessage('{"message":"Caf\\u00e9 time\\'), 'Café time')
  assert.equal(partialMessage('{"mess'), '')
  assert.deepEqual(ANSWER_SCHEMA.required[0], 'message')
  const a = validateAnswer(
    { message: ' Try **Haarlem**. ', cities: ['Haarlem', 'Atlantis', 'Utrecht'], places: ['Louvre Museum', 'Made-up Bistro'], followUps: [{ label: 'Add Haarlem', prompt: 'Add Haarlem to my trip' }, { label: '', prompt: 'x' }], generalKnowledge: true },
    { placeIds: ['paris-louvre'] },
  )
  assert.equal(a.message, 'Try **Haarlem**.')
  assert.ok(!a.cities.includes(null) && a.cities.every((id) => typeof id === 'string'))
  assert.deepEqual(a.places, ['paris-louvre'])
  assert.equal(a.followUps.length, 1)
  assert.equal(validateAnswer({ message: '' }), null)
  assert.deepEqual(formatMessage('Hi **there**\n- one\n- two'), [
    { type: 'p', spans: [{ text: 'Hi ' }, { bold: true, text: 'there' }] },
    { type: 'list', items: [[{ text: 'one' }], [{ text: 'two' }]] },
  ])
})
