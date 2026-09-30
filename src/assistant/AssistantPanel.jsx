import { useEffect, useRef, useState } from 'react'
import { track } from '../lib/analytics.js'
import { navigate } from '../lib/router.jsx'
import { KEYS, readJSON } from '../lib/storage.js'
import { readSavedTrip, updateSavedTrip, withCity, withPlace } from '../lib/tripStore.js'
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { EXAMPLES, parseIntent } from '../planner/assistant/intents.js'
import { assistantContext } from '../planner/assistant/context.js'
import { planTimeline } from '../planner/plan.js'
import { PlanReply, answerPlanRequest, askAi, useAiReady } from '../builder/Assistant.jsx'
import DataBadge from '../builder/DataBadge.jsx'
import { APP_EXAMPLES, parseAppIntent } from './appIntents.js'
import { validateAppAction } from './appActions.js'
import { appContext } from './appContext.js'
import { runAppAction } from './appRun.js'
import { requestBuild, requestTool, useAssistantBridge } from './bridge.js'

const PLANNER_PAGES = ['explore', 'city', 'country', 'trip']
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const narrow = () => window.innerWidth <= 700

// What pressing a button in the chat does. Returns a short note of what happened, with a follow-up link.
function makeRunner(route, onClose) {
  return (effect) => {
    switch (effect?.type) {
      case 'navigate':
        navigate(effect.to)
        window.scrollTo(0, 0)
        if (narrow()) onClose()
        return null
      case 'tool':
        requestTool(effect.tool)
        if (!PLANNER_PAGES.includes(route.name)) navigate('/explore')
        if (narrow()) onClose()
        return null
      case 'add_city':
        updateSavedTrip((t) => withCity(t, effect.cityId))
        return { text: `Added ${cityById[effect.cityId].name} to My trip.`, link: { label: 'Open My trip', effect: { type: 'navigate', to: '/trip' } } }
      case 'save_place':
        updateSavedTrip((t) => withPlace(t, effect.placeId))
        return { text: `Saved ${placeById[effect.placeId].name} to My trip.`, link: { label: 'Open My trip', effect: { type: 'navigate', to: '/trip' } } }
      case 'build':
        requestBuild(effect.input)
        if (route.name !== 'build') navigate('/build')
        window.scrollTo(0, 0)
        if (narrow()) onClose()
        return { text: 'Built. It’s open on the Build page, where you can change anything or keep asking me.' }
      default:
        return null
    }
  }
}

