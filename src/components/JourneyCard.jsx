// One train journey: times on the stations' clocks, what's known about it right now, changes, operators,
// trains and platforms. A journey without real-time data is SCHEDULED and never called "on time".
import { useState } from 'react'
import { journeyState, stationName } from '../services/live/trains.js'
import { clock, dayIn, durationText } from '../services/live/time.js'
import { Freshness, SourceLabel } from './LiveBits.jsx'

// Departure or arrival time: the timetable time, and the live one beside it (struck through) when it moved.
function Time({ times, tz, cancelled }) {
  const sched = clock(times.scheduled, tz)
  const exp = times.expected ? clock(times.expected, tz) : null
  if (exp && exp !== sched && !cancelled) {
    return (
      <span>
        <s aria-label={`timetable ${sched}`}>{sched}</s>
        <span aria-label={`now ${exp}`}>{exp}</span>
      </span>
    )
  }
  return <span>{sched}</span>
}

// What the journey's status says in words, and how it looks.
export function statusLine(j) {
  const s = journeyState(j)
  if (s.kind === 'cancelled') return { label: 'Cancelled', tone: 'bad', source: 'realtime' }
  if (s.kind === 'delayed') return { label: s.at === 'arrival' ? `Arriving ${s.delay} min late` : `${s.delay} min late`, tone: 'late', source: 'realtime' }
  if (s.kind === 'realtime') return { label: s.at === 'arrival' ? 'Arriving on time' : 'On time', tone: 'good', source: 'realtime' }
  if (s.kind === 'partial') return { label: 'Live data for part of the journey only', tone: '', source: 'realtime' }
  return { label: `Scheduled ${clock(j.departure.scheduled, j.origin.tz)}`, tone: '', source: 'scheduled' }
}

const changesText = (j) => (j.transfers === 0 ? 'Direct' : j.transfers === 1 ? `1 change at ${stationName(j.changes[0])}` : `${j.transfers} changes`)

export default function JourneyCard({ journey: j, onChoose, chosen = false, chooseLabel = 'Choose this train', showStatus = true, updatedAt = null, children }) {
  const [open, setOpen] = useState(false)
  const status = statusLine(j)
  const plusDays = dayIn(j.arrival.scheduled, j.destination.tz) !== dayIn(j.departure.scheduled, j.origin.tz)
  const track = j.departure.track || j.departure.scheduledTrack
  const trackChanged = j.departure.track && j.departure.scheduledTrack && j.departure.track !== j.departure.scheduledTrack
  const alerts = (j.legs || []).flatMap((l) => l.alerts || [])
  const services = (j.legs || []).map((l) => l.service).filter(Boolean)
  return (
    <article className={`journey${j.cancelled ? ' cancelled' : ''}`} aria-label={`${clock(j.departure.scheduled, j.origin.tz)} from ${stationName(j.origin.name)} to ${stationName(j.destination.name)}`}>
      <div className="journey-top">
        <span className="journey-times">
          <Time times={j.departure} tz={j.origin.tz} cancelled={j.cancelled} /> → <Time times={j.arrival} tz={j.destination.tz} cancelled={j.cancelled} />
          {plusDays && <small title="Arrives the next day"> +1 day</small>}
        </span>
        {showStatus && (
          <span>
            <SourceLabel kind={status.source} />{' '}
            {status.source === 'realtime' && <span className={`journey-live ${status.tone}`}>{status.label}</span>}
          </span>
        )}
      </div>
      <p className="journey-meta">
        {stationName(j.origin.name)} → {stationName(j.destination.name)}
      </p>
      <p className="journey-meta">
        {durationText(j.durationMin)} · {changesText(j)}
        {j.operators?.length > 0 && <> · {j.operators.join(', ')}</>}
        {services.length > 0 && <> · {services.join(', ')}</>}
      </p>
      {track && (
        <p className="journey-meta">
          Platform {track}
          {trackChanged && <strong> (changed from {j.departure.scheduledTrack})</strong>}
          {!j.departure.track && ' (timetable, may change)'}
        </p>
      )}
      {showStatus && status.source === 'scheduled' && <p className="journey-meta">No live updates for this train yet. Times are from the timetable.</p>}
      {alerts.slice(0, 2).map((a, i) => (
        <p key={i} className="journey-alert" role="note">
          ⚠️ {a.header || a.description}
          {a.header && a.description && open && <span> {a.description}</span>}
        </p>
      ))}
      {open && j.legs?.length > 0 && (
        <ol className="journey-legs">
          {j.legs.map((l, i) => (
            <li key={i}>
              {clock(l.from.scheduled, l.from.tz)} {stationName(l.from.name)}
              {(l.from.track || l.from.scheduledTrack) && ` (platform ${l.from.track || l.from.scheduledTrack})`} → {clock(l.to.scheduled, l.to.tz)} {stationName(l.to.name)}
              {(l.service || l.operator) && <span className="tm-muted"> · {[l.service, l.operator].filter(Boolean).join(', ')}</span>}
              {l.mode !== 'train' && <span className="tm-muted"> · {l.mode}</span>}
              {l.cancelled && <strong> · cancelled</strong>}
            </li>
          ))}
        </ol>
      )}
      {children}
      <div className="journey-actions">
        {onChoose && (
          <button type="button" className={`btn${chosen ? '' : ' btn-primary'}`} onClick={() => onChoose(j)} aria-pressed={chosen}>
            {chosen ? '✓ In your trip' : chooseLabel}
          </button>
        )}
        {j.legs?.length > 0 && (
          <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide details' : 'Details'}
          </button>
        )}
        {j.bookingUrl && (
          <a className="btn" href={j.bookingUrl} target="_blank" rel="noopener noreferrer">
            Book with the operator
          </a>
        )}
      </div>
      {updatedAt && <Freshness at={updatedAt} />}
    </article>
  )
}
