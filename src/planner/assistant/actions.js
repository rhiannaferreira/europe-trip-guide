// The only things the trip assistant can ask for, and the check every request goes through.
//
// The assistant (rules in intents.js, or the AI model behind /api/assistant) never changes the trip
// itself. It produces one of these actions; validateAction checks it against the current plan; the
// deterministic planner (modify.js, dayPlanner.js) works out the change; the traveller sees it and
// confirms. Anything that doesn't pass validation is dropped.
import { cityById, cities } from '../../data/cities.js'
import { BUILDER_INTERESTS } from '../preferences.js'

export const ACTIONS = [
  'replace_city',
  'add_city',
  'remove_city',
  'change_nights',
  'optimize_route',
  'make_relaxed',
  'reduce_travel',
  'make_cheaper',
  'more_gems',
  'more_interest',
  'lighten_day',
  'rain_plan',
  'move_category_to_day',
  'answer',
  'unknown',
]
export const QUESTIONS = ['busiest_day', 'most_expensive', 'travel_time', 'why_city', 'weather', 'budget_fit', 'pace']
export const INTEREST_IDS = BUILDER_INTERESTS.map((i) => i.id)

// JSON schema for the AI model's structured output. Every field is always present: '' or 'none' for
// unused text fields, null for unused numbers.
export const ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'targetCity', 'city', 'day', 'nights', 'delta', 'interest', 'question', 'lessTouristy', 'cheaper', 'maxAdditionalTravelMinutes', 'reply'],
  properties: {
    action: { type: 'string', enum: ACTIONS },
    targetCity: { type: 'string', description: 'A city already in the trip that the request is about, or empty' },
    city: { type: 'string', description: 'A city to add or to use as the replacement, when the traveller named one, or empty' },
    day: { type: ['integer', 'null'], description: 'Trip day number (1-based)' },
    nights: { type: ['integer', 'null'] },
    delta: { type: ['integer', 'null'], description: 'Change in nights, e.g. 1 or -1' },
    interest: { type: 'string', enum: [...INTEREST_IDS, 'none'] },
    question: { type: 'string', enum: [...QUESTIONS, 'none'] },
    lessTouristy: { type: 'boolean' },
    cheaper: { type: 'boolean' },
    maxAdditionalTravelMinutes: { type: ['integer', 'null'] },
    reply: { type: 'string', description: 'One short sentence for the traveller; no facts, prices or times' },
  },
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const cityByName = Object.fromEntries(cities.flatMap((c) => [[fold(c.name), c.id], [c.id, c.id]]))
export const resolveCity = (value) => (value ? cityByName[fold(value)] || null : null)
// '' and 'none' mean "not given".
const given = (v) => v !== undefined && v !== null && v !== '' && v !== 'none'

const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null)

// Checks a raw action (from rules or the AI) against the plan.
// Returns { ok: true, action } with cities as ids and stop indexes filled in, or { ok: false, error }.
export function validateAction(raw, { plan, dayCount }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Not an action' }
  if (!ACTIONS.includes(raw.action)) return { ok: false, error: `Unknown action “${String(raw.action).slice(0, 40)}”` }
  raw = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, given(v) ? v : null]))
  const ids = plan.stops.map((s) => s.cityId)
  const a = { action: raw.action, reply: typeof raw.reply === 'string' ? raw.reply.slice(0, 300) : '' }

  const target = resolveCity(raw.targetCity)
  const needsTarget = ['replace_city', 'remove_city', 'change_nights'].includes(a.action)
  if (needsTarget) {
    if (!target || !ids.includes(target)) return { ok: false, error: raw.targetCity ? `${String(raw.targetCity).slice(0, 40)} isn’t in this trip` : 'Which city?' }
    a.targetCity = target
    a.index = ids.indexOf(target)
  } else if (target && ids.includes(target)) {
    a.targetCity = target
    a.index = ids.indexOf(target)
  }

  if (a.action === 'add_city' || a.action === 'replace_city') {
    const city = resolveCity(raw.city)
    if (raw.city && !city) return { ok: false, error: `${String(raw.city).slice(0, 40)} isn’t one of Eurowander’s cities yet` }
    if (city && ids.includes(city)) return { ok: false, error: `${cityById[city].name} is already in the trip` }
    a.city = city
    if (a.action === 'add_city') a.nights = int(raw.nights, 1, 14)
  }
  if (a.action === 'change_nights') {
    a.delta = int(raw.delta, -10, 10)
    a.nights = int(raw.nights, 0, 30)
    if (a.delta === null && a.nights === null) a.delta = 1
    if (a.delta === 0) return { ok: false, error: 'No change in nights' }
  }
  if (['lighten_day', 'move_category_to_day', 'rain_plan'].includes(a.action) || (a.action === 'answer' && raw.day != null)) {
    a.day = int(raw.day, 1, Math.max(1, dayCount))
    if (raw.day != null && a.day === null) return { ok: false, error: 'That day isn’t in this trip' }
    if (['lighten_day', 'move_category_to_day'].includes(a.action) && a.day === null) return { ok: false, error: 'Which day?' }
  }
  if (a.action === 'more_interest') {
    if (!INTEREST_IDS.includes(raw.interest)) return { ok: false, error: 'Which interest?' }
    a.interest = raw.interest
  }
  if (a.action === 'answer') {
    if (!QUESTIONS.includes(raw.question)) return { ok: false, error: 'Unknown question' }
    a.question = raw.question
    if (a.question === 'why_city' && !a.targetCity) return { ok: false, error: 'Which city?' }
  }
  if (a.action === 'replace_city') {
    a.lessTouristy = raw.lessTouristy === true
    a.cheaper = raw.cheaper === true
    a.maxAdditionalTravelMinutes = int(raw.maxAdditionalTravelMinutes, 0, 24 * 60)
  }
  return { ok: true, action: a }
}