function AppReply({ entry: e, run, settle }) {
  const r = e.result
  const act = (key, effect) => {
    const done = run(effect)
    if (effect.type === 'navigate' || effect.type === 'tool') return
    settle(e.id, { [key]: done || { text: '' } })
  }
  return (
    <>
      {r.kind === 'proposal' ? (
        <div className="proposal">
          <p>
            <strong>Proposed:</strong> {r.summary}
          </p>
          {r.detail && <p className="plan-why">{r.detail}</p>}
          {r.replaces && !e.done?.apply && <p className="rule">This replaces the trip open on the Build page (Undo there brings it back).</p>}
          {e.done?.apply ? (
            <p className="rule">{e.done.apply.text || 'Done.'}</p>
          ) : e.done?.dismiss ? (
            <p className="rule">Dismissed.</p>
          ) : (
            <div className="proposal-actions">
              <button type="button" className="btn btn-primary" onClick={() => act('apply', r.effect)}>
                Apply
              </button>
              <button type="button" className="btn" onClick={() => settle(e.id, { dismiss: { text: '' } })}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      ) : (
        <p>{r.text}</p>
      )}
      {r.items?.length > 0 && (
        <ul className="ask-items">
          {r.items.map((it) => (
            <li key={it.id}>
              <div>
                <strong>{it.title}</strong>
                <span className="ask-item-sub">{it.sub}</span>
              </div>
              <div className="ask-item-actions">
                {it.actions.map((a) => {
                  const key = `${it.id}:${a.label}`
                  const done = e.done?.[key] || !a.effect
                  return (
                    <button key={a.label} type="button" className="chip" disabled={Boolean(done)} onClick={() => act(key, a.effect)}>
                      {done && a.effect ? '✓ Done' : a.label}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {(r.links?.length > 0 || Object.values(e.done || {}).some((d) => d.link)) && (
        <div className="proposal-options">
          {[...(r.links || []), ...Object.values(e.done || {}).map((d) => d.link).filter(Boolean)]
            .filter((l, i, all) => all.findIndex((x) => x.label === l.label) === i)
            .map((l) => (
              <button key={l.label} type="button" className="chip" onClick={() => run(l.effect)}>
                {l.label}
              </button>
            ))}
        </div>
      )}
    </>
  )
}

// The site-wide assistant. A request is read (by the AI when it's set up, otherwise by built-in rules)
// into one checked action. Eurowander's data and planner work out every answer; opening a page happens
// straight away, and anything that changes a trip waits for a button press.
export default function AssistantPanel({ route, open, onClose }) {
  const aiReady = useAiReady()
  const builder = useAssistantBridge((s) => s.builder)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])
  const inputRef = useRef(null)
  const endRef = useRef(null)
  const run = makeRunner(route, onClose)
  const onBuild = route.name === 'build' && builder?.plan ? builder : null

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [log.length, busy])

  const planEntry = (q, raw) =>
    ({ kind: 'plan', ...answerPlanRequest(q, { plan: onBuild.plan, days: onBuild.days, weather: { byDay: onBuild.weatherByDay }, raw, aiReady }) })

  const appEntry = (q, raw, via) => {
    const trip = readSavedTrip()
    const pageCityId = route.name === 'city' ? route.id : null
    const checked = validateAppAction(raw, { pageCityId })
    let result
    if (!checked.ok) result = { kind: 'none', text: checked.error }
    else {
      try {
        result = runAppAction(checked.action, { trip, builderPlan: onBuild?.plan || null, builderInput: onBuild?.input || readJSON(KEYS.builder)?.input, today: todayIso() })
      } catch {
        result = { kind: 'none', text: 'Something went wrong working that out. Try asking another way.' }
      }
    }
    if (checked.ok && checked.action.action === 'plan_request' && !onBuild && readJSON(KEYS.builder)?.plan) {
      result = { kind: 'none', text: 'Your built trip is on the Build page. Ask me again there and I can change it.', links: [{ label: 'Open Build my trip', effect: { type: 'navigate', to: '/build' } }] }
    }
    track('assistant_used', { mode: via, scope: 'app', action: checked.ok ? checked.action.action : 'invalid', result: result.kind })
    if (result.kind === 'navigate') run(result.effect)
    return { kind: 'app', id: Date.now(), q, via, reply: via === 'ai' && checked.ok ? checked.action.reply : '', result, fallback: aiReady && via === 'rules' }
  }

  const ask = async (message) => {
    const q = message.trim().slice(0, 500)
    if (!q || busy) return
    setBusy(true)
    setText('')
    let entry = null
    if (aiReady) {
      const trip = readSavedTrip()
      const raw = await askAi(q, appContext({ route, trip, builderPlan: onBuild?.plan || null, today: todayIso() }), 'app')
      if (raw?.action === 'plan_request' && onBuild) entry = planEntry(q, await askAi(q, assistantContext(onBuild.plan)))
      else if (raw) entry = appEntry(q, raw, 'ai')
    }
    if (!entry && onBuild) {
      const raw = parseIntent(q, { plan: onBuild.plan, timeline: planTimeline(onBuild.plan) })
      if (raw.action !== 'unknown') entry = planEntry(q, null)
    }
    if (!entry) entry = appEntry(q, parseAppIntent(q, { pageCityId: route.name === 'city' ? route.id : null }), 'rules')
    setLog((l) => [...l.slice(-11), entry])
    setBusy(false)
  }

  const settle = (id, patch) => setLog((l) => l.map((e) => (e.id === id ? { ...e, done: { ...(e.done || {}), ...patch } } : e)))
  const settlePlan = (id, status) => setLog((l) => l.map((e) => (e.id === id ? { ...e, status } : e)))
  const examples = onBuild ? [...EXAMPLES.slice(0, 3), APP_EXAMPLES[1], APP_EXAMPLES[5]] : APP_EXAMPLES

  return (
    <section
      id="ask-panel"
      className="ask-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ask-title"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <header className="ask-head">
        <h2 id="ask-title">Ask Eurowander</h2>
        <button type="button" className="link-btn" onClick={onClose} aria-label="Close the assistant">
          ✕
        </button>
      </header>
      <div className="ask-body">
        {log.length === 0 && (
          <div className="ask-intro">
            <p>
              I can plan a whole trip, change the trip you’ve built, suggest cities and places, open any page, save things to your trip, and explain how Eurowander works.
            </p>
            <p className="rule">
              {aiReady ? 'An AI reads your request; ' : ''}Eurowander’s own guide and planner supply every answer and number, and nothing in your trips changes until you press a button.
            </p>
          </div>
        )}
        <ul className="assistant-log" aria-live="polite">
          {log.map((e) => (
            <li key={e.id}>
              <p className="assistant-q">{e.q}</p>
              <div className="assistant-a">
                {e.via === 'ai' && <DataBadge kind="ai" />}
                {e.fallback && <p className="rule">The AI couldn’t answer just now, so the built-in rules read this.</p>}
                {e.reply && <p className="assistant-understood">{e.reply}</p>}
                {e.kind === 'plan' ? (
                  onBuild ? (
                    <PlanReply entry={e} plan={onBuild.plan} onApply={onBuild.apply} settle={settlePlan} />
                  ) : (
                    <p>{e.result.kind === 'proposal' ? 'This was for the trip on the Build page, which isn’t open now.' : e.result.text}</p>
                  )
                ) : (
                  <AppReply entry={e} run={run} settle={settle} />
                )}
              </div>
            </li>
          ))}
          {busy && <li className="rule">Thinking…</li>}
        </ul>
        <div ref={endRef} />
      </div>
      <div className="ask-foot">
        <form
          className="assistant-form"
          onSubmit={(ev) => {
            ev.preventDefault()
            ask(text)
          }}
        >
          <label htmlFor="ask-input" className="visually-hidden">
            Ask Eurowander
          </label>
          <input ref={inputRef} id="ask-input" type="text" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={onBuild ? 'e.g. Add a day in Rome' : 'e.g. Plan 10 days in Italy'} autoComplete="off" />
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
            Ask
          </button>
        </form>
        <div className="interest-chips ask-examples" aria-label="Examples">
          {examples.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => ask(ex)} disabled={busy}>
              {ex}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
