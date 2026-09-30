// Tests for the site-wide assistant: reading requests, checking them, and working out the answers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { APP_ACTION_SCHEMA, resolvePlace, validateAppAction } from './appActions.js'
import { countriesIn, parseAppIntent, tripLengthIn } from './appIntents.js'
import { buildInput, runAppAction } from './appRun.js'
import { appContext } from './appContext.js'
import { withCity, withPlace } from '../lib/tripStore.js'
import { emptyTrip } from '../lib/tripModel.js'

const read = (text, ctx = {}) => {
  const raw = parseAppIntent(text, ctx)
  const checked = validateAppAction(raw, ctx)
  return { raw, checked, result: checked.ok ? runAppAction(checked.action, { trip: emptyTrip(), today: '2026-09-30', ...ctx }) : null }
}

test('rule outputs always carry every schema field', () => {
  for (const q of ['open rome', 'plan 5 days in Spain', 'hello']) {
    const raw = parseAppIntent(q)
    for (const k of APP_ACTION_SCHEMA.required) assert.ok(k in raw, `${q}: ${k}`)
  }
})

test('trip lengths, countries and places are read from text', () => {
  assert.equal(tripLengthIn('ten days'), 10)
  assert.equal(tripLengthIn('two weeks'), 14)
  assert.equal(tripLengthIn('5 nights'), 6)
  assert.deepEqual(countriesIn('Holland then Czechia'), ['NL', 'CZ'])
  assert.equal(resolvePlace('the louvre').id, 'paris-louvre')
  assert.equal(resolvePlace('xyzzy'), null)
})

test('a new trip request becomes a build proposal with a real route', () => {
  const { raw, result } = read('Plan 10 days in Italy and Greece for food, relaxed, €3000')
  assert.equal(raw.action, 'build_trip')
  assert.deepEqual(raw.countries, ['IT', 'GR'])
  assert.equal(result.kind, 'proposal')
  assert.equal(result.effect.type, 'build')
  assert.equal(result.effect.input.days, 10)
  assert.equal(result.effect.input.pace, 'relaxed')
  assert.equal(result.effect.input.currency, 'EUR')
  assert.match(result.detail, /Suggested route: /)
})

test('navigation, places, cities and help', () => {
  assert.deepEqual(read('open rome').result.effect, { type: 'navigate', to: '/city/rome' })
  assert.deepEqual(read('take me to the quiz').result.effect, { type: 'tool', tool: 'quiz' })
  assert.deepEqual(read('France').result.effect, { type: 'navigate', to: '/country/fr' })
  const food = read('where to eat in Paris?').result
  assert.equal(food.kind, 'answer')
  assert.ok(food.items.length > 0 && food.items.every((i) => i.id.startsWith('paris-')))
  assert.equal(read('things to do', { pageCityId: 'rome' }).raw.city, 'rome')
  const gems = read('less touristy cities in Spain').result
  assert.ok(gems.items.length > 0)
  assert.equal(read('How do I share my trip?').raw.topic, 'share')
  assert.match(read('tell me about Porto').result.text, /Typical stay/)
})

test('changes to the saved trip are proposals, never done straight away', () => {
  const add = read('add Florence to my trip').result
  assert.equal(add.kind, 'proposal')
  assert.deepEqual(add.effect, { type: 'add_city', cityId: 'florence' })
  const save = read('save the Louvre').result
  assert.deepEqual(save.effect, { type: 'save_place', placeId: 'paris-louvre' })
})

test('bad or unknown values are refused, not guessed', () => {
  assert.equal(validateAppAction({ action: 'delete_everything' }).ok, false)
  assert.equal(validateAppAction({ action: 'open_city', city: 'Atlantis' }).ok, false)
  assert.equal(validateAppAction({ action: 'save_place', place: 'Nowhere Café' }).ok, false)
  const b = validateAppAction({ action: 'build_trip', cities: ['Rome', 'Gotham'], countries: ['Italy'], interests: ['food', 'lasers'], tripDays: 99, pace: 'warp' })
  assert.ok(b.ok)
  assert.deepEqual(b.action.cities, ['rome'])
  assert.deepEqual(b.action.skipped, ['Gotham'])
  assert.deepEqual(b.action.interests, ['food'])
  assert.equal(b.action.tripDays, null)
  assert.equal(b.action.pace, null)
  assert.equal(buildInput(b.action).days, 10)
})

test('saved trip helpers', () => {
  let t = withCity(emptyTrip(), 'rome')
  assert.deepEqual(t.stops.map((s) => s.cityId), ['rome'])
  t = withPlace(t, 'paris-louvre')
  assert.equal(t.statuses['paris-louvre'], 'saved')
  assert.equal(withPlace(t, 'paris-louvre'), t)
  assert.equal(read('save the Louvre', { trip: t }).result.kind, 'answer')
})

test('the AI context is small and names the page', () => {
  const ctx = appContext({ route: { name: 'city', id: 'rome' }, trip: withCity(emptyTrip(), 'athens'), builderPlan: null, today: '2026-09-30' })
  assert.equal(ctx.page.city, 'Rome')
  assert.deepEqual(ctx.myTrip.cities, ['Athens'])
  assert.ok(JSON.stringify(ctx).length < 6000)
})
