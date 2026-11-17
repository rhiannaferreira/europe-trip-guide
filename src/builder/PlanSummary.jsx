import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { paceById } from '../planner/preferences.js'
import { JourneyMeta, RailRoute, SectionEyebrow } from '../components/RailRoute.jsx'

const MODE_NAMES = { train: 'train', bus: 'bus', 'rail + ferry': 'rail + ferry', flight: 'flight' }

// The plan at a glance: plain counts and sums from the route, and what might make it hard going.
// There's deliberately no overall score; each number says what it is.
export default function PlanSummary({ plan, legs = [], stats, warnings, costly, onFix, onOpenStop, children }) {
  const route = plan.stops.map((s) => cityById[s.cityId].name)
  const home = plan.prefs.roundTrip && plan.stops.length > 1 ? cityById[plan.prefs.startCityId] : null
  const stops = [
    ...plan.stops.map((s, i) => ({ key: `${s.cityId}-${i}`, name: cityById[s.cityId].name, sub: `${s.nights} night${s.nights === 1 ? '' : 's'}` })),
    ...(home ? [{ key: 'home', name: home.name, sub: 'home' }] : []),
  ]
  const title = home ? `Round trip from ${home.name}` : route.length > 1 ? `${route[0]} to ${route[route.length - 1]}` : route[0]
  const modes = Object.entries(stats.modes)
    .map(([m, n]) => `${n} ${MODE_NAMES[m] || m}${n === 1 ? '' : m === 'bus' ? 'es' : 's'}`)
    .join(', ')
  return (
    <section className="plan-summary" aria-labelledby="plan-summary-title">
      <SectionEyebrow>Your journey</SectionEyebrow>
      <h2 id="plan-summary-title" className="plan-route-title rail-title">
        {title}
      </h2>
      <JourneyMeta
        className="plan-sub"
        items={[
          `${stats.days} day${stats.days === 1 ? '' : 's'}`,
          `${stats.nights} night${stats.nights === 1 ? '' : 's'}`,
          `${stats.countries.length} countr${stats.countries.length === 1 ? 'y' : 'ies'}`,
          plan.prefs.startDate && `${plan.prefs.startDate} to ${plan.prefs.endDate}`,
        ]}
      />
      {stops.length > 1 && (
        <div className="rail-scroll plan-rail">
          <RailRoute direction="horizontal" label={`Route: ${stops.map((s) => s.name).join(', ')}`} stops={stops} legs={legs} />
        </div>
      )}

      {/* The three numbers that decide whether a trip feels good; the rest wait behind "All the numbers". */}
      <dl className="plan-keys">
        <div>
          <dt>Travel time</dt>
          <dd>~{formatDuration(stats.travelMinutes)}</dd>
        </div>
        <div>
          <dt>Longest leg</dt>
          <dd>{legs.length ? `~${formatDuration(Math.max(...legs.map((l) => l.minutes)))}` : '—'}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd className={`pace-${stats.pace?.id || ''}`}>{stats.pace ? stats.pace.label : '—'}</dd>
        </div>
      </dl>

      <details className="how-calculated">
        <summary>All the numbers</summary>
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
      {children}
    </section>
  )
}

const FIX_LABEL = {
  make_relaxed: 'Make it more relaxed',
  reduce_travel: 'Reduce travel',
  optimize_order: 'Reorder the stops',
  make_cheaper: 'Make it cheaper',
}
