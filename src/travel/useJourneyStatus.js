// Live status for the train the traveller picked, on the day: checked when the card shows and every two
// minutes after, only while the page is visible, the phone is online and the train is near (from four hours
// before departure until an hour after arrival). Nothing is checked on other days.
import { useEffect, useState } from 'react'
import { getJourneyStatus, statusWindow } from '../services/live/trains.js'

const EVERY = 2 * 60 * 1000

export function useJourneyStatus(journey, { active = true, online = true } = {}) {
  const [state, setState] = useState({ status: 'idle', journey: null, error: null })
  const [tick, setTick] = useState(0)
  const key = journey ? `${journey.origin?.id}|${journey.departure?.scheduled}` : ''
  const phase = journey ? statusWindow(journey) : 'after'

  // Re-check the window every minute, so the card switches to live on its own.
  useEffect(() => {
    if (!journey || !active) return undefined
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [journey, active])

  useEffect(() => {
    setState({ status: 'idle', journey: null, error: null })
  }, [key])

  useEffect(() => {
    if (!journey || !active || !online || phase !== 'live') return undefined
    let live = true
    let timer = null
    const check = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      setState((s) => ({ ...s, status: s.journey ? 'refreshing' : 'loading' }))
      getJourneyStatus(journey)
        .then((j) => live && setState({ status: 'ok', journey: j, error: null }))
        .catch((error) => live && setState((s) => ({ status: 'error', journey: s.journey, error })))
    }
    check()
    timer = setInterval(check, EVERY)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, online, phase])

  return { ...state, phase, tick }
}
