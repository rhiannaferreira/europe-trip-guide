// Travel Mode (/travel): My trip for the days you're actually on it. Today first: what's next, how to
// get there, what's changed, what's nearby. It reads and changes the same saved trip as planning mode
// (lib/tripStore.js) and talks to the one copilot (assistant/), with today's context attached.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { track } from '../lib/analytics.js'
import { setPageMeta } from '../lib/meta.js'
import { useOnline } from '../lib/pwa.js'
import { Link } from '../lib/router.jsx'
import { requestAsk, setAssistantOpen, setTravel } from '../assistant/bridge.js'
import { useTheme } from '../useTheme.js'
import { clockIn, daySchedule, deviceZone, differsFromDevice, hm, tripStatus, zoneAbbr } from './travelModel.js'
import { weatherForDay } from './travelWeather.js'
import { travelContext } from './travelContext.js'
import { useHourlyWeather, useLocation, useNow, useSavedTrip } from './useTravel.js'
import TodayView from './TodayView.jsx'
import { ActivitySheet, NearbySheet, SkipSheet } from './Sheets.jsx'
import { MoreView, TripView } from './TripInfo.jsx'
import { mapLibreOn } from '../map/config.js'

// The map only downloads when the Map tab is opened.
const TravelMap = lazy(() => (mapLibreOn() ? import('../map/TravelDayMap.jsx') : import('./TravelMap.jsx')))

const NAV = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'trip', label: 'Trip', icon: '🧳' },
  { id: 'ask', label: 'Ask', icon: '✨' },
  { id: 'more', label: 'More', icon: '☰' },
]

const longDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const greeting = (m) => (m < 720 ? 'Good morning.' : m < 1080 ? 'Good afternoon.' : 'Good evening.')

function NoTrip({ status }) {
  return (
    <main className="tm-empty" id="travel-main">
      <h1>Travel Mode</h1>
      <p>
        {status === 'empty'
          ? 'Travel Mode shows your trip while you’re on it: today’s plan, what’s next and what’s nearby. Start with a trip.'
          : 'Add dates to your trip, and Travel Mode will show each day while you travel.'}
      </p>
      <div className="tm-row">
        <Link to="/trip" className="btn btn-primary tm-btn">
          {status === 'empty' ? 'Go to My trip' : 'Add trip dates'}
        </Link>
        {status === 'empty' && (
          <Link to="/build" className="btn tm-btn">
            Build a trip
          </Link>
        )}
      </div>
    </main>
  )
}

