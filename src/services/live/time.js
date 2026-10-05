// Times for live data: trains run on the station's clock, so every time is shown in the station's own
// time zone, and searches are sent with the right UTC offset.

// The UTC offset of `tz` at a moment, in minutes (e.g. Europe/Paris in summer → 120).
export function offsetMinutes(tz, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at)
    const get = (t) => Number(parts.find((p) => p.type === t)?.value)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000)
  } catch {
    return 0
  }
}

const pad = (n) => String(n).padStart(2, '0')

// '2026-10-06' + '08:30' on the clock in `tz` → '2026-10-06T08:30:00+02:00'.
export function zonedIso(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  // Guess with the offset at that wall time read as UTC, then correct once (handles DST changes).
  let off = offsetMinutes(tz, new Date(Date.UTC(y, m - 1, d, hh, mm)))
  off = offsetMinutes(tz, new Date(Date.UTC(y, m - 1, d, hh, mm) - off * 60000))
  const sign = off < 0 ? '-' : '+'
  const a = Math.abs(off)
  return `${date}T${time}:00${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
}

// An ISO time → 'HH:MM' on the clock in `tz` (or the device's clock without one).
export function clock(iso, tz) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...(tz ? { timeZone: tz } : {}) })
  } catch {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  }
}

// 'YYYY-MM-DD' of an ISO time on the clock in `tz`.
export function dayIn(iso, tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  } catch {
    return String(iso).slice(0, 10)
  }
}

// Whole minutes from scheduled to expected (positive = late), or null without real-time data.
export function delayMinutes(times) {
  if (!times?.expected || !times?.scheduled) return null
  return Math.round((Date.parse(times.expected) - Date.parse(times.scheduled)) / 60000)
}

// 'Updated 3 min ago' / 'Updated just now' / 'Retrieved at 14:05'.
export function agoText(iso, { now = Date.now(), verb = 'Updated' } = {}) {
  if (!iso) return ''
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 45) return `${verb} just now`
  const m = Math.round(s / 60)
  if (m < 60) return `${verb} ${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${verb} ${h} h ago`
  return `${verb} ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export function durationText(min) {
  if (min == null) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h}h${m ? ` ${String(m).padStart(2, '0')}m` : ''}` : `${m} min`
}
