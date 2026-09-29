// Weather from Open-Meteo (free, no key): a 16-day forecast, and last year's weather on the same
// dates for trips further away than that. Forecasts are cached for 3 hours, last year's for a month.
import { useEffect, useState } from 'react'
import { createCache, fetchJSON } from './net.js'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive'
export const FORECAST_DAYS = 16
const forecastCache = createCache('forecast', { ttlDays: 0.125, max: 60 })
const archiveCache = createCache('weather-last-year', { ttlDays: 30, max: 120 })

// WMO weather codes → icon and words.
export function describe(code) {
  if (code === 0) return { icon: '☀️', text: 'Clear' }
  if (code <= 2) return { icon: '🌤️', text: 'Partly cloudy' }
  if (code === 3) return { icon: '☁️', text: 'Cloudy' }
  if (code <= 48) return { icon: '🌫️', text: 'Fog' }
  if (code <= 57) return { icon: '🌦️', text: 'Drizzle' }
  if (code <= 67) return { icon: '🌧️', text: 'Rain' }
  if (code <= 77) return { icon: '🌨️', text: 'Snow' }
  if (code <= 82) return { icon: '🌦️', text: 'Showers' }
  if (code <= 86) return { icon: '🌨️', text: 'Snow showers' }
  return { icon: '⛈️', text: 'Thunderstorms' }
}

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

// Weather for each trip day: a forecast when the day is within 16 days, otherwise last year's
// weather on that date. Days already over get nothing.
// Returns { status, byDay: { [dayNumber]: { kind: 'forecast' | 'last-year', ...day } }, counts, error, retry }
export function useTripWeather(days) {
  const [state, setState] = useState({ status: 'idle', byDay: {} })
  const [attempt, setAttempt] = useState(0)
  const key = days.map((d) => `${d.number}:${d.cityId}:${ymd(d.date)}`).join(',')

  useEffect(() => {
    const start = today()
    const horizon = lastForecastDate()
    const upcoming = days.filter((d) => d.date >= start)
    if (upcoming.length === 0) return setState({ status: 'idle', byDay: {} })
    let live = true
    setState((s) => ({ status: 'loading', byDay: s.byDay }))

    // One request per city: its forecast, or its dates last year.
    const byCity = {}
    for (const d of upcoming) (byCity[d.cityId] ||= []).push(d)
    const jobs = Object.entries(byCity).map(async ([cityId, list]) => {
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
    Promise.allSettled(jobs).then((results) => {
      if (!live) return
      const byDay = Object.assign({}, ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value))
      const failed = results.filter((r) => r.status === 'rejected')
      setState({
        status: failed.length === results.length ? 'error' : 'ready',
        partial: failed.length > 0 && failed.length < results.length,
        byDay,
        error: failed[0]?.reason,
      })
    })
    return () => {
      live = false
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
