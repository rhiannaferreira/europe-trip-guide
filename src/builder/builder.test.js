// Tests for the builder's non-visual parts: saving a generated trip, analytics, and what the AI is sent.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { migrate } from '../lib/tripModel.js'
import { cleanProps, track } from '../lib/analytics.js'
import { generatePlan } from '../planner/route.js'
import { planDays } from '../planner/dayPlanner.js'
import { planToTrip } from '../planner/convert.js'
import { assistantContext } from '../planner/assistant/context.js'
import { saveGeneratedTrip } from './saveTrip.js'

// A tiny in-memory localStorage.
beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
})

const plan = generatePlan({ startCityId: 'london', days: 12, startDate: '2026-11-02' }, { today: '2026-09-30' }).plan
const trip = planToTrip(plan, planDays(plan), { name: 'Test trip' })

test('saving a generated trip replaces the trip and keeps the old one as a backup', () => {
  const old = { ...migrate(null), name: 'Old', stops: [{ cityId: 'rome', auto: false, placeIds: [], days: null }] }
  writeJSON(KEYS.trip, old)
  saveGeneratedTrip(trip)
  const saved = migrate(readJSON(KEYS.trip))
  assert.equal(saved.name, 'Test trip')
  assert.deepEqual(saved.stops.map((s) => s.cityId), plan.stops.map((s) => s.cityId))
  assert.equal(saved.startDate, '2026-11-02')
  assert.equal(readJSON(KEYS.tripPrevious).name, 'Old')
})

test('saving into an empty browser keeps no backup', () => {
  saveGeneratedTrip(trip)
  assert.equal(readJSON(KEYS.tripPrevious), null)
})

test('saving updates budget settings but keeps expenses', () => {
  writeJSON(KEYS.budget, { version: 1, total: '900', currency: 'EUR', travellers: 1, cityLevels: {}, estimates: {}, expenses: [{ id: 'e1', category: 'food', label: 'Lunch', amount: 20, kind: 'paid' }] })
  saveGeneratedTrip(trip, { budget: { total: '3000', currency: 'USD', travellers: 2 } })
  const b = readJSON(KEYS.budget)
  assert.equal(b.total, '3000')
  assert.equal(b.currency, 'USD')
  assert.equal(b.travellers, 2)
  assert.equal(b.expenses.length, 1)
})

test('signed in, saving points the account link at a new trip instead of the open one', () => {
  writeJSON(KEYS.cloud, { userId: 'u1', tripId: 'trip-a', syncedHash: 'abc', remoteUpdatedAt: '2026-09-29T10:00:00Z' })
  saveGeneratedTrip(trip)
  const link = readJSON(KEYS.cloud)
  assert.equal(link.userId, 'u1')
  assert.notEqual(link.tripId, 'trip-a')
  assert.equal(link.syncedHash, null)
})

test('signed out, the account link is left alone', () => {
  saveGeneratedTrip(trip)
  assert.equal(readJSON(KEYS.cloud), null)
})

test('analytics only sends known events with small, non-text values', () => {
  assert.deepEqual(cleanProps({ cities: 4, ok: true, mode: 'rules', message: 'Replace Paris with somewhere quiet', nan: NaN, obj: {} }), { cities: 4, ok: true, mode: 'rules' })
  const sent = []
  globalThis.window = { va: (...args) => sent.push(args), dispatchEvent: () => true }
  globalThis.CustomEvent = class {
    constructor(name, init) {
      this.type = name
      this.detail = init.detail
    }
  }
  assert.equal(track('not_an_event', {}), false)
  assert.equal(track('trip_generated', { cities: 4, note: 'my secret plans' }), true)
  assert.deepEqual(sent, [['event', { name: 'trip_generated', data: { cities: 4 } }]])
  delete globalThis.window
})

test('the assistant context has cities and days but no trip name or notes, and fits the size limit', () => {
  const long = generatePlan({ days: 45, startDate: '2026-11-02', pace: 'fast' }, { today: '2026-09-30' }).plan
  const ctx = assistantContext(long)
  assert.equal(ctx.dayList.length, 45)
  assert.ok(JSON.stringify(ctx).length < 6000)
  assert.equal(JSON.stringify(assistantContext(plan)).includes('Test trip'), false)
})
