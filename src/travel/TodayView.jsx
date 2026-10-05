// The Today screen: weather, the journey on a travel day, next up, free time, the timeline, food,
// quick copilot actions, the day's summary and a look at tomorrow. NOW and NEXT come first.
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { dayProgress, daySchedule, daySummary, flagOf, freeTime, hm, inWords, nextUp, savedNearby } from './travelModel.js'
import { dailyLine, fetchedAt } from './travelWeather.js'
import { useDailyForecast } from './useTravel.js'
import { track } from '../lib/analytics.js'
import { addToDay, setDeparture, setJourney } from './travelActions.js'
import Timeline from './Timeline.jsx'
import { Directions, modeIcon, modeWord } from './ui.jsx'
import { useState } from 'react'
import { useJourneyStatus } from './useJourneyStatus.js'
import JourneyCard from '../components/JourneyCard.jsx'
import TrainSearchModal from '../components/TrainSearch.jsx'
import { LiveLoading, RailAttribution, SourceLabel } from '../components/LiveBits.jsx'
import { hasRail, stationName } from '../services/live/trains.js'
import { clock } from '../services/live/time.js'

function WeatherCard({ env }) {
  const { weather, hourly, isToday, online, ask } = env
  if (hourly.status === 'loading' && !weather) return <section className="tm-card tm-weather" aria-busy="true"><p className="tm-muted">Checking the weather…</p></section>
  if (!weather) {
    return (
      <section className="tm-card tm-weather" aria-label="Weather">
        <p className="tm-muted">
          {!online ? 'No weather saved on this phone yet. It will show once you’re back online.' : hourly.status === 'none' && hourly.error ? 'Couldn’t load the weather just now.' : 'No forecast for this day yet (forecasts cover the next two days here).'}
        </p>
        {online && hourly.error && (
          <button type="button" className="btn tm-btn-sm" onClick={hourly.retry}>
            Try again
          </button>
        )}
      </section>
    )
  }
  const affected = weather.affected
  return (
    <section className="tm-card tm-weather" aria-label="Weather">
      <div className="tm-weather-main">
        {weather.now ? (
          <>
            <span className="tm-temp">{weather.now.temp}°C</span>
            <span className="tm-weather-text">
              <span aria-hidden="true">{weather.now.icon}</span> {weather.now.text}
              <span className="tm-muted"> · {weather.low}–{weather.high}°C</span>
            </span>
          </>
        ) : (
          <span className="tm-weather-text">
            {weather.low}–{weather.high}°C
          </span>
        )}
      </div>
      {weather.rainText && <p className={weather.rain ? 'tm-rain' : 'tm-muted'}>{weather.rain ? '☔ ' : ''}{weather.rainText}</p>}
      {isToday && affected.length > 0 && (
        <div className="tm-alert" role="note">
          <p>
            Rain may affect {affected.length === 1 ? affected[0].place.name : `${affected.length} activities`} today.
          </p>
          <button type="button" className="btn tm-btn-sm" onClick={() => ask(`Rain is expected ${weather.rainText.replace(/^Rain likely /, '').replace(/\.$/, '')}. What should I move?`, 'rain')}>
            Review plans
          </button>
        </div>
      )}
      <p className="tm-source">
        {weather.fresh ? 'Open-Meteo forecast' : `Saved forecast from ${fetchedAt(weather.at)}. It may have changed.`}
      </p>
    </section>
  )
}

