import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../lib/analytics.js'
import { HASH_MODE, cityPath, navigate } from '../lib/router.jsx'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { TRIP_CHANGED, readSavedTrip, updateSavedTrip, withCity, withPlace } from '../lib/tripStore.js'
import { cityById } from '../data/cities.js'
import { placeById, placesInCity } from '../data/places.js'
import { useAiReady } from '../builder/Assistant.jsx'
import { TRIP_PROMPTS, WELCOME_PROMPTS, parseAppIntent } from './appIntents.js'
import { appContext } from './appContext.js'
import { formatMessage } from './aiAnswer.js'
import { readAction, streamAnswer } from './aiClient.js'
import { buildAIContext, focusCities, isFactAction, needsAiAnswer } from './aiContext.js'
import Block, { Sources } from './blocks.jsx'
import { requestBuild, requestFocus, requestTab, requestTool, useAssistantBridge } from './bridge.js'
import { check, needsWeather, respond } from './copilot.js'
import { deleteChat, newChatId, readChats, saveChat } from './history.js'
import { whyLabels } from './appRun.js'
import { dayName } from './tripRun.js'
import { openTripHandle, tripKey, tripMode } from './tripHandle.js'

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

const AI_NOTES = {
  offline: 'You seem to be offline, so I’m answering from Eurowander’s own data.',
  rate: 'Lots of questions at once, so I answered this one from Eurowander’s own data.',
  failed: 'I’m having trouble reaching the travel assistant right now, but I can still help with your trip and Eurowander’s guide.',
}
const timeOfDay = () => {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'
}

