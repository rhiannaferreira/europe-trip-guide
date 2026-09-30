// The copilot's recent conversations, kept in this browser (travel-app-chats). Each is
//   { id, title, updatedAt, entries: [{ id, q, result, via, done }] }
// Proposed changes are stored without their worked-out plans: an old option is shown for reference and
// can't be applied (the trip has usually changed since). When accounts are switched on, the same shape
// can be synced; until then nothing leaves the browser.
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'

const MAX_CHATS = 20
const MAX_ENTRIES = 30

export const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// A short title from the first question: "Plan me 10 days in Europe" → "Plan me 10 days in Europe".
export function chatTitle(entries) {
  const q = entries.find((e) => e.q)?.q?.trim() || 'New chat'
  const t = q.replace(/\s+/g, ' ').replace(/[?.!]+$/, '')
  return t.length > 42 ? `${t.slice(0, 40).trimEnd()}…` : t
}

// Strip what can't (or shouldn't) be stored: plans inside options, and functions like undo.
export function storableEntry(e) {
  const blocks = (e.result?.blocks || []).map((b) =>
    b.type === 'options' ? { ...b, restored: true, options: b.options.map(({ plan: _p, days: _d, ...o }) => o) } : b.type === 'build' ? { ...b, restored: true } : b,
  )
  const done = Object.fromEntries(Object.entries(e.done || {}).map(([k, v]) => [k, typeof v === 'object' && v ? { short: v.short || '', option: v.option } : v]))
  return { id: e.id, q: e.q, via: e.via, result: { ...e.result, blocks, now: undefined }, done }
}

export const readChats = () => {
  const list = readJSON(KEYS.chats, [])
  return Array.isArray(list) ? list.filter((c) => c && c.id && Array.isArray(c.entries)) : []
}

export function saveChat(id, entries) {
  if (!entries.length) return readChats()
  const chat = { id, title: chatTitle(entries), updatedAt: Date.now(), entries: entries.slice(-MAX_ENTRIES).map(storableEntry) }
  const list = [chat, ...readChats().filter((c) => c.id !== id)].slice(0, MAX_CHATS)
  writeJSON(KEYS.chats, list)
  return list
}

export function deleteChat(id) {
  const list = readChats().filter((c) => c.id !== id)
  writeJSON(KEYS.chats, list)
  return list
}
