// Tests for the serverless assistant endpoint (api/assistant.js), with the model call mocked.
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../../api/assistant.js'

function call(method, body, headers = {}) {
  const res = { statusCode: 0, headers: {}, body: '' }
  res.status = (s) => ((res.statusCode = s), res)
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v)
  res.end = (b) => (res.body = b)
  return handler({ method, body, headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers } }, res).then(() => ({ status: res.statusCode, json: JSON.parse(res.body) }))
}
const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.ANTHROPIC_API_KEY
})
const context = { stops: [{ city: 'Paris', nights: 3 }], dayList: [], prefs: {} }
const action = { action: 'reduce_travel', targetCity: '', city: '', day: null, nights: null, delta: null, interest: 'none', question: 'none', lessTouristy: false, cheaper: false, maxAdditionalTravelMinutes: null, reply: 'Less time on trains.' }

test('without a key the assistant reports itself off and refuses requests', async () => {
  assert.deepEqual((await call('GET')).json, { enabled: false })
  assert.equal((await call('POST', { message: 'hi', context })).status, 503)
})

test('with a key, a request becomes one action from the model', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  let sent
  globalThis.fetch = async (url, init) => {
    sent = { url, init: JSON.parse(init.body), headers: init.headers }
    return { ok: true, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(action) }] }) }
  }
  const r = await call('POST', { message: 'Reduce train time', context })
  assert.equal(r.status, 200)
  assert.equal(r.json.action.action, 'reduce_travel')
  assert.equal(sent.headers['x-api-key'], 'test-key')
  assert.equal(sent.init.output_config.format.type, 'json_schema')
})

test('bad input and bad model output are rejected', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  assert.equal((await call('POST', { message: 'x'.repeat(501), context })).status, 400)
  assert.equal((await call('POST', { message: 'hi' })).status, 400)
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: '{"action":"delete_everything"}' }] }) })
  assert.equal((await call('POST', { message: 'hi', context })).status, 502)
  globalThis.fetch = async () => ({ ok: false, status: 500 })
  assert.equal((await call('POST', { message: 'hi', context })).status, 502)
})
