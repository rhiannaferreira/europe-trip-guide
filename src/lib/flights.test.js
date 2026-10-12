import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cityById } from '../data/cities.js'
import { airports } from '../data/airports.js'
import { flightOption, flightSearchUrl } from './flights.js'
import { legBetween } from '../planner/transport.js'

test('every city has at least one airport with a code and distance', () => {
  for (const id of Object.keys(cityById)) {
    assert.ok(airports[id]?.length, id)
    for (const a of airports[id]) assert.match(a.code, /^[A-Z]{3}$/)
  }
})

test('a long rail leg gets a flight option that saves time', () => {
  const opt = flightOption(legBetween('amsterdam', 'athens'))
  assert.ok(opt)
  assert.equal(opt.fromAirports[0].code, 'AMS')
  assert.equal(opt.toAirports[0].code, 'ATH')
  assert.ok(opt.saves >= 90)
})

test('short hops get no flight option', () => {
  assert.equal(flightOption(legBetween('paris', 'brussels')), null)
  assert.equal(flightOption(legBetween('florence', 'lucca')), null)
})

test('a leg the planner already made a flight keeps its airports', () => {
  const leg = legBetween('amsterdam', 'athens', { transport: 'mixed' })
  assert.equal(leg.mode, 'flight')
  assert.ok(flightOption(leg))
})

test('the search link names both cities and the date', () => {
  const url = flightSearchUrl(legBetween('lisbon', 'berlin'), '2026-11-03')
  assert.ok(url.startsWith('https://www.google.com/travel/flights?q='))
  assert.match(decodeURIComponent(url), /Lisbon to Berlin on 2026-11-03/)
})