// More real places for a city from OpenStreetMap, for questions about places there (best effort, a few seconds).
async function morePlaces(cityId) {
  const city = cityById[cityId]
  if (!city) return false
  try {
    const { loadOsmPlaces } = await import('../lib/osmPlaces.js')
    const list = await Promise.race([loadOsmPlaces(city), new Promise((resolve) => setTimeout(() => resolve(null), 6000))])
    return Boolean(list?.length)
  } catch {
    return false
  }
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

// The AI's reply: short paragraphs, bullets and bold, rendered as text (never as HTML).
function AiText({ text, streaming }) {
  return (
    <div className={`cp-ai${streaming ? ' cp-streaming' : ''}`}>
      {formatMessage(text).map((b, i) =>
        b.type === 'list' ? (
          <ul key={i}>
            {b.items.map((spans, k) => (
              <li key={k}>
                <Spans spans={spans} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Spans spans={b.spans} />
          </p>
        ),
      )}
    </div>
  )
}
const Spans = ({ spans }) => spans.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))

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
    // Saved once each answer has finished arriving.
    if (entries.length && !entries.some((e) => e.ai?.status === 'streaming')) setChats(saveChat(chatId, entries))
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

  const patch = (id, fn) => setEntries((l) => l.map((e) => (e.id === id ? fn(e) : e)))

  // One message, end to end:
  //   1. read it: plain facts (a budget total, a train time, opening a page) by the built-in rules and
  //      Eurowander's data alone; anything else by the AI, into one action the app checks
  //   2. work it out from Eurowander's data, live weather and places, and the planner (cards, numbers,
  //      proposed changes); nothing changes until Apply
  //   3. the AI writes the reply from that verified data, streamed in; if it can't, the app's own answer shows
  async function send(message, { force = false, source = 'typed' } = {}) {
    const q = String(message || '').trim().slice(0, 500)
    if (!q || busy) return
    setBusy(true)
    setText('')
    if (inputRef.current) inputRef.current.style.height = ''
    setView('chat')
    if (source !== 'typed') track('chat_quick_action_used', { source })
    const h = handleRef.current
    const mem = memory.current
    const ctx = { handle: h, pageCityId, memory: mem, today, force, builderInput: builder?.input || readJSON(KEYS.builder)?.input }
    const rules = check(parseAppIntent(q, ctx), ctx)
    let checked = null
    let via = 'rules'
    let note = ''
    let gap = ''
    let aiOk = false
    // Short factual requests skip the AI; anything longer may carry nuance the rules would miss.
    if (force || (rules.ok && isFactAction(rules.action) && q.split(/\s+/).length <= 12)) checked = rules
    else if (aiReady) {
      const r = await readAction(q, appContext({ route, handle: h, today, memory: mem }))
      if (r.action) {
        aiOk = true
        via = 'ai'
        checked = check(r.action, ctx)
        // Something the app has no action or data for (a city it doesn't cover, say): an open question.
        const uncovered = !checked.ok && /isn’t one of Eurowander’s|couldn’t find/.test(checked.error)
        if (uncovered || (checked.ok && checked.action.action === 'unknown')) {
          if (uncovered) gap = checked.error
          checked = check({ ...r.action, action: 'open_question' }, ctx)
        }
      } else {
        note = AI_NOTES[r.error] || AI_NOTES.failed
        track('chat_error', { kind: `read_${r.error}` })
      }
    }
    if (!checked) checked = rules

    // Live data the answer needs: the trip's weather, and more places in the city in question.
    let weatherByDay = h?.weatherByDay || {}
    let weatherFailed = false
    const act = checked.ok ? checked.action : null
    const jobs = []
    if (act && h?.kind === 'saved' && needsWeather(act, q)) {
      const key = currentKey
      jobs.push(
        (weatherCache.current[key] ||= tripWeather(h, today)).then((w) => {
          weatherByDay = w.byDay
          weatherFailed = w.failed
          if (w.failed) delete weatherCache.current[key]
        }),
      )
    }
    const placeCity = act && ['places_near', 'suggest_places', 'open_question', 'plan_day'].includes(act.action) ? focusCities({ action: act, handle: h, today, pageCityId, memory: mem, message: q })[0] : null
    if (placeCity) jobs.push(morePlaces(placeCity))
    await Promise.all(jobs)

    const result = respond(checked, { ...ctx, weatherByDay })
    if (weatherFailed) result.note = 'I couldn’t reach the weather service just now, so this uses seasonal information.'
    else if (note && (!checked.ok || checked.action.action !== 'open_question')) result.note = note
    const action = act ? act.action : 'invalid'
    const compose = aiOk && needsAiAnswer(act, result)
    track('chat_message_sent', { via, action, ai_answer: compose, trip: h?.kind || 'none', mode: tripMode(h, today) })
    if (result.tone === 'error') track('chat_error', { kind: 'answer', action })
    const options = result.blocks?.find((b) => b.type === 'options')
    if (options) track('chat_trip_change_proposed', { action, options: options.options.length, trip: h.kind })
    const id = `${Date.now()}`
    memory.current = { ...mem, ...(result.memory || {}) }
    setEntries((l) => [...l, { id, q, via, action, reply: '', result, done: {}, ai: compose ? { status: 'streaming', text: '' } : null }].slice(-40))
    if (result.now) run(result.now, id)

    let shown = String(result.text || '')
    if (compose) {
      const aiCtx = buildAIContext({ message: q, action: act, result, handle: h, memory: mem, today, timeOfDay: timeOfDay(), pageCityId, weatherByDay, weatherFailed, note: gap })
      // Cards can only be drawn for places the AI was shown: those in the cities in question, and the answer's own.
      const placeIds = [
        ...focusCities({ action: act, handle: h, today, pageCityId, memory: mem, message: q }).flatMap((c) => placesInCity(c).map((p) => p.id)),
        ...(result.blocks || []).filter((b) => b.type === 'places').flatMap((b) => b.items.map((i) => i.placeId)),
      ]
      const r = await streamAnswer(q, aiCtx, { placeIds, onText: (t) => patch(id, (e) => ({ ...e, ai: { status: 'streaming', text: t } })) })
      if (r.answer) {
        const ans = r.answer
        shown = ans.message
        const has = (type) => (result.blocks || []).some((b) => b.type === type)
        const open = act.action === 'open_question'
        // The AI's picks become cards when the app hasn't already shown cards of that kind.
        const blocks = [
          ...(open ? (result.blocks || []).filter((b) => b.type !== 'cities') : result.blocks || []),
          ...(ans.cities.length && (open || !has('cities')) ? [{ type: 'cities', items: ans.cities.map((c) => ({ cityId: c, why: whyLabels(cityById[c], { interests: act.interests || [], month: act.month, hiddenGems: act.hiddenGems }), train: null })) }] : []),
          ...(ans.places.length && !has('places') ? [{ type: 'places', items: ans.places.map((placeId) => ({ placeId })) }] : []),
        ]
        const followUps = [...ans.followUps, ...(result.followUps || [])].filter((f, i, all) => all.findIndex((x) => x.label === f.label) === i).slice(0, 5)
        const shownIds = [...ans.cities, ...ans.places]
        if (shownIds.length) memory.current = { ...memory.current, lastList: shownIds, anchorCity: ans.cities[0] || memory.current.anchorCity }
        patch(id, (e) => ({ ...e, ai: { status: 'done', text: ans.message, generalKnowledge: ans.generalKnowledge }, result: { ...e.result, blocks, followUps } }))
      } else {
        track('chat_error', { kind: `answer_${r.error}` })
        patch(id, (e) => ({ ...e, ai: { status: 'failed' }, result: { ...e.result, note: act.action === 'open_question' ? AI_NOTES[r.error] || AI_NOTES.failed : e.result.note } }))
      }
    }
    memory.current = { ...memory.current, exchanges: [...(mem.exchanges || []), { q: q.slice(0, 160), a: shown.slice(0, 300) }].slice(-3) }
    setBusy(false)
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
                const ai = e.ai?.status === 'streaming' || e.ai?.status === 'done' ? e.ai : null
                // An open question's own cards wait for the AI's picks (they're only the fallback).
                const holdCards = e.ai?.status === 'streaming' && e.action === 'open_question'
                return (
                  <li key={e.id} aria-busy={e.ai?.status === 'streaming'}>
                    <p className="cp-q">{e.q}</p>
                    <div className={`cp-a${r.tone ? ` cp-${r.tone}` : ''}`}>
                      {r.note && <p className="cp-note">{r.note}</p>}
                      {e.reply && <p className="cp-understood">{e.reply}</p>}
                      {ai ? (
                        ai.text ? (
                          <AiText text={ai.text} streaming={ai.status === 'streaming'} />
                        ) : (
                          <span className="cp-typing cp-typing-inline" aria-label="EuroWander is writing">
                            <span />
                            <span />
                            <span />
                          </span>
                        )
                      ) : (
                        r.text && <p>{r.text}</p>
                      )}
                      {!holdCards && (r.blocks || []).map((b, i) =>
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
                      {e.ai?.status !== 'streaming' && <Sources sources={[...(r.sources || []), ...(e.ai?.generalKnowledge ? ['knowledge'] : [])]} ai={e.via === 'ai'} />}
                    </div>
                  </li>
                )
              })}
              {busy && !entries.some((e) => e.ai?.status === 'streaming') && (
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
