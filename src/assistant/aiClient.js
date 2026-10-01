// The copilot's calls to /api/assistant. The AI key stays on the server; these only send the message and
// the small, checked context the app built, and never throw.
import { partialMessage, validateAnswer } from './aiAnswer.js'

const API = '/api/assistant'
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

async function post(body, signal) {
  return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
}

// Step 1: the AI reads the message into one action. Returns { action } or { error }.
export async function readAction(message, context) {
  if (offline()) return { error: 'offline' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const r = await post({ message, context, scope: 'app' }, controller.signal)
    if (r.status === 429) return { error: 'rate' }
    if (!r.ok) return { error: 'failed' }
    const data = await r.json()
    return data?.action ? { action: data.action } : { error: 'failed' }
  } catch {
    return { error: offline() ? 'offline' : 'failed' }
  } finally {
    clearTimeout(timer)
  }
}

// Step 2: the AI writes the answer from the verified context, streamed. `onText(soFar)` gets the message
// as it grows. Returns { answer } (checked by validateAnswer) or { error }.
export async function streamAnswer(message, context, { placeIds = [], onText = () => {} } = {}) {
  if (offline()) return { error: 'offline' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000)
  let json = ''
  let shown = ''
  try {
    const r = await post({ message, context, scope: 'answer' }, controller.signal)
    if (r.status === 429) return { error: 'rate' }
    if (!r.ok || !r.body) return { error: 'failed' }
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let end = null
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let cut
      while ((cut = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, cut).trim()
        buffer = buffer.slice(cut + 1)
        if (!raw) continue
        let ev
        try {
          ev = JSON.parse(raw)
        } catch {
          continue
        }
        if (ev.type === 'text') {
          json += ev.text
          const now = partialMessage(json)
          if (now !== shown) {
            shown = now
            onText(now)
          }
        } else end = ev
      }
    }
    if (end?.type !== 'done') return { error: end?.error || 'failed' }
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      return { error: 'failed' }
    }
    const answer = validateAnswer(parsed, { placeIds })
    return answer ? { answer } : { error: 'failed' }
  } catch {
    return { error: offline() ? 'offline' : 'failed' }
  } finally {
    clearTimeout(timer)
  }
}