// NEXT JOURNEY: the train the traveller picked, with live status on the day when the operator shares it.
function JourneyNowCard({ env }) {
  const { day, schedule, change, readOnly, ask, isToday, online } = env
  const [picking, setPicking] = useState(false)
  const saved = schedule.train
  const live = useJourneyStatus(saved, { active: isToday, online })
  const j = live.journey || saved
  const from = day.leg.from
  const to = cityById[day.cityId]
  const station = { name: stationName(j.origin.name), lat: j.origin.lat, lng: j.origin.lng, type: 'station' }
  return (
    <section className="tm-card tm-travelday tm-journey" aria-labelledby="tm-travelday-title">
      <p className="tm-eyebrow" id="tm-travelday-title">
        {isToday ? 'Next journey' : 'Travel day'}
      </p>
      <p className="tm-route">
        {from.name} {flagOf(from.id)} <span aria-hidden="true">→</span>
        <span className="visually-hidden">to</span> {to.name} {flagOf(to.id)}
      </p>
      {(live.status === 'loading' || live.status === 'refreshing') && !live.journey && <LiveLoading text="Checking current service information…" />}
      <JourneyCard journey={j} showStatus={Boolean(live.journey)} updatedAt={live.journey?.retrievedAt}>
        {!live.journey && (
          <p className="journey-meta">
            <SourceLabel kind="scheduled" /> Departs {clock(saved.departure.scheduled, saved.origin.tz)} from the timetable.
            {!isToday
              ? ' Live status shows here on the day.'
              : live.phase === 'before'
                ? ' Live status shows here from about four hours before departure.'
                : !online
                  ? ' You’re offline, so live status can’t load.'
                  : live.status === 'error'
                    ? live.error?.code === 'not_found'
                      ? ' This train isn’t in today’s live data, so check the operator’s app for changes.'
                      : ' Live status is unavailable right now, so check the operator’s app for changes.'
                    : ''}
          </p>
        )}
        {live.journey && live.status === 'error' && <p className="journey-meta">Couldn’t refresh just now. Showing the last update.</p>}
      </JourneyCard>
      <div className="tm-actions">
        {Number.isFinite(station.lat) && <Directions place={station} label="Directions to the station" className="btn tm-btn-sm" />}
        {isToday && (
          <button type="button" className="btn tm-btn-sm" onClick={() => ask('Do I have enough time before my train?', 'train')}>
            Do I have time before my train?
          </button>
        )}
        {!readOnly && online && (
          <button type="button" className="btn tm-btn-sm" onClick={() => setPicking(true)}>
            Change train
          </button>
        )}
      </div>
      <RailAttribution />
      {picking && (
        <TrainSearchModal
          fromCityId={from.id}
          toCityId={day.cityId}
          date={day.iso}
          time={clock(saved.departure.scheduled, saved.origin.tz)}
          chosen={saved}
          estimate={day.leg}
          onChoose={(pick) => {
            change((t) => setJourney(t, from.id, day.cityId, pick))
            if (pick) setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}

function TravelDayCard({ env }) {
  const { day, schedule, change, readOnly, ask, isToday, online } = env
  const [picking, setPicking] = useState(false)
  if (schedule.train) return <JourneyNowCard env={env} />
  const leg = day.leg
  const from = leg.from
  const to = cityById[day.cityId]
  const setTime = (v) => change((t) => setDeparture(t, day.number, v || null))
  return (
    <section className="tm-card tm-travelday" aria-labelledby="tm-travelday-title">
      <p className="tm-eyebrow" id="tm-travelday-title">
        Travel day
      </p>
      <p className="tm-route">
        {from.name} {flagOf(from.id)} <span aria-hidden="true">→</span>
        <span className="visually-hidden">to</span> {to.name} {flagOf(to.id)}
      </p>
      <p className="tm-leg">
        {modeIcon(leg.mode)} {modeWord(leg.mode)}
        {schedule.depart != null && (
          <>
            {' '}
            <strong>
              {hm(schedule.depart)} → ~{hm(schedule.arrive)}
            </strong>
          </>
        )}
        <span className="tm-muted"> · about {formatDuration(leg.minutes)} {leg.estimated ? '(estimated from distance)' : '(typical journey time)'}</span>
      </p>
      {leg.note && <p className="tm-muted">{leg.note}</p>}
      {!readOnly && (
        <label className="tm-field">
          <span>Your departure time</span>
          <input type="time" value={schedule.depart != null ? hm(schedule.depart) : ''} onChange={(e) => setTime(e.target.value)} />
        </label>
      )}
      {schedule.depart == null && <p className="tm-muted">Add the time on your ticket to see when you arrive and plan around it.</p>}
      {!readOnly && online && hasRail(from.id) && hasRail(day.cityId) ? (
        <>
          <p className="tm-source">Add your real train to see its platform and any delays here on the day.</p>
          <button type="button" className="btn tm-btn-sm" onClick={() => setPicking(true)}>
            🚆 Find my train
          </button>
        </>
      ) : (
        <p className="tm-source">Check your ticket or the operator’s app for platforms and live times.</p>
      )}
      {isToday && schedule.depart != null && (
        <button type="button" className="btn tm-btn-sm" onClick={() => ask('Do I have enough time before my train?', 'train')}>
          Do I have time before my train?
        </button>
      )}
      {picking && (
        <TrainSearchModal
          fromCityId={from.id}
          toCityId={day.cityId}
          date={day.iso}
          time={schedule.depart != null ? hm(schedule.depart) : '08:00'}
          estimate={leg}
          onChoose={(pick) => {
            change((t) => setJourney(t, from.id, day.cityId, pick))
            if (pick) setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}

function NextUpCard({ env }) {
  const { schedule, nowMin, isToday, openActivity, openNearby, ask, readOnly } = env
  if (readOnly) return null
  const n = nextUp(schedule, nowMin)
  const e = n.entry
  if (isToday && (!e || n.open)) {
    const until = n.open?.to
    const part = nowMin < 720 ? 'morning' : nowMin < 1020 ? 'afternoon' : 'evening'
    return (
      <section className="tm-card tm-next tm-open" aria-labelledby="tm-next-title">
        <p className="tm-eyebrow" id="tm-next-title">
          Next up
        </p>
        <h2 className="tm-next-name">{e ? `Free until ${hm(until)}` : `Your ${part} is open.`}</h2>
        {e && <p className="tm-muted">Then {e.kind === 'journey' ? 'your train' : e.place.name} at {hm(e.start)}.</p>}
        <div className="tm-actions">
          <button type="button" className="btn btn-primary tm-btn" onClick={() => openNearby('all', 'next_up')}>
            Find something nearby
          </button>
          <button type="button" className="btn tm-btn" onClick={() => ask(`We’re free${until != null ? ` until ${hm(until)}` : ''}. What should we do?`, 'open_time')}>
            ✨ Ask EuroWander
          </button>
        </div>
      </section>
    )
  }
  if (!e) return null
  if (e.kind === 'journey') {
    return (
      <section className="tm-card tm-next" aria-labelledby="tm-next-title">
        <p className="tm-eyebrow" id="tm-next-title">
          Next up
        </p>
        <h2 className="tm-next-name">
          {modeIcon(e.leg.mode)} {modeWord(e.leg.mode)} to {e.leg.to.name}
        </h2>
        <p className="tm-next-time">{e.start != null ? `${hm(e.start)}${isToday && n.startsIn != null ? ` · leaves in ${inWords(n.startsIn)}` : ''}` : 'Departure time not set'}</p>
      </section>
    )
  }
  const p = e.place
  return (
    <section className={`tm-card tm-next${n.inProgress ? ' tm-now' : ''}`} aria-labelledby="tm-next-title">
      <p className="tm-eyebrow" id="tm-next-title">
        {n.inProgress ? 'Now' : isToday ? 'Next up' : 'First up'}
      </p>
      <h2 className="tm-next-name">{p.name}</h2>
      <p className="tm-next-time">
        {e.start != null ? hm(e.start) : 'No time yet'}
        {e.timeSource === 'suggested' && <span className="tm-tag">suggested time</span>}
        {isToday && !n.inProgress && n.startsIn != null && <span> · starts in {inWords(n.startsIn)}</span>}
        {n.inProgress && <span> · until about {hm(e.end)}</span>}
      </p>
      <p className="tm-muted">
        {p.type ? `${p.type[0].toUpperCase()}${p.type.slice(1)}` : 'Place'} · {cityById[p.cityId]?.name}
        {p.description ? ` · ${p.description}` : ''}
      </p>
      <div className="tm-actions">
        <Directions place={p} className="btn btn-primary tm-btn" />
        <button type="button" className="btn tm-btn" onClick={() => openActivity(e, 'details')}>
          View place
        </button>
        <button type="button" className="btn tm-btn" onClick={() => openActivity(e, 'change')}>
          Change
        </button>
      </div>
    </section>
  )
}

function SavedNearbyCard({ env }) {
  const { trip, schedule, day, change, canMark, readOnly } = env
  if (readOnly) return null
  const hit = savedNearby(trip, schedule, day.cityId)
  if (!hit) return null
  return (
    <section className="tm-card tm-saved" aria-label="A saved place nearby">
      <p>
        <strong>You saved something nearby.</strong> {hit.place.name} is about {hit.walk} min on foot from {hit.anchor.name}.
      </p>
      <button
        type="button"
        className="btn tm-btn-sm"
        onClick={() => {
          change((t) => addToDay(t, day.number, hit.place.id))
          track('saved_place_added_today', { from: 'saved_nearby', today: canMark })
        }}
      >
        + Add stop
      </button>
    </section>
  )
}

function FreeTimeCard({ env }) {
  const { schedule, nowMin, isToday, openNearby, ask, readOnly } = env
  if (!isToday || readOnly) return null
  // The stretch going on now is in Next Up; this is the next one.
  const gap = freeTime(schedule, nowMin).find((g) => g.from > nowMin) || null
  if (!gap) return null
  return (
    <section className="tm-card tm-free" aria-label="Free time">
      <p className="tm-eyebrow">Free time</p>
      <p className="tm-free-time">
        {hm(gap.from)}–{hm(gap.to)} <span className="tm-muted">· {inWords(gap.minutes)} free</span>
      </p>
      <div className="tm-chips">
        <button type="button" className="chip tm-chip" onClick={() => openNearby('all', 'free_time')}>
          📍 Find nearby
        </button>
        <button type="button" className="chip tm-chip" onClick={() => ask(`I have ${inWords(gap.minutes)} free from ${hm(gap.from)}. Any less touristy places nearby worth it?`, 'hidden_gems')}>
          💎 Hidden gems
        </button>
        <button type="button" className="chip tm-chip" onClick={() => openNearby('coffee', 'free_time')}>
          ☕ Coffee
        </button>
        <button type="button" className="chip tm-chip" onClick={() => ask(`We have ${inWords(gap.minutes)} free from ${hm(gap.from)} to ${hm(gap.to)}. What should we do?`, 'free_time')}>
          ✨ Ask EuroWander
        </button>
      </div>
    </section>
  )
}

const FOOD = [
  ['breakfast', '🥐 Breakfast'],
  ['lunch', '🥗 Lunch'],
  ['dinner', '🍝 Dinner'],
  ['coffee', '☕ Coffee'],
  ['drinks', '🍷 Drinks'],
]

function Hungry({ env }) {
  if (env.readOnly) return null
  return (
    <section className="tm-card" aria-labelledby="tm-hungry">
      <p className="tm-eyebrow" id="tm-hungry">
        Hungry?
      </p>
      <div className="tm-chips">
        {FOOD.map(([id, label]) => (
          <button key={id} type="button" className="chip tm-chip" onClick={() => env.openNearby(id, 'hungry')}>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

function QuickActions({ env }) {
  const { ask, readOnly, day, schedule } = env
  if (readOnly) return null
  const actions = [
    ['I’m tired', 'I’m tired. Make the rest of today easier.', 'tired'],
    ['Plans changed', 'Our plans changed. Help me rework the rest of today.', 'plans_changed'],
    ['Find food', 'Find food nearby', 'food'],
    ['Nearby', 'What’s nearby?', 'nearby'],
    ['Replan today', 'Replan the rest of today', 'replan'],
    ['What next?', 'What should we do next?', 'next'],
  ]
  if (day.leg && schedule.depart != null) actions.splice(1, 0, ['Time before my train?', 'Do I have enough time before my train?', 'train'])
  return (
    <section className="tm-card" aria-labelledby="tm-quick">
      <p className="tm-eyebrow" id="tm-quick">
        ✨ Ask EuroWander
      </p>
      <div className="tm-chips">
        {actions.map(([label, prompt, kind]) => (
          <button key={kind} type="button" className="chip tm-chip" onClick={() => ask(prompt, kind)}>
            {label}
          </button>
        ))}
      </div>
      <p className="tm-source">EuroWander sees today’s plan, the time and the weather. Nothing changes until you press Apply.</p>
    </section>
  )
}

function Summary({ env }) {
  const { schedule, nowMin, isToday, days, day, showDay } = env
  if (!isToday) return null
  const s = daySummary(schedule, nowMin)
  if (!s) return null
  const tomorrow = days.find((d) => d.number === day.number + 1)
  return (
    <section className="tm-card tm-summary" aria-label="Today complete">
      <p className="tm-eyebrow">{s.remaining ? 'Today so far' : 'Today complete'}</p>
      <p>
        {s.visited} place{s.visited === 1 ? '' : 's'} visited{s.skipped ? `, ${s.skipped} skipped` : ''}
        {s.km != null && <span className="tm-muted"> · at least {s.km.toFixed(1)} km between them (straight lines)</span>}
      </p>
      {tomorrow && (
        <button type="button" className="btn tm-btn-sm" onClick={() => showDay(tomorrow.number)}>
          View tomorrow
        </button>
      )}
    </section>
  )
}

function Tomorrow({ env }) {
  const { days, day, trip, online, showDay, isToday } = env
  const next = days.find((d) => d.number === day.number + 1)
  const city = next ? cityById[next.cityId] : null
  const forecast = useDailyForecast(city, online)
  if (!next) return isToday ? <p className="tm-muted tm-pad">This is the last day of your trip.</p> : null
  const s = daySchedule(trip, next)
  const count = s.entries.filter((e) => e.kind === 'place').length
  const row = forecast?.days?.find((r) => r.date === next.iso)
  return (
    <section className="tm-card tm-tomorrow" aria-labelledby="tm-tomorrow">
      <p className="tm-eyebrow" id="tm-tomorrow">
        {isToday ? 'Tomorrow' : `Day ${next.number}`}
      </p>
      <p className="tm-route">
        {city.name} {flagOf(city.id)}
      </p>
      {next.leg && (
        <p>
          {modeIcon(next.leg.mode)} {modeWord(next.leg.mode)} from {next.leg.from.name}
          {s.depart != null ? ` at ${hm(s.depart)}` : ', time not set yet'}
        </p>
      )}
      <p>
        {count ? `${count} ${count === 1 ? 'activity' : 'activities'} planned` : 'Nothing planned yet'}
        {row && <span className="tm-muted"> · {dailyLine(row)}{forecast.fresh ? '' : ' (saved forecast)'}</span>}
      </p>
      <button type="button" className="btn tm-btn-sm" onClick={() => showDay(next.number)}>
        Preview {isToday ? 'tomorrow' : `day ${next.number}`}
      </button>
    </section>
  )
}

function Progress({ env }) {
  const p = dayProgress(env.schedule)
  if (!p.total) return null
  return (
    <p className="tm-progress">
      <strong>{env.isToday ? 'Today' : `Day ${env.day.number}`}</strong>: {p.done} of {p.total} completed{p.skipped ? `, ${p.skipped} skipped` : ''}
      <progress max={p.total} value={p.done} aria-hidden="true" />
    </p>
  )
}

export default function TodayView({ env }) {
  const { day, schedule } = env
  const places = schedule.entries.filter((e) => e.kind === 'place')
  return (
    <>
      <WeatherCard env={env} />
      {day.leg && <TravelDayCard env={env} />}
      <NextUpCard env={env} />
      <SavedNearbyCard env={env} />
      <FreeTimeCard env={env} />
      <section className="tm-section" aria-labelledby="tm-timeline-title">
        <h2 className="tm-h2" id="tm-timeline-title">
          {env.isToday ? 'Today' : 'This day'}
        </h2>
        <Progress env={env} />
        {places.length === 0 && !day.leg ? (
          <p className="tm-muted">Nothing planned{env.isToday ? ' today' : ''}. A free day to wander, or find something nearby.</p>
        ) : (
          <Timeline env={env} />
        )}
        {schedule.note && <p className="tm-note">📝 {schedule.note}</p>}
        {schedule.entries.some((e) => e.timeSource === 'suggested') && (
          <p className="tm-source">Suggested times follow your order, typical visit lengths and walking time. Set your own with Edit.</p>
        )}
      </section>
      <Hungry env={env} />
      <QuickActions env={env} />
      <Summary env={env} />
      <Tomorrow env={env} />
    </>
  )
}
