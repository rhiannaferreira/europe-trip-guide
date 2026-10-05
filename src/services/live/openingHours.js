// Reading OpenStreetMap opening_hours strings ("Mo-Sa 12:30-16:00,19:00-23:30; Su off") well enough to
// say "open until 23:30" for the common cases. Anything this can't read with certainty (months, week
// numbers, sunrise, holidays-only rules...) gives null, and the app shows the hours as written instead
// of guessing. These are hours volunteers listed, so the UI always says where they come from.

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/

function dayList(sel) {
  const out = new Set()
  for (const part of sel.split(',')) {
    if (part === 'PH' || part === 'SH') continue
    const m = part.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/)
    if (!m) return null
    const a = DAYS.indexOf(m[1])
    const b = m[2] ? DAYS.indexOf(m[2]) : a
    for (let i = a; ; i = (i + 1) % 7) {
      out.add(i)
      if (i === b) break
    }
  }
  return out
}

function spans(text) {
  const out = []
  for (const part of text.split(',')) {
    const [s, e] = part.split('-')
    const a = s?.match(TIME)
    const b = e?.match(TIME)
    if (!a || !b) return null
    const start = Number(a[1]) * 60 + Number(a[2])
    let end = Number(b[1]) * 60 + Number(b[2])
    if (end <= start) end += 1440 // past midnight
    out.push([start, end])
  }
  return out
}

// → { [weekday 0=Mo..6=Su]: [[startMin, endMin]...] } or null when it can't be read with certainty.
export function parseOpeningHours(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const v = value.trim()
  if (v === '24/7') return Object.fromEntries(DAYS.map((_, i) => [i, [[0, 1440]]]))
  const week = Object.fromEntries(DAYS.map((_, i) => [i, null]))
  let any = false
  for (const raw of v.split(/;|\|\|/)) {
    const rule = raw.trim()
    if (!rule) continue
    const m = rule.match(/^(?:([A-Za-z,\-]+)\s+)?(.+)$/)
    if (!m) return null
    let [, sel, body] = m
    // "Mo-Fr" alone isn't valid; "off" alone with a selector is.
    if (!sel && /^[A-Za-z,\-]+$/.test(body) && !/^(off|closed)$/i.test(body)) return null
    if (sel === 'PH' || sel === 'SH') continue // public/school holidays: unknown dates, skipped
    const days = sel ? dayList(sel) : new Set(DAYS.map((_, i) => i))
    if (!days) return null
    let times
    if (/^(off|closed)$/i.test(body.trim())) times = []
    else {
      times = spans(body.replace(/\s+/g, ''))
      if (!times) return null
    }
    for (const d of days) week[d] = times
    any = true
  }
  if (!any) return null
  for (const d of Object.keys(week)) week[d] ||= []
  return week
}

const hm = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function localNow(tz, now) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[parts.find((p) => p.type === 'weekday').value]
  return { day: wd, min: Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value) }
}

// Whether a place is open now, by its listed hours, on the clock in `tz`:
//   { open: true, until: 'HH:MM' | null (open all day) } | { open: false, opens: 'HH:MM' | null, opensDay: 0..6 | null } | null
export function openState(value, tz, now = new Date()) {
  const week = parseOpeningHours(value)
  if (!week) return null
  let t
  try {
    t = localNow(tz, now)
  } catch {
    return null
  }
  const today = week[t.day]
  const yesterday = week[(t.day + 6) % 7]
  for (const [s, e] of yesterday) if (e > 1440 && t.min < e - 1440) return { open: true, until: hm(e) }
  for (const [s, e] of today) if (t.min >= s && t.min < e) return { open: true, until: s === 0 && e >= 1440 && week[(t.day + 1) % 7].some(([a]) => a === 0) ? null : hm(e) }
  const later = today.filter(([s]) => s > t.min).sort((a, b) => a[0] - b[0])[0]
  if (later) return { open: false, opens: hm(later[0]), opensDay: t.day }
  for (let i = 1; i <= 7; i++) {
    const d = (t.day + i) % 7
    const first = [...week[d]].sort((a, b) => a[0] - b[0])[0]
    if (first) return { open: false, opens: hm(first[0]), opensDay: d }
  }
  return { open: false, opens: null, opensDay: null }
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// "Open until 23:30" / "Closed · opens 19:00" / "Closed · opens Monday 09:00", or '' when unknown.
export function openText(state, todayIndex = null) {
  if (!state) return ''
  if (state.open) return state.until ? `Open until ${state.until}` : 'Open 24 hours'
  if (!state.opens) return 'Closed'
  return state.opensDay === todayIndex || todayIndex == null ? `Closed · opens ${state.opens}` : `Closed · opens ${DAY_NAMES[state.opensDay]} ${state.opens}`
}

export function openNow(value, tz, now = new Date()) {
  const st = openState(value, tz, now)
  if (!st) return { state: null, text: '' }
  let day = null
  try {
    day = localNow(tz, now).day
  } catch {
    // keep null
  }
  return { state: st, text: openText(st, day) }
}
