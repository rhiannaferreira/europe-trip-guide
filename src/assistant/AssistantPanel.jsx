import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../lib/analytics.js'
import { HASH_MODE, cityPath, navigate } from '../lib/router.jsx'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { TRIP_CHANGED, readSavedTrip, updateSavedTrip, withCity, withPlace } from '../lib/tripStore.js'
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { useAiReady } from '../builder/Assistant.jsx'
import { TRIP_PROMPTS, WELCOME_PROMPTS, parseAppIntent } from './appIntents.js'
import { appContext } from './appContext.js'
import Block, { Sources } from './blocks.jsx'
import { requestBuild, requestFocus, requestTab, requestTool, useAssistantBridge } from './bridge.js'
import { check, needsWeather, respond } from './copilot.js'
import { deleteChat, newChatId, readChats, saveChat } from './history.js'
import { dayName } from './tripRun.js'
import { openTripHandle, tripKey, tripMode } from './tripHandle.js'

const API = '/api/assistant'
const PLANNER_PAGES = ['explore', 'city', 'country', 'trip']
const FORECAST_REACH_DAYS = 15
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const narrow = () => window.innerWidth <= 700
// The message box grows with what's typed, up to a few lines.
const fit = (el) => {
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight + 2, 140)}px`
}
const readFlags = () => readJSON(KEYS.copilot, {}) || {}
const writeFlags = (patch) => writeJSON(KEYS.copilot, { ...readFlags(), ...patch })

// The AI reads the request into one action (never facts, never a change). Returns { action } or { error }.
async function readWithAi(message, context) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: 'offline' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, context, scope: 'app' }), signal: controller.signal })
    if (r.status === 429) return { error: 'rate' }
    if (!r.ok) return { error: 'failed' }
    const data = await r.json()
    return data?.action ? { action: data.action } : { error: 'failed' }
  } catch {
    return { error: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'failed' }
  } finally {
    clearTimeout(timer)
  }
}

const AI_NOTES = {
  offline: 'You seem to be offline, so I read this with the built-in rules.',
  rate: 'Lots of questions at once, so I read this one with the built-in rules.',
  failed: 'The AI didn’t answer just now, so I read this with the built-in rules.',
}

// Live weather for My trip's days within forecast reach (the Build page already has its own).
async function tripWeather(handle, today) {
  const horizon = new Date(`${today}T00:00:00`)
  horizon.setDate(horizon.getDate() + FORECAST_REACH_DAYS)
  const days = handle.days
    .filter((d) => d.date && d.date >= today && new Date(`${d.date}T00:00:00`) <= horizon)
    .map((d) => ({ number: d.number, cityId: d.cityId, city: cityById[d.cityId], date: new Date(`${d.date}T00:00:00`) }))
  if (!days.length) return { byDay: {}, failed: false }
  try {
    const { loadTripWeather } = await import('../lib/weather.js')
    const r = await Promise.race([loadTripWeather(days), new Promise((resolve) => setTimeout(() => resolve(null), 10000))])
    if (!r) return { byDay: {}, failed: true }
    return { byDay: r.byDay, failed: r.failed === r.total }
  } catch {
    return { byDay: {}, failed: true }
  }
}

function Intro({ onDone }) {
  return (
    <div className="cp-intro">
      <h3>👋 Meet EuroWander</h3>
      <p>Your Europe travel copilot. I can:</p>
      <ul>
        <li>🗺️ Plan a trip from a few words</li>
        <li>🚆 Find train routes and cut travel time</li>
        <li>💎 Suggest hidden gems and quieter cities</li>
        <li>💰 Keep your trip on budget</li>
        <li>📅 Plan each day, and work around rain</li>
      </ul>
      <p className="cp-sub">Facts and numbers come from Eurowander’s own guide and planner. Nothing in your trip changes until you press Apply.</p>
      <button type="button" className="btn btn-primary cp-btn" onClick={onDone}>
        Let’s go
      </button>
    </div>
  )
}

function History({ chats, current, onOpen, onDelete, onBack }) {
  return (
    <div className="cp-history">
      <div className="cp-history-head">
        <h3>Recent chats</h3>
        <button type="button" className="chip cp-chip" onClick={onBack}>
          Back to chat
        </button>
      </div>
      {chats.length === 0 ? (
        <p className="cp-sub">No saved chats yet. They’re kept in this browser only.</p>
      ) : (
        <ul>
          {chats.map((c) => (
            <li key={c.id} className={c.id === current ? 'current' : ''}>
              <button type="button" className="cp-history-open" onClick={() => onOpen(c)}>
                <strong>{c.title}</strong>
                <span className="cp-sub">{new Date(c.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </button>
              <button type="button" className="link-btn cp-icon-btn" aria-label={`Delete chat: ${c.title}`} onClick={() => onDelete(c.id)}>
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="cp-sub">Chats are saved in this browser, not in your account.</p>
    </div>
  )
}

// The travel copilot. A request is read (by the AI when it's set up, otherwise by the built-in rules) into
// one checked action; Eurowander's data and planner work out the answer, as text plus cards. Changes to a
// trip are proposed with a before/after preview and only applied, through the trip handle, when the
// traveller presses Apply.
export default function AssistantPanel({ route, open, onClose }) {
  const aiReady = useAiReady()
  const builder = useAssistantBridge((s) => s.builder)
  const [tripVersion, setTripVersion] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState([])
  const [chatId, setChatId] = useState(newChatId)
  const [view, setView] = useState('chat')
  const [chats, setChats] = useState(readChats)
  const [introSeen, setIntroSeen] = useState(() => Boolean(readFlags().introSeen))
  const memory = useRef({})
  const weatherCache = useRef({})
  const inputRef = useRef(null)
  const endRef = useRef(null)
  const today = todayIso()
  const pageCityId = route.name === 'city' ? route.id : null

  // The open trip, kept current as it changes elsewhere (the planner, the Build page, another tab).
  useEffect(() => {
    const bump = () => setTripVersion((v) => v + 1)
    window.addEventListener(TRIP_CHANGED, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(TRIP_CHANGED, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])
  const handle = useMemo(() => {
    try {
      return openTripHandle({ route, builder, trip: readSavedTrip() })
    } catch {
      return null
    }
  }, [route.name, builder, tripVersion]) // eslint-disable-line react-hooks/exhaustive-deps
  const currentKey = tripKey(handle)
  const handleRef = useRef(handle)
  handleRef.current = handle

  useEffect(() => {
    if (open && view === 'chat') setTimeout(() => inputRef.current?.focus(), 30)
  }, [open, view])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [entries.length, busy])
  useEffect(() => {
    if (entries.length) setChats(saveChat(chatId, entries))
  }, [entries, chatId])

  const mark = (entryId, key, note) => setEntries((l) => l.map((e) => (e.id === entryId ? { ...e, done: { ...(e.done || {}), [key]: note } } : e)))
  const closeOnPhone = () => narrow() && onClose()

  // What a button in the chat does. Returns a short note to show in place of the button, or null.
  const run = (effect, entryId) => {
    const h = handleRef.current
    switch (effect?.type) {
      case 'navigate':
        navigate(effect.to)
        if (effect.tab) requestTab(effect.tab)
        window.scrollTo(0, 0)
        closeOnPhone()
        return null
      case 'tool':
        requestTool(effect.cities ? { name: effect.tool, cities: effect.cities } : effect.tool)
        if (!PLANNER_PAGES.includes(route.name)) navigate('/explore')
        closeOnPhone()
        return null
      case 'map': {
        const cityId = effect.placeId ? placeById[effect.placeId]?.cityId : effect.cityId
        if (!cityId) return null
        requestFocus({ cityId, placeId: effect.placeId || null })
        if (!PLANNER_PAGES.includes(route.name)) navigate(cityPath(cityId))
        closeOnPhone()
        return null
      }
      case 'add_city':
        updateSavedTrip((t) => withCity(t, effect.cityId))
        track('chat_city_added', { city: effect.cityId })
        return { short: 'Added to My trip' }
      case 'add_cities':
        updateSavedTrip((t) => effect.cityIds.reduce(withCity, t))
        track('chat_city_added', { count: effect.cityIds.length })
        return { short: 'Added to My trip' }
      case 'save_place':
        updateSavedTrip((t) => withPlace(t, effect.placeId))
        track('chat_place_saved', { category: placeById[effect.placeId]?.category || 'other' })
        return { short: 'Saved' }
      case 'add_to_day': {
        const day = h?.days.find((d) => d.number === effect.day)
        const place = placeById[effect.placeId]
        if (!day || !place || day.cityId !== place.cityId) return null
        const days = h.days.map((d) => (d === day ? { ...d, items: [...d.items, { slot: 'afternoon', placeId: place.id, label: place.name, reasons: ['Added from the assistant'] }] } : d))
        h.apply(h.plan, { days, message: `Added ${place.name} to day ${day.number}` })
        track('chat_trip_change_applied', { action: 'add_to_day', trip: h.kind })
        return { short: `Added to ${dayName(day)}` }
      }
      case 'build':
        requestBuild(effect.input)
        if (route.name !== 'build') navigate('/build')
        window.scrollTo(0, 0)
        track('chat_trip_change_applied', { action: 'build_trip', trip: 'built' })
        closeOnPhone()
        return { short: 'Built on the Build page' }
      case 'ask':
        send(effect.prompt, { force: effect.force, source: 'follow_up' })
        return null
      case 'dismiss':
        if (entryId) mark(entryId, 'dismiss', { short: 'Kept' })
        return null
      default:
        return null
    }
  }

  const applyOption = (entry, blockId, index, option) => {
    const h = handleRef.current
    const block = entry.result.blocks.find((b, i) => `b${i}` === blockId)
    if (!h || !option.plan || tripKey(h) !== block?.key) return
    let undo
    if (h.kind === 'saved') {
      const before = readSavedTrip()
      undo = () => updateSavedTrip(() => before)
    } else {
      const { plan, days } = h
      undo = () => handleRef.current?.kind === 'built' && handleRef.current.apply(plan, { days, message: 'Undid the assistant’s change' })
    }
    h.apply(option.plan, { days: option.days, message: option.title })
    track('chat_trip_change_applied', { action: entry.action || 'change', trip: h.kind, option: index + 1 })
    mark(entry.id, `${blockId}:applied`, { option: index, undo, short: 'Applied' })
  }

  async function send(message, { force = false, source = 'typed' } = {}) {
    const q = String(message || '').trim().slice(0, 500)
    if (!q || busy) return
    setBusy(true)
    setText('')
    if (inputRef.current) inputRef.current.style.height = ''
    setView('chat')
    if (source !== 'typed') track('chat_quick_action_used', { source })
    const h = handleRef.current
    const ctx = { handle: h, pageCityId, memory: memory.current, today, force, builderInput: builder?.input || readJSON(KEYS.builder)?.input }
    let via = 'rules'
    let note = ''
    let checked = null
    if (aiReady && !force) {
      const r = await readWithAi(q, appContext({ route, handle: h, today, memory: memory.current }))
      if (r.action) {
        const c = check(r.action, ctx)
        // The AI's reading wins unless it couldn't place the request; then the rules get a go.
        if (c.ok ? c.action.action !== 'unknown' : c.noTrip || c.needsDates) {
          checked = c
          via = 'ai'
        }
      } else {
        note = AI_NOTES[r.error] || ''
        track('chat_error', { kind: r.error })
      }
    }
    if (!checked) checked = check(parseAppIntent(q, ctx), ctx)
    let weatherByDay = h?.weatherByDay || {}
    let weatherFailed = false
    if (checked.ok && h?.kind === 'saved' && needsWeather(checked.action)) {
      const key = currentKey
      if (!weatherCache.current[key]) weatherCache.current[key] = await tripWeather(h, today)
      weatherByDay = weatherCache.current[key].byDay
      weatherFailed = weatherCache.current[key].failed
      if (weatherFailed) delete weatherCache.current[key]
    }
    const result = respond(checked, { ...ctx, weatherByDay })
    if (weatherFailed) result.note = 'I couldn’t reach the weather service just now, so this uses seasonal information.'
    else if (note) result.note = note
    const action = checked.ok ? checked.action.action : 'invalid'
    const reply = via === 'ai' && checked.ok ? checked.action.reply : ''
    memory.current = {
      ...memory.current,
      ...(result.memory || {}),
      exchanges: [...(memory.current.exchanges || []), { q: q.slice(0, 160), a: String(result.text || '').slice(0, 200) }].slice(-3),
    }
    track('chat_message_sent', { via, action, trip: h?.kind || 'none', mode: tripMode(h, today) })
    if (result.tone === 'error') track('chat_error', { kind: 'answer', action })
    const options = result.blocks?.find((b) => b.type === 'options')
    if (options) track('chat_trip_change_proposed', { action, options: options.options.length, trip: h.kind })
    const entry = { id: `${Date.now()}`, q, via, action, reply, result, done: {} }
    setEntries((l) => [...l, entry].slice(-40))
    setBusy(false)
    if (result.now) run(result.now, entry.id)
  }

  const newChat = () => {
    setEntries([])
    setChatId(newChatId())
    memory.current = {}
    setView('chat')
    setTimeout(() => inputRef.current?.focus(), 30)
  }
  const openChat = (c) => {
    setEntries(c.entries)
    setChatId(c.id)
    memory.current = {}
    setView('chat')
  }
  const removeChat = (id) => {
    setChats(deleteChat(id))
    if (id === chatId) newChat()
  }
  const finishIntro = () => {
    writeFlags({ introSeen: true })
    setIntroSeen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  // One gentle suggestion for the open trip, shown on the welcome screen only.
  const hint = useMemo(() => {
    if (!open || !handle || entries.length) return null
    try {
      const r = respond({ ok: true, action: { action: 'trip_question', question: 'next_step' } }, { handle, today, weatherByDay: {}, memory: {} })
      return /good shape/.test(r.text) ? null : r
    } catch {
      return null
    }
  }, [open, handle, entries.length, today])

  const modeWord = { planning: 'Planning', editing: 'Your trip', traveling: 'Travelling' }[tripMode(handle, today)]
  const followUpButton = (f, e) => (
    <button key={f.label} type="button" className="chip cp-chip" disabled={busy} onClick={() => (f.prompt ? send(f.prompt, { source: 'follow_up' }) : run(f.effect, e?.id))}>
      {f.label}
    </button>
  )

  return (
    <section
      id="ask-panel"
      className="ask-panel cp-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ask-title"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="cp-head">
        <button type="button" className="link-btn cp-icon-btn cp-back" onClick={onClose} aria-label="Back">
          ←
        </button>
        <div className="cp-brand">
          <h2 id="ask-title">✨ EuroWander</h2>
          <p>Your Europe Travel Copilot</p>
        </div>
        <div className="cp-head-actions">
          <button type="button" className="link-btn cp-icon-btn" onClick={newChat} aria-label="New chat" title="New chat">
            ✎
          </button>
          <button type="button" className="link-btn cp-icon-btn" onClick={() => setView(view === 'history' ? 'chat' : 'history')} aria-label="Chat history" aria-pressed={view === 'history'} title="Recent chats">
            🕘
          </button>
          <button type="button" className="link-btn cp-icon-btn cp-close" onClick={onClose} aria-label="Close the assistant" title="Close">
            ✕
          </button>
        </div>
      </header>
      {handle && (
        <div className="cp-trip">
          <span>
            {modeWord}: <strong>{handle.name || handle.title}</strong>
          </span>
          {handle.dates && <span className="cp-sub">{handle.dates}</span>}
        </div>
      )}

      <div className="cp-body">
        {view === 'history' ? (
          <History chats={chats} current={chatId} onOpen={openChat} onDelete={removeChat} onBack={() => setView('chat')} />
        ) : (
          <>
            {entries.length === 0 &&
              (!introSeen ? (
                <Intro onDone={finishIntro} />
              ) : (
                <div className="cp-welcome">
                  <h3>{handle ? 'Welcome back 👋' : 'Where to next? 🌍'}</h3>
                  <p className="cp-sub">{handle ? `Ask me anything about ${handle.kind === 'built' ? 'the trip you’re building' : 'your trip'}, or pick one:` : 'Ask me anything about travelling in Europe, or pick one:'}</p>
                  <div className="cp-prompts">
                    {(handle ? TRIP_PROMPTS : WELCOME_PROMPTS).map((p) => (
                      <button key={p.label} type="button" className="cp-prompt" onClick={() => send(p.prompt, { source: 'welcome' })} disabled={busy}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {hint && (
                    <div className="cp-hint">
                      <p>💡 {hint.text}</p>
                      {hint.followUps?.length > 0 && <div className="cp-actions">{hint.followUps.slice(0, 2).map((f) => followUpButton(f))}</div>}
                    </div>
                  )}
                </div>
              ))}
            <ul className="cp-log" aria-live="polite">
              {entries.map((e) => {
                const r = e.result
                const env = {
                  handle,
                  tripKey: currentKey,
                  done: e.done,
                  run: (effect) => run(effect, e.id),
                  mark: (key, n) => mark(e.id, key, n),
                  applyOption: (blockId, i, o) => applyOption(e, blockId, i, o),
                }
                return (
                  <li key={e.id}>
                    <p className="cp-q">{e.q}</p>
                    <div className={`cp-a${r.tone ? ` cp-${r.tone}` : ''}`}>
                      {r.note && <p className="cp-note">{r.note}</p>}
                      {e.reply && <p className="cp-understood">{e.reply}</p>}
                      {r.text && <p>{r.text}</p>}
                      {(r.blocks || []).map((b, i) =>
                        b.restored && (b.type === 'options' || b.type === 'build') ? (
                          <p key={i} className="cp-sub">
                            {b.type === 'options' ? `${b.options.length} option${b.options.length === 1 ? '' : 's'} were suggested here. Ask again to see them for your trip now.` : 'A trip was suggested here. Ask again to build it.'}
                          </p>
                        ) : (
                          <Block key={i} id={`b${i}`} block={b} env={env} />
                        ),
                      )}
                      {(() => {
                        // Once an option is applied or the trip is kept, "Keep current trip" has done its job.
                        const settled = e.done?.dismiss || Object.keys(e.done || {}).some((k) => k.endsWith(':applied'))
                        const follow = (r.followUps || []).filter((f) => !(settled && f.effect?.type === 'dismiss'))
                        return follow.length > 0 && <div className="cp-follow">{follow.map((f) => followUpButton(f, e))}</div>
                      })()}
                      <Sources sources={r.sources} ai={e.via === 'ai'} />
                    </div>
                  </li>
                )
              })}
              {busy && (
                <li className="cp-typing" aria-label="EuroWander is thinking">
                  <span />
                  <span />
                  <span />
                </li>
              )}
            </ul>
            <div ref={endRef} />
          </>
        )}
      </div>

      <form
        className="cp-foot"
        onSubmit={(ev) => {
          ev.preventDefault()
          send(text)
        }}
      >
        <label htmlFor="ask-input" className="visually-hidden">
          Ask EuroWander
        </label>
        <textarea
          ref={inputRef}
          id="ask-input"
          rows={1}
          maxLength={500}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            fit(e.target)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(text)
            }
          }}
          placeholder="Ask EuroWander anything..."
          autoComplete="off"
        />
        <button type="submit" className="cp-send" disabled={busy || !text.trim()} aria-label="Send">
          ➤
        </button>
      </form>
      {!aiReady && !HASH_MODE && <p className="visually-hidden">Answers use Eurowander’s built-in rules.</p>}
    </section>
  )
}
