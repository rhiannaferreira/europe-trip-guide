import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { PACE_RULE } from '../lib/trip.js'

function Stat({ label, value, sub, className = '' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${className}`}>
        {value} {sub && <small>{sub}</small>}
      </span>
    </div>
  )
}

// Descriptive trip stats plus gentle suggestions. No scores: just numbers you can check.
export default function TripSummary({ cityIds, legs, days, pace, suggestions, children }) {
  if (cityIds.length === 0) return null
  const countries = new Set(cityIds.map((id) => cityById[id].country)).size
  const travelMinutes = legs.reduce((sum, l) => sum + l.minutes, 0)
  const anyRough = legs.some((l) => l.estimated)
  const allTrain = legs.every((l) => l.mode === 'train')

  return (
    <section className="trip-summary-card" aria-labelledby="summary-title">
      <h2 className="section-title" id="summary-title">
        Trip summary
      </h2>
      <div className="stats">
        <Stat label="Cities" value={cityIds.length} />
        <Stat label="Countries" value={countries} />
        <Stat label="Trip length" value={days ? `${days} day${days === 1 ? '' : 's'}` : '—'} sub={days ? '' : 'add dates'} />
        <Stat
          label={allTrain ? 'Train travel' : 'Travel time'}
          value={legs.length ? `~${formatDuration(travelMinutes)}` : '—'}
          sub={legs.length ? (anyRough ? 'estimate, some rough' : 'estimate') : ''}
        />
        <Stat label="Days per city" value={pace ? pace.perCity.toFixed(1) : '—'} />
        <Stat label="Trip pace" value={pace ? pace.label : '—'} className={pace ? `pace-${pace.label.split('-')[0].toLowerCase()}` : ''} />
      </div>
      <p className="rule">
        Pace rule: {PACE_RULE} Travel times are estimates from sample data, not live timetables.
      </p>

      {suggestions.length > 0 && (
        <ul className="notes">
          {suggestions.map((s) => (
            <li key={s} className="note note-tip">
              💡 {s}
            </li>
          ))}
        </ul>
      )}
      {children}
    </section>
  )
}