export default function TravelPage() {
  useTheme()
  const [trip, change] = useSavedTrip()
  const now = useNow()
  const online = useOnline()
  const location = useLocation()
  const status = useMemo(() => tripStatus(trip, now), [trip, now])
  const [tab, setTab] = useState('today')
  const [viewN, setViewN] = useState(null)
  const [sheet, setSheet] = useState(null) // { type: 'activity' | 'skip' | 'nearby', ... }
  const [mapFocus, setMapFocus] = useState(null)
  const mainRef = useRef(null)

  const live = status.status === 'active'
  const days = status.days || []
  const fallbackDay = live ? status.today : status.status === 'completed' ? days[days.length - 1] : days[0]
  const day = (viewN && days.find((d) => d.number === viewN)) || fallbackDay || null
  const isToday = Boolean(live && day && day.number === status.today.number)
  const clock = day ? clockIn(day.zone, now) : null
  const nowMin = isToday ? clock.minutes : null
  const city = day ? cityById[day.cityId] : null
  const schedule = useMemo(() => (day ? daySchedule(trip, day, { nowMin }) : null), [trip, day, nowMin])
  const hourly = useHourlyWeather(city, online)
  const weather = useMemo(
    () => (day && hourly.data ? weatherForDay({ hourly: hourly.data, dayIso: day.iso, nowMin, schedule, fresh: hourly.fresh }) : null),
    [hourly.data, hourly.fresh, day, nowMin, schedule],
  )
  // Past days (and today) of a trip in progress can be ticked off; a finished trip is a read-only record.
  const canMark = Boolean(live && day && day.number <= status.today.number)
  const readOnly = status.status === 'completed'

  useEffect(() => {
    setPageMeta({ title: 'Travel Mode', path: '/travel' })
  }, [])
  useEffect(() => {
    if (status.status === 'active' || status.status === 'upcoming' || status.status === 'completed') track('travel_mode_entered', { status: status.status })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The copilot reads today's context fresh for every message while Travel Mode is open.
  const ctxRef = useRef(null)
  ctxRef.current = () => (day ? travelContext({ trip, status, day, nowMin, weather, online, position: location.position }) : null)
  useEffect(() => {
    if (!day) return undefined
    setTravel({ todayIso: day.iso, get: () => ctxRef.current?.() })
    return () => setTravel(null)
  }, [day?.iso]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!day) return <NoTrip status={status.status} />

  const country = countryByCode[city.country]
  const ask = (prompt, kind = 'ask') => requestAsk(prompt, { source: 'travel_mode', kind })
  const go = (id) => {
    if (id === 'ask') return setAssistantOpen(true)
    setTab(id)
    window.scrollTo(0, 0)
    setTimeout(() => mainRef.current?.focus({ preventScroll: true }), 0)
  }
  const showDay = (n) => {
    setViewN(n === (live ? status.today.number : null) ? null : n)
    setTab('today')
    window.scrollTo(0, 0)
  }
  const openNearby = (finder = 'all', from = 'nearby') => {
    track('nearby_opened', { finder, from })
    setSheet({ type: 'nearby', finder })
  }
  const showOnMap = (placeId) => {
    setMapFocus(placeId)
    setTab('map')
  }
  const tz = day.zone
  const otherClock = differsFromDevice(tz, now)

  const env = {
    trip,
    change,
    status,
    day,
    days,
    isToday,
    nowMin,
    schedule,
    weather,
    hourly,
    online,
    city,
    canMark,
    readOnly,
    location,
    ask,
    openNearby,
    showOnMap,
    showDay,
    openActivity: (entry, focus = 'details') => setSheet({ type: 'activity', id: entry.id, focus }),
    openSkip: (entry) => setSheet({ type: 'skip', id: entry.id }),
  }

  const prev = days.find((d) => d.number === day.number - 1)
  const next = days.find((d) => d.number === day.number + 1)

  return (
    <div className="tm">
      <a className="skip-link" href="#travel-main" onClick={(e) => (e.preventDefault(), mainRef.current?.focus())}>
        Skip to today
      </a>
      <header className="tm-head">
        <div className="tm-head-top">
          <Link to="/trip" className="tm-exit">
            <span aria-hidden="true">←</span> Planning
          </Link>
          <span className="tm-badge">{readOnly ? 'Trip complete' : live ? 'Travel Mode' : 'Preview'}</span>
        </div>
        <h1 className="tm-city">
          {city.name.toUpperCase()} <span role="img" aria-label={country?.name}>{country?.flag}</span>
        </h1>
        <p className="tm-date">
          {longDate(day.date)} · Day {day.number} of {days.length}
        </p>
        {isToday && (
          <p className="tm-clock">
            {greeting(nowMin)} It’s <strong>{hm(nowMin)}</strong> in {city.name}
            {otherClock && (
              <>
                {' '}
                ({zoneAbbr(tz, now)}; your phone shows {hm(clockIn(deviceZone(), now).minutes)})
              </>
            )}
            .
          </p>
        )}
        {!online && (
          <p className="tm-offline" role="status">
            <strong>You’re offline.</strong> Your plan, notes and saved places are from this phone. Weather and trains aren’t live.
          </p>
        )}
        {status.status === 'upcoming' && (
          <p className="tm-banner">
            <strong>Preview.</strong> Your trip starts in {status.daysUntil} day{status.daysUntil === 1 ? '' : 's'}. This is how each day will look; times are suggestions until you set them.
          </p>
        )}
        {readOnly && <p className="tm-banner">This trip is over. Here’s each day as it happened.</p>}
        {(viewN || !live) && days.length > 1 && (
          <nav className="tm-daynav" aria-label="Trip days">
            <button type="button" className="btn tm-btn-sm" disabled={!prev} onClick={() => showDay(prev.number)} aria-label={prev ? `Previous day, day ${prev.number}` : 'No earlier day'}>
              ‹ Day {prev ? prev.number : ''}
            </button>
            {live && viewN && (
              <button type="button" className="btn tm-btn-sm" onClick={() => showDay(status.today.number)}>
                Back to today
              </button>
            )}
            <button type="button" className="btn tm-btn-sm" disabled={!next} onClick={() => showDay(next.number)} aria-label={next ? `Next day, day ${next.number}` : 'No later day'}>
              Day {next ? next.number : ''} ›
            </button>
          </nav>
        )}
      </header>

      <main id="travel-main" className="tm-main" ref={mainRef} tabIndex={-1}>
        {tab === 'today' && <TodayView env={env} />}
        {tab === 'map' && (
          <Suspense fallback={<p className="tm-muted tm-pad">Loading the map…</p>}>
            <TravelMap env={env} focusId={mapFocus} position={location.position} />
          </Suspense>
        )}
        {tab === 'trip' && <TripView env={env} />}
        {tab === 'more' && <MoreView env={env} />}
      </main>

      <nav className="tm-nav" aria-label="Travel Mode">
        {NAV.map((n) => (
          <button key={n.id} type="button" className={`tm-nav-btn${tab === n.id ? ' active' : ''}`} aria-current={tab === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <span aria-hidden="true">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {sheet?.type === 'activity' && <ActivitySheet env={env} id={sheet.id} focus={sheet.focus} onClose={() => setSheet(null)} onSkip={(e) => setSheet({ type: 'skip', id: e.id })} />}
      {sheet?.type === 'skip' && <SkipSheet env={env} id={sheet.id} onClose={() => setSheet(null)} />}
      {sheet?.type === 'nearby' && <NearbySheet env={env} finder={sheet.finder} onClose={() => setSheet(null)} />}
    </div>
  )
}
