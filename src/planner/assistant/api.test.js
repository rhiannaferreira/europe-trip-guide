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

test('scope app uses the site-wide actions and rejects unknown scopes', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  let sent
  const appAction = { action: 'open_city', city: 'Rome', reply: 'Opening Rome.' }
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body)
    return { ok: true, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(appAction) }] }) }
  }
  const r = await call('POST', { message: 'open rome', context: { page: { name: 'home' } }, scope: 'app' })
  assert.equal(r.status, 200)
  assert.equal(r.json.action.action, 'open_city')
  assert.ok(sent.output_config.format.schema.properties.action.enum.includes('build_trip'))
  assert.match(sent.system[0].text, /Eurowander/)
  assert.deepEqual(sent.system[0].cache_control, { type: 'ephemeral' })
  assert.ok(sent.output_config.format.schema.properties.action.enum.includes('open_question'))
  // A trip-builder action isn't allowed in the app scope, and vice versa.
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ ...action, action: 'answer' }) }] }) })
  assert.equal((await call('POST', { message: 'x', context, scope: 'app' })).status, 502)
  assert.equal((await call('POST', { message: 'x', context, scope: '__proto__' })).status, 400)
  assert.equal((await call('POST', { message: 'x', context, scope: 'nope' })).status, 400)
})

// A streamed response: the mock writes SSE events like the Messages API; `call` collects what the handler writes.
function sse(events) {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new ReadableStream({
    start(c) {
      // Split mid-event, as a network would.
      const enc = new TextEncoder()
      c.enqueue(enc.encode(text.slice(0, 37)))
      c.enqueue(enc.encode(text.slice(37)))
      c.close()
    },
  })
}
function callStream(body) {
  const res = { statusCode: 0, headers: {}, chunks: [] }
  res.status = (s) => ((res.statusCode = s), res)
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v)
  res.write = (b) => res.chunks.push(b)
  res.end = (b) => b && res.chunks.push(b)
  return handler({ method: 'POST', body, headers: { 'x-forwarded-for': `10.1.0.${Math.floor(Math.random() * 250)}` } }, res).then(() => ({
    status: res.statusCode,
    type: res.headers['content-type'],
    lines: res.chunks.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
  }))
}

test('scope answer streams only the answer text, then done', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  let sent
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body)
    return {
      ok: true,
      body: sse([
        { type: 'message_start', message: { id: 'm' } },
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'secret reasoning' } },
        { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '{"message":"Walk the ' } },
        { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Arno."' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
        { type: 'message_stop' },
      ]),
    }
  }
  const r = await callStream({ message: 'What should I do tonight?', context: { trip: null }, scope: 'answer' })
  assert.equal(r.status, 200)
  assert.match(r.type, /ndjson/)
  assert.equal(sent.stream, true)
  assert.ok(sent.output_config.format.schema.properties.message)
  assert.match(sent.system[0].text, /Never invent live information/)
  assert.deepEqual(r.lines, [{ type: 'text', text: '{"message":"Walk the ' }, { type: 'text', text: 'Arno."' }, { type: 'done' }])
  assert.ok(!JSON.stringify(r.lines).includes('secret'))
})

test('scope answer reports a refusal or a failed model call', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  globalThis.fetch = async () => ({ ok: true, body: sse([{ type: 'content_block_delta', delta: { type: 'text_delta', text: '{"mes' } }, { type: 'message_delta', delta: { stop_reason: 'refusal' } }]) })
  const r = await callStream({ message: 'hi', context: { trip: null }, scope: 'answer' })
  assert.deepEqual(r.lines[r.lines.length - 1], { type: 'error', error: 'declined' })
  globalThis.fetch = async () => ({ ok: false, status: 529 })
  assert.equal((await call('POST', { message: 'hi', context: { trip: null }, scope: 'answer' })).status, 502)
})
