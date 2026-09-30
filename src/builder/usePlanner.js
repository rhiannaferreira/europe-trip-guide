import { useEffect, useMemo, useState } from 'react'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { planDays } from '../planner/dayPlanner.js'
import { generatePlan } from '../planner/route.js'
import { defaultPreferences } from '../planner/preferences.js'
import { cityById } from '../data/cities.js'

// The trip builder's state, kept in this browser (travel-app-builder) so a reload or a trip to another
// page doesn't lose the plan being worked on.
//
//   input        the form as typed (every field optional; see planner/preferences.js for defaults)
//   plan         the generated plan, or null
//   notes        what normalizing the form changed or couldn't use
//   history      earlier plans, newest last, for Undo (at most HISTORY)
//   message      what the last change did
//   daysPlanned  whether "Plan my days" has been pressed
//   dayEdits     day plans changed by hand (lighter day, rain swaps), for the plan they were made on
const HISTORY = 20
const VERSION = 1

const planKey = (plan) => (plan ? `${plan.prefs.startDate}|${plan.prefs.transport}|${plan.prefs.pace}|${plan.stops.map((s) => `${s.cityId}:${s.nights}`).join(',')}` : '')

function validPlan(plan) {
  return Boolean(plan && plan.version === 1 && plan.prefs && Array.isArray(plan.stops) && plan.stops.length && plan.stops.every((s) => cityById[s?.cityId] && Number.isInteger(s.nights)))
}

function load() {
  const saved = readJSON(KEYS.builder)
  const empty = { version: VERSION, input: defaultPreferences(), plan: null, notes: [], history: [], message: '', daysPlanned: false, dayEdits: null }
  if (!saved || saved.version !== VERSION) return empty
  return {
    ...empty,
    input: { ...empty.input, ...(saved.input || {}) },
    plan: validPlan(saved.plan) ? saved.plan : null,
    notes: Array.isArray(saved.notes) ? saved.notes : [],
    history: Array.isArray(saved.history) ? saved.history.filter(validPlan).slice(-HISTORY) : [],
    daysPlanned: Boolean(saved.daysPlanned),
    dayEdits: saved.dayEdits && typeof saved.dayEdits.key === 'string' && Array.isArray(saved.dayEdits.days) ? saved.dayEdits : null,
  }
}

export function usePlanner() {
  const [state, setState] = useState(load)
  useEffect(() => writeJSON(KEYS.builder, state), [state])

  const { plan } = state
  const key = planKey(plan)
  // Day plans follow the plan; hand edits last until the plan itself changes.
  const days = useMemo(() => {
    if (!plan) return []
    if (state.dayEdits?.key === key) return state.dayEdits.days
    return planDays(plan)
  }, [key, state.dayEdits]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    days,
    canUndo: state.history.length > 0,
    setInput: (patch) => setState((s) => ({ ...s, input: { ...s.input, ...patch } })),
    resetInput: () => setState((s) => ({ ...s, input: defaultPreferences() })),

    // Make a fresh plan from the form. Returns the result so the page can report on it.
    generate: (input = state.input, { exclude = [] } = {}) => {
      const result = generatePlan(input, { exclude })
      setState((s) => ({
        ...s,
        input,
        plan: result.plan,
        notes: result.notes,
        history: s.plan ? [...s.history, s.plan].slice(-HISTORY) : s.history,
        message: '',
        dayEdits: null,
      }))
      return result
    },

    // Take a changed plan (from modify.js, a warning fix or the assistant), and optionally changed day plans.
    apply: (nextPlan, { message = '', days: nextDays = null } = {}) =>
      setState((s) => ({
        ...s,
        plan: nextPlan,
        history: nextPlan !== s.plan && s.plan ? [...s.history, s.plan].slice(-HISTORY) : s.history,
        message,
        dayEdits: nextDays ? { key: planKey(nextPlan), days: nextDays } : nextPlan === s.plan ? s.dayEdits : null,
        daysPlanned: s.daysPlanned || Boolean(nextDays),
      })),

    undo: () =>
      setState((s) => {
        if (!s.history.length) return s
        return { ...s, plan: s.history[s.history.length - 1], history: s.history.slice(0, -1), message: 'Undid the last change.', dayEdits: null }
      }),

    planMyDays: () => setState((s) => ({ ...s, daysPlanned: true })),
    resetDays: () => setState((s) => ({ ...s, dayEdits: null, message: 'Day plans rebuilt from the route.' })),
    clearMessage: () => setState((s) => ({ ...s, message: '' })),
    startOver: () => setState((s) => ({ ...s, plan: null, notes: [], history: [], message: '', daysPlanned: false, dayEdits: null })),
  }
}
