// Today's weather for Travel Mode, from Open-Meteo forecasts the app has actually fetched (lib/weather.js).
// Nothing is guessed: no data means no weather, and data fetched earlier is labelled with when.
import { describe } from '../lib/weatherCodes.js'
import { hm, isOutdoor } from './travelModel.js'

export const RAIN_LIKELY = 50

const hourOf = (time) => Number(time.slice(11, 13))

// `hourly`: from getHourly / lastHourly. `dayIso`: the day shown. `nowMin`: minutes since midnight in the
// city, or null for a day that isn't today. `fresh`: fetched just now (not a stored copy).
// Returns null when there's nothing for that day, else:
//   { at, fresh, now: { temp, text, icon } | null, high, low, rain: { from, to, peak } | null, rainText, affected: [entry] }
export function weatherForDay({ hourly, dayIso, nowMin = null, schedule = null, fresh = true }) {
  const hours = (hourly?.hours || []).filter((h) => h.time.startsWith(dayIso))
  if (!hours.length) return null
  const fromHour = nowMin == null ? 0 : Math.floor(nowMin / 60)
  const ahead = hours.filter((h) => hourOf(h.time) >= fromHour)
  const temps = hours.map((h) => h.temp)
  const nowHour = nowMin == null ? null : hours.find((h) => hourOf(h.time) === fromHour)
  const cur = nowMin != null && fresh && hourly.current ? hourly.current : nowHour ? { temp: nowHour.temp, code: nowHour.code } : null

  // The first stretch of hours from now with a rain chance of 50% or more.
  let rain = null
  for (const h of ahead) {
    if ((h.rain ?? 0) >= RAIN_LIKELY) {
      if (!rain) rain = { from: hourOf(h.time) * 60, to: hourOf(h.time) * 60 + 60, peak: h.rain }
      else if (rain.to === hourOf(h.time) * 60) {
        rain.to += 60
        rain.peak = Math.max(rain.peak, h.rain)
      } else break
    }
  }
  const rest = nowMin == null ? 'today' : 'the rest of today'
  const rainText = rain
    ? rain.to - rain.from <= 60
      ? `Rain likely around ${hm(rain.from)} (${rain.peak}% chance).`
      : `Rain likely ${hm(rain.from)}–${hm(rain.to)} (up to ${rain.peak}% chance).`
    : ahead.some((h) => h.rain != null)
      ? `No rain expected for ${rest}.`
      : ''

  const affected = rain && schedule
    ? schedule.entries.filter((e) => e.kind === 'place' && e.start != null && (e.state === 'upcoming' || e.state === 'current') && isOutdoor(e.place) && e.start < rain.to && e.end > rain.from)
    : []
  const d = cur ? describe(cur.code) : null
  return {
    at: hourly.at || null,
    fresh,
    now: cur ? { temp: Math.round(cur.temp), text: d.text, icon: d.icon } : null,
    high: Math.round(Math.max(...temps)),
    low: Math.round(Math.min(...temps)),
    rain,
    rainText,
    affected,
  }
}

// One line for a day further off, from the daily forecast: "18°C · Rain possible (60%)".
export function dailyLine(row) {
  if (!row) return ''
  const d = describe(row.code)
  const rain = row.rain != null && row.rain >= 40 ? ` · Rain possible (${row.rain}%)` : ''
  return `${Math.round(row.max)}°C · ${d.text}${rain}`
}

// "fetched 14:05" in the traveller's own clock (it's about when, not where).
export const fetchedAt = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
