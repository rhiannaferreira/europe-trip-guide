import { useEffect, useState } from 'react'
import { cityById } from '../data/cities.js'
import { track } from '../lib/analytics.js'
import { HASH_MODE } from '../lib/router.jsx'
import { EXAMPLES, parseIntent } from '../planner/assistant/intents.js'
import { validateAction } from '../planner/assistant/actions.js'
import { runAction } from '../planner/assistant/run.js'
import { applyChange } from '../planner/modify.js'
import { planTimeline } from '../planner/plan.js'
import { assistantContext } from '../planner/assistant/context.js'
import DataBadge from './DataBadge.jsx'

const API = '/api/assistant'

// Sends one request to the AI endpoint. `scope` is 'plan' (a built trip) or 'app' (the site-wide assistant).
// Returns the raw action, or null when the AI couldn't answer.
export async function askAi(message, context, scope = 'plan') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, context, scope }),
      signal: controller.signal,
    })
    if (!r.ok) return null
    const data = await r.json()
    return data?.action || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Whether the AI is set up (asked once per page load).
let aiCheck = null
export function useAiReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (HASH_MODE) return
    let live = true
    aiCheck ||= fetch(API)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => Boolean(d?.enabled))
      .catch(() => false)
    aiCheck.then((ok) => live && setReady(ok))
    return () => {
      live = false
    }
  }, [])
  return ready
}

// Works out a request about a built trip. `raw` is the AI's action if it answered; otherwise the
// built-in rules read the request. Returns an entry for the chat log.
export function answerPlanRequest(q, { plan, days, weather, raw = null, aiReady = false }) {
  const via = raw ? 'ai' : 'rules'
  if (!raw) raw = parseIntent(q, { plan, timeline: planTimeline(plan) })
  const checked = validateAction(raw, { plan, dayCount: days.length })
  let result
  if (!checked.ok) result = { kind: 'none', text: checked.error }
  else {
    try {
      result = runAction(checked.action, { plan, days, weather: weather?.byDay || {} })
    } catch {
      result = { kind: 'none', text: 'Something went wrong working that out. Try asking another way.' }
    }
  }
  track('assistant_used', { mode: via, action: checked.ok ? checked.action.action : 'invalid', result: result.kind })
  return { id: Date.now(), q, via, planAt: plan, action: checked.ok ? checked.action.action : '', reply: via === 'ai' && checked.ok ? checked.action.reply : '', result, fallback: aiReady && via === 'rules' }
}

// The planner's answer to one request about a built trip, with Apply / Dismiss for a proposed change.
export function PlanReply({ entry: e, plan, onApply, settle }) {
  if (e.result.kind !== 'proposal') return <p>{e.result.text}</p>
  return (
    <div className="proposal">
      <p>
        <strong>Proposed:</strong> {e.result.summary}
      </p>
      {e.result.reasons?.length > 0 && <p className="plan-why">Why: {e.result.reasons.join('; ')}</p>}
      {e.status ? (
        <p className="rule">{e.status === 'applied' ? 'Applied.' : 'Dismissed.'}</p>
      ) : e.planAt !== plan ? (
        <p className="rule">The trip has changed since this was worked out. Ask again for an up-to-date suggestion.</p>
      ) : (
        <div className="proposal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              settle(e.id, 'applied')
              onApply(e.result.plan, { message: e.result.summary, days: e.result.plan === plan ? e.result.days : null, replaced: e.action === 'replace_city', optimized: e.action === 'optimize_route' })
            }}
          >
            Apply
          </button>
          <button type="button" className="btn" onClick={() => settle(e.id, 'dismissed')}>
            Dismiss
          </button>
        </div>
      )}
      {!e.status && e.planAt === plan && e.result.options?.length > 0 && (
        <div className="proposal-options">
          <span className="rule">Other options:</span>
          {e.result.options.map((o) => (
            <button
              key={o.cityId}
              type="button"
              className="chip"
              title={o.reasons.join('; ')}
              onClick={() => {
                const r = applyChange(plan, o.change)
                if (!r.changed) return
                settle(e.id, 'applied')
                onApply(r.plan, { message: r.summary, replaced: o.change.type === 'replace' })
              }}
            >
              {cityById[o.cityId].name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Ask about the trip or ask for a change. The request is read (by the AI when it's set up, otherwise by
// built-in rules) into one checked action; the planner works out the answer or the change, and a change
// only happens when the traveller presses Apply.
export default function Assistant({ plan, days, weather, onApply }) {
  const aiReady = useAiReady()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])

  const ask = async (message) => {
    const q = message.trim().slice(0, 500)
    if (!q || busy) return
    setBusy(true)
    const raw = aiReady ? await askAi(q, assistantContext(plan)) : null
    const entry = answerPlanRequest(q, { plan, days, weather, raw, aiReady })
    setLog((l) => [...l.slice(-5), entry])
    setText('')
    setBusy(false)
  }

  const settle = (id, status) => setLog((l) => l.map((e) => (e.id === id ? { ...e, status } : e)))

  return (
    <div className="assistant">
      <p className="rule">
        Ask about this trip or ask for a change. {aiReady ? 'An AI reads your request; ' : ''}Eurowander’s planner works out every answer and number, and nothing changes until you press Apply. The 💬 button works on every page too.
      </p>
      <ul className="assistant-log" aria-live="polite">
        {log.map((e) => (
          <li key={e.id}>
            <p className="assistant-q">{e.q}</p>
            <div className="assistant-a">
              {e.via === 'ai' && <DataBadge kind="ai" />}
              {e.fallback && <p className="rule">The AI couldn’t answer just now, so the built-in rules read this.</p>}
              {e.reply && <p className="assistant-understood">{e.reply}</p>}
              <PlanReply entry={e} plan={plan} onApply={onApply} settle={settle} />
            </div>
          </li>
        ))}
      </ul>
      <form
        className="assistant-form"
        onSubmit={(ev) => {
          ev.preventDefault()
          ask(text)
        }}
      >
        <label htmlFor="assistant-input" className="visually-hidden">
          Ask about your trip
        </label>
        <input id="assistant-input" type="text" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Make day 3 less busy" autoComplete="off" />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div className="interest-chips" aria-label="Examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => ask(ex)} disabled={busy}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
