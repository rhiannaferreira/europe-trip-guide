// Travel Mode's live inputs: the saved trip (the same one planning mode edits), a clock, the weather,
// and the traveller's position only when they ask for it.
import { useCallback, useEffect, useState } from 'react'
// Registers the OpenStreetMap places the trip uses before the trip is read, so none are dropped.
import '../lib/extraPlaces.js'
import { TRIP_CHANGED, readSavedTrip, updateSavedTrip } from '../lib/tripStore.js'
import { getForecast, getHourly, lastForecast, lastHourly } from '../lib/weather.js'

// The saved trip, kept current when the copilot, planning mode or another tab changes it.
// `change(fn)` writes through lib/tripStore, so every open page sees it.
export function useSavedTrip() {
  const [trip, setTrip] = useState(readSavedTrip)
  useEffect(() => {
    const reload = () => setTrip(readSavedTrip())
    window.addEventListener(TRIP_CHANGED, reload)
    window.addEventListener('storage', reload)
    return () => {
      window.removeEventListener(TRIP_CHANGED, reload)
      window.removeEventListener('storage', reload)
    }
  }, [])
  const change = useCallback((fn) => setTrip(updateSavedTrip(fn)), [])
  return [trip, change]
}

// The current time, refreshed every 30 seconds and whenever the page comes back into view.
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, ms)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms])
  return now
}

// A city's hour-by-hour forecast. Offline, or when the request fails, the last copy this phone stored is
// used and marked as not fresh; with none, there's simply no weather.
//   { status: 'loading' | 'ready' | 'stored' | 'none', data, fresh, error, retry }
export function useHourlyWeather(city, online) {
  const [state, setState] = useState({ status: 'loading', data: null, fresh: false })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!city) return undefined
    let live = true
    const stored = () => {
      const data = lastHourly(city)
      return data ? { status: 'stored', data, fresh: false } : { status: 'none', data: null, fresh: false }
    }
    if (!online) {
      setState(stored())
      return undefined
    }
    setState((s) => ({ ...s, status: 'loading' }))
    getHourly(city).then(
      (data) => live && setState({ status: 'ready', data, fresh: true }),
      (error) => live && setState({ ...stored(), error }),
    )
    return () => {
      live = false
    }
  }, [city?.id, online, attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

// A city's 16-day daily forecast (for tomorrow), or the stored copy offline. { days, fresh, at } or null.
export function useDailyForecast(city, online) {
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!city) return undefined
    let live = true
    const stored = () => {
      const hit = lastForecast(city)
      return hit ? { days: hit.days, fresh: false, at: hit.at } : null
    }
    if (!online) {
      setState(stored())
      return undefined
    }
    getForecast(city).then(
      (days) => live && setState({ days, fresh: true, at: Date.now() }),
      () => live && setState(stored()),
    )
    return () => {
      live = false
    }
  }, [city?.id, online]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

// The traveller's position, only after they ask: one reading (no tracking), kept in memory on this page
// and never stored or sent anywhere.
//   { status: 'off' | 'asking' | 'on' | 'denied' | 'unavailable', position: { lat, lng, accuracy } | null, request, forget }
export function useLocation() {
  const [state, setState] = useState({ status: 'off', position: null })
  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return setState({ status: 'unavailable', position: null })
    setState((s) => ({ ...s, status: 'asking' }))
    navigator.geolocation.getCurrentPosition(
      (p) => setState({ status: 'on', position: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy } }),
      (e) => setState({ status: e.code === 1 ? 'denied' : 'unavailable', position: null }),
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 },
    )
  }, [])
  const forget = useCallback(() => setState({ status: 'off', position: null }), [])
  return { ...state, request, forget }
}
