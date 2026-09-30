import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { formatDuration } from '../lib/format.js'
import { paceById } from '../planner/preferences.js'

const MODE_NAMES = { train: 'train', bus: 'bus', 'rail + ferry': 'rail + ferry', flight: 'flight' }

// The plan at a glance: plain counts and sums from the route, and what might make it hard going.
// There's deliberately no overall score; each number says what it is.
export default function PlanSummary({ plan, stats, warnings, costly, onFix, onOpenStop }) {
  const route = plan.stops.map((s) => cityById[s.cityId].name)
  const modes = Object.entries(stats.modes)
    .map(([m, n]) => `${n} ${MODE_NAMES[m] || m}${n === 1 ? '' : m === 'bus' ? 'es' : 's'}`)
    .join(', ')
  return (
    <section className="plan-summary" aria-labelledby="plan-summary-title">
      <h2 id="plan-summary-title" className="plan-route-title">
        {route.join(' → ')}
        {plan.prefs.roundTrip && ` → ${cityById[plan.prefs.startCityId].name}`}
      </h2>
      <p className="plan-sub">
        {stats.days} day{stats.days === 1 ? '' : 's'}, {stats.nights} night{stats.nights === 1 ? '' : 's'} · {stats.countries.map((c) => countryByCode[c]?.flag).join(' ')}{' '}
        {stats.countries.length} countr{stats.countries.length === 1 ? 'y' : 'ies'}
        {plan.prefs.startDate && ` · ${plan.prefs.startDate} to ${plan.prefs.endDate}`}
      </p>

      <div className="stats plan-stats">
        <div className="stat">
          <span className="stat-label">Cities</span>
          <span className="stat-value">{stats.cities}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Journeys</span>
          <span className="stat-value">
            {stats.transfers} {modes && <small>{modes}</small>}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Travel time</span>
          <span className="stat-value">
            ~{formatDuration(stats.travelMinutes)} <small>{Math.round(stats.wakingShare * 100)}% of waking hours</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Average journey</span>
          <span className="stat-value">{stats.transfers ? `~${formatDuration(stats.avgTransferMinutes)}` : '—'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Over 4 hours</span>
          <span className="stat-value">{stats.longTransfers}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Pace</span>
          <span className={`stat-value pace-${stats.pace?.id || ''}`}>
            {stats.pace ? stats.pace.label : '—'} <small>{stats.daysPerCity.toFixed(1)} days/city</small>
          </span>
        </div>
      </div>
      <details className="how-calculated">
        <summary>How these are worked out</summary>
        <ul>
          <li>A trip of N days has N − 1 nights. The first day at each new stop is a travel day.</li>
          <li>Journey times are sample fastest trains where Eurowander has them, otherwise estimated from the distance; flights are rough door-to-door estimates including airports.</li>
          <li>Waking hours are 16 a day. Pace uses the same rule as My Trip: under 2 days per city is fast, over 3 is relaxed.</li>
          <li>You chose: {paceById[plan.prefs.pace]?.label.toLowerCase()} pace, longest journey {plan.prefs.maxLegMinutes ? formatDuration(plan.prefs.maxLegMinutes) : 'no limit'}.</li>
          {stats.estimatedLegs > 0 && <li>{stats.estimatedLegs} of the journeys are estimates rather than sample times.</li>}
        </ul>
      </details>

      {(warnings.length > 0 || costly) && (
        <ul className="notes plan-warnings" aria-label="Things to know">
          {costly && (
            <li className="note note-warn">
              {costly.text}{' '}
              <button type="button" className="link-btn small" onClick={() => onOpenStop(costly.index)}>
                See closer options
              </button>
            </li>
          )}
          {warnings.map((w) => (
            <li key={w.id} className={`note ${w.level === 'warn' ? 'note-warn' : 'note-tip'}`}>
              {w.text}{' '}
              {w.fix &&
                (w.fix.type === 'alternatives' ? (
                  <button type="button" className="link-btn small" onClick={() => onOpenStop(w.fix.index)}>
                    See other cities
                  </button>
                ) : (
                  <button type="button" className="link-btn small" onClick={() => onFix(w.fix)}>
                    {FIX_LABEL[w.fix.type] || 'Fix it'}
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const FIX_LABEL = {
  make_relaxed: 'Make it more relaxed',
  reduce_travel: 'Reduce travel',
  optimize_order: 'Reorder the stops',
  make_cheaper: 'Make it cheaper',
}
