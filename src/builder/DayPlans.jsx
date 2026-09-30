import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { dayLoad, lightenDay, OPENING_HOURS_NOTE } from '../planner/dayPlanner.js'
import DataBadge from './DataBadge.jsx'

const SLOT = { travel: 'Travel', morning: 'Morning', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'Evening' }
const KIND = { arrival: 'Travel day', first: 'First day', last: 'Last day', full: 'Full day' }
export const dayTitle = (d) =>
  d.date ? new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Day ${d.number}`

// "Plan my days": what each day could look like, grouped by area, with lighter travel days.
export default function DayPlans({ days, planned, edited, onPlan, onChangeDays, onReset }) {
  if (!planned) {
    return (
      <div className="builder-empty">
        <p>Get a suggested plan for every day: nearby sights grouped together, lunch close to the morning stop, and lighter days when you travel.</p>
        <button type="button" className="btn btn-primary" onClick={onPlan}>
          Plan my days
        </button>
      </div>
    )
  }
  const busiest = Math.max(...days.map((d) => dayLoad(d).score))
  return (
    <div className="day-plans">
      <p className="rule">
        Suggestions from Eurowander’s places, grouped by distance. {OPENING_HOURS_NOTE} {edited && (
          <button type="button" className="link-btn small" onClick={onReset}>
            Undo my day edits
          </button>
        )}
      </p>
      {days.map((d) => {
        const load = dayLoad(d)
        const city = cityById[d.cityId]
        return (
          <article key={d.number} className={`plan-day kind-${d.kind}`} aria-labelledby={`plan-day-${d.number}`}>
            <header>
              <h3 id={`plan-day-${d.number}`}>
                Day {d.number}
                {d.date && <span> · {dayTitle(d)}</span>} · {city.name}
              </h3>
              <span className="plan-day-kind">{KIND[d.kind] || ''}</span>
            </header>
            <ul className="plan-day-items">
              {d.items.map((it, k) => {
                const place = it.placeId ? placeById[it.placeId] : null
                return (
                  <li key={`${it.slot}-${it.placeId || k}`} className={`slot-${it.slot}`}>
                    <span className="slot-name">{SLOT[it.slot]}</span>
                    <span>
                      {place ? <strong>{place.name}</strong> : it.label}
                      {it.reasons?.length > 0 && <small>{it.reasons.join(' · ')}</small>}
                    </span>
                  </li>
                )
              })}
            </ul>
            {d.notes.map((n) => (
              <p key={n} className="note note-tip">
                {n}
              </p>
            ))}
            <footer>
              <small>
                {load.activities} activit{load.activities === 1 ? 'y' : 'ies'}
                {load.travelMinutes ? ' + travel' : ''}
                {load.score === busiest && days.length > 1 && load.score > 0 ? ' · busiest day' : ''}
              </small>
              {load.activities > 1 && (
                <button
                  type="button"
                  className="link-btn small"
                  onClick={() => {
                    const r = lightenDay(days, d.number)
                    if (r.changed) onChangeDays(r.days, r.summary)
                  }}
                >
                  Make this day lighter
                </button>
              )}
            </footer>
          </article>
        )
      })}
      <p className="rule">
        <DataBadge kind="estimate" /> Place picks and timings are suggestions, not bookings.
      </p>
    </div>
  )
}
