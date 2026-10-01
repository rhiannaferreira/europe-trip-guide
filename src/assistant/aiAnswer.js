// The AI-written answer: its shape, reading it while it streams, and checking it before anything shows.
//
// The model returns JSON in this shape (structured output, so it always parses once complete):
//   { message, cities: [names], places: [names], followUps: [{ label, prompt }], generalKnowledge }
// "message" comes first, so the panel can show it word by word while the rest arrives.
// Cards are only drawn for cities and places Eurowander actually has; anything else stays in the text.
import { resolveCity } from './appActions.js'
import { placeById } from '../data/places.js'

export const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'cities', 'places', 'followUps', 'generalKnowledge'],
  properties: {
    message: { type: 'string', description: 'The reply to the traveller' },
    cities: { type: 'array', items: { type: 'string' }, description: 'Eurowander city names to show as cards, in the order mentioned' },
    places: { type: 'array', items: { type: 'string' }, description: 'Names of places from the provided data to show as cards' },
    followUps: {
      type: 'array',
      description: 'Short next steps the traveller might tap',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'prompt'],
        properties: { label: { type: 'string' }, prompt: { type: 'string' } },
      },
    },
    generalKnowledge: { type: 'boolean', description: 'True if the answer relies on general travel knowledge beyond the provided data' },
  },
}

const MAX_MESSAGE = 2000

// The "message" string from JSON that's still arriving: '{"message":"Since you just arr' → 'Since you just arr'.
export function partialMessage(json) {
  const m = /"message"\s*:\s*"/.exec(json)
  if (!m) return ''
  let out = ''
  for (let i = m.index + m[0].length; i < json.length; i++) {
    const ch = json[i]
    if (ch === '"') break
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = json[i + 1]
    if (next === undefined) break // the escape hasn't fully arrived yet
    if (next === 'u') {
      const hex = json.slice(i + 2, i + 6)
      if (hex.length < 4) break
      out += String.fromCharCode(parseInt(hex, 16))
      i += 5
      continue
    }
    out += { n: '\n', t: '\t', r: '', b: '', f: '', '"': '"', '\\': '\\', '/': '/' }[next] ?? next
    i++
  }
  return out
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Check the finished answer. `placeIds`: the places the AI was shown; only those can become cards.
export function validateAnswer(raw, { placeIds = [] } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const message = str(raw.message, MAX_MESSAGE)
  if (!message) return null
  const cities = [...new Set((Array.isArray(raw.cities) ? raw.cities : []).map((c) => resolveCity(str(c, 60))).filter(Boolean))].slice(0, 4)
  const shown = placeIds.map((id) => placeById[id]).filter(Boolean)
  const places = [
    ...new Set(
      (Array.isArray(raw.places) ? raw.places : [])
        .map((n) => fold(str(n, 120)))
        .filter(Boolean)
        .map((n) => shown.find((p) => fold(p.name) === n)?.id || shown.find((p) => fold(p.name).includes(n) || n.includes(fold(p.name)))?.id)
        .filter(Boolean),
    ),
  ].slice(0, 4)
  const followUps = (Array.isArray(raw.followUps) ? raw.followUps : [])
    .map((f) => ({ label: str(f?.label, 40), prompt: str(f?.prompt, 200) }))
    .filter((f) => f.label && f.prompt)
    .slice(0, 4)
  return { message, cities, places, followUps, generalKnowledge: raw.generalKnowledge === true }
}

// Short, safe formatting for the message: paragraphs, "- " bullets and **bold**, as plain data the
// panel renders with React (never as HTML).
export function formatMessage(text) {
  const blocks = []
  for (const line of String(text || '').split('\n')) {
    const bullet = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'list') last.items.push(spans(bullet[1]))
      else blocks.push({ type: 'list', items: [spans(bullet[1])] })
    } else if (line.trim()) blocks.push({ type: 'p', spans: spans(line.trim()) })
  }
  return blocks
}

function spans(text) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith('**') && s.endsWith('**') && s.length > 4 ? { bold: true, text: s.slice(2, -2) } : { text: s.replace(/\*\*/g, '') }))
}
