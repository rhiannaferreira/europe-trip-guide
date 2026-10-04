// Weather from Open-Meteo (free, no key): a 16-day forecast, and last year's weather on the same
// dates for trips further away than that. Forecasts are cached for 3 hours, last year's for a month.
import { useEffect, useState } from 'react'
import { createCache, fetchJSON } from './net.js'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive'
export const FORECAST_DAYS = 16
const forecastCache = createCache('forecast', { ttlDays: 0.125, max: 60 })
const archiveCache = createCache('weather-last-year', { ttlDays: 30, max: 120 })

// WMO weather codes → icon and words (in weatherCodes.js, so code without React can use them).
export { describe } from './weatherCodes.js'

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const today = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
export const lastForecastDate = () => addDays(today(), FORECAST_DAYS - 1)

// Open-Meteo's column-per-field response → one object per day.
function rows(daily, rainKey) {
  return (daily?.time || []).map((date, i) => ({
    date,
    code: daily.weather_code?.[i],
    max: daily.temperature_2m_max?.[i],
    min: daily.temperature_2m_min?.[i],
    rain: daily[rainKey]?.[i],
  })).filter((d) => d.code != null && d.max != null)
}

// Hour by hour for today and tomorrow, for Travel Mode: { at (fetched, ms), current: { temp, code } | null,
// hours: [{ time: 'YYYY-MM-DDTHH:00' in the city's own time, temp, code, rain (chance %) }] }. Cached 1 hour.
const hourlyCache = createCache('forecast-hourly', { ttlDays: 1 / 24, max: 20 })
export async function getHourly(city) {
  const hit = hourlyCache.get(city.id)
  if (hit) return hit
  const data = await fetchJSON(
    `${FORECAST_API}?${new URLSearchParams({
      latitude: city.lat,
      longitude: city.lng,
      current: 'temperature_2m,weather_code',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      timezone: 'auto',
      forecast_days: '2',
    })}`,
  )
  const h = data.hourly || {}
  const out = {
    at: Date.now(),
    current: data.current?.temperature_2m != null && data.current?.weather_code != null ? { temp: data.current.temperature_2m, code: data.current.weather_code } : null,
    hours: (h.time || []).map((time, i) => ({ time, temp: h.temperature_2m?.[i], code: h.weather_code?.[i], rain: h.precipitation_probability?.[i] })).filter((x) => x.code != null && x.temp != null),
  }
  hourlyCache.set(city.id, out)
  return out
}
// The last hourly forecast stored for a city, however old, or null (for offline use; always labelled).
export const lastHourly = (city) => hourlyCache.peek(city.id)?.value || null

export async function getForecast(city) {
  const hit = forecastCache.get(city.id)
  if (hit) return hit
  const data = await fetchJSON(
    `${FORECAST_API}?${new URLSearchParams({
      latitude: city.lat,
      longitude: city.lng,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: String(FORECAST_DAYS),
    })}`,
  )
  const days = rows(data.daily, 'precipitation_probability_max')
  forecastCache.set(city.id, days)
  return days
}
// The last daily forecast stored for a city, however old: { days, at } or null.
export const lastForecast = (city) => {
  const hit = forecastCache.peek(city.id)
  return hit ? { days: hit.value, at: hit.at } : null
}

// The same calendar dates one year earlier (29 Feb becomes 28 Feb).
export async function getLastYear(city, from, to) {
  const shift = (s) => {
    const [y, m, d] = s.split('-').map(Number)
    return ymd(new Date(y - 1, m - 1, m === 2 && d === 29 ? 28 : d))
  }
  const key = `${city.id}:${from}:${to}`
  const hit = archiveCache.get(key)
  if (hit) return hit
  const data = await fetchJSON(
    `${ARCHIVE_API}?${new URLSearchParams({
      latitude: city.lat,
      longitude: city.lng,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
      start_date: shift(from),
      end_date: shift(to),
    })}`,
  )
  // Key the rows by this year's dates so they line up with the trip.
  const days = rows(data.daily, 'precipitation_sum').map((d) => {
    const [y, m, dd] = d.date.split('-').map(Number)
    return { ...d, date: ymd(new Date(y + 1, m - 1, dd)) }
  })
  archiveCache.set(key, days)
  return days
}

// A city's forecast: { status: 'loading' | 'ready' | 'error', days, error, retry }
export function useForecast(city) {
  const [state, setState] = useState({ status: 'loading', days: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ status: 'loading', days: [] })
    getForecast(city).then(
      (days) => live && setState({ status: 'ready', days }),
      (error) => live && setState({ status: 'error', days: [], error }),
    )
    return () => {
      live = false
    }
  }, [city.id, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

// The weather behind useTripWeather, without React (the assistant uses it too). `days`: [{ number, cityId,
// city, date (Date) }], already limited to days that haven't passed. Never throws.
// Returns { byDay, failed, total, error }: `failed` of `total` cities couldn't be loaded.
export async function loadTripWeather(days) {
  const horizon = lastForecastDate()
  // One request per city: its forecast, or its dates last year.
  const byCity = {}
  for (const d of days) (byCity[d.cityId] ||= []).push(d)
  const jobs = Object.entries(byCity).map(async ([, list]) => {
    const city = list[0].city
    const near = list.filter((d) => d.date <= horizon)
    const far = list.filter((d) => d.date > horizon)
    const out = {}
    if (near.length) {
      const fc = Object.fromEntries((await getForecast(city)).map((r) => [r.date, r]))
      near.forEach((d) => fc[ymd(d.date)] && (out[d.number] = { kind: 'forecast', ...fc[ymd(d.date)] }))
    }
    if (far.length) {
      const ly = Object.fromEntries((await getLastYear(city, ymd(far[0].date), ymd(far[far.length - 1].date))).map((r) => [r.date, r]))
      far.forEach((d) => ly[ymd(d.date)] && (out[d.number] = { kind: 'last-year', ...ly[ymd(d.date)] }))
    }
    return out
  })
  const results = await Promise.allSettled(jobs)
  const failed = results.filter((r) => r.status === 'rejected')
  return {
    byDay: Object.assign({}, ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value)),
    failed: failed.length,
    total: results.length,
    error: failed[0]?.reason,
  }
}

export const startOfToday = today

// Weather for each trip day: a forecast when the day is within 16 days, otherwise last year's
// weather on that date. Days already over get nothing.
// Returns { status, byDay: { [dayNumber]: { kind: 'forecast' | 'last-year', ...day } }, counts, error, retry }
export function useTripWeather(days) {
  const [state, setState] = useState({ status: 'idle', byDay: {} })
  const [attempt, setAttempt] = useState(0)
  const key = days.map((d) => `${d.number}:${d.cityId}:${ymd(d.date)}`).join(',')

  useEffect(() => {
    const start = today()
    const upcoming = days.filter((d) => d.date >= start)
    if (upcoming.length === 0) return setState({ status: 'idle', byDay: {} })
    let live = true
    setState((s) => ({ status: 'loading', byDay: s.byDay }))

    loadTripWeather(upcoming).then(({ byDay, failed, total, error }) => {
      if (!live) return
      setState({ status: failed === total ? 'error' : 'ready', partial: failed > 0 && failed < total, byDay, error })
    })
    return () => {
      live = false
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
