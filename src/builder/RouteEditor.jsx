import { useState } from 'react'
import { cities, cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { formatDuration } from '../lib/format.js'
import { additionIdeas, alternativesFor } from '../planner/alternatives.js'
import { addStop, anotherOption, changeNights, moveStop, regenerateFrom, removeStop, replaceStop } from '../planner/modify.js'
import { modeIcon, sourceLabel } from '../planner/transport.js'
import DataBadge from './DataBadge.jsx'
import TrainSearchModal from '../components/TrainSearch.jsx'
import { hasRail } from '../services/live/trains.js'
import { useLiveEnabled } from '../components/LiveBits.jsx'

const ROLE = { start: 'Your start', end: 'Your end', must: 'Your pick', user: 'You added' }
const byName = [...cities].sort((a, b) => a.name.localeCompare(b.name))

// The date of the travel day into stop i: the start date plus the nights before it.
function legDate(plan, i) {
  if (!plan.prefs.startDate) return ''
  const d = new Date(`${plan.prefs.startDate}T12:00:00`)
  d.setDate(d.getDate() + plan.stops.slice(0, i).reduce((sum, s) => sum + s.nights, 0))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Leg({ leg, limit, date = '' }) {
  const [trains, setTrains] = useState(false)
  const railOn = useLiveEnabled('rail')
  if (!leg) return null
  // Real timetables only once the trip has dates, and only when asked: nothing is searched in the background.
  const canSearch = railOn && date && leg.mode !== 'flight' && hasRail(leg.from.id) && hasRail(leg.to.id)
  const over = limit && leg.minutes > limit
  return (
    <li className={`plan-leg${over ? ' over' : ''}`}>
      <span aria-hidden="true">{modeIcon(leg.mode)}</span>
      <span>
        <strong>~{formatDuration(leg.minutes)}</strong> {leg.mode === 'flight' ? 'flight' : leg.mode}
        {leg.km ? `, ${Math.round(leg.km)} km` : ''}
        {leg.isReturn && ` back to ${leg.to.name}`}
        {leg.note && <small className="leg-note">{leg.note}</small>}
        {over && <small className="leg-note warn-text">Longer than your {formatDuration(limit)} limit</small>}
      </span>
      <DataBadge kind="estimate" title={`${sourceLabel(leg.source)}. Not a live timetable.`} />
      {canSearch && (
        <button type="button" className="btn btn-small leg-trains" onClick={() => setTrains(true)}>
          🚆 Real trains
        </button>
      )}
      {trains && <TrainSearchModal fromCityId={leg.from.id} toCityId={leg.to.id} date={date} estimate={leg} onClose={() => setTrains(false)} />}
    </li>
  )
}

// Alternatives for one stop, with the goals the traveller can ask for.
function ReplacePanel({ plan, index, onPick, onClose }) {
  const [goal, setGoal] = useState({ lessTouristy: false, cheaper: false, lessTravel: false })
  const alts = alternativesFor(plan, index, { goal, limit: 4 })
  const flip = (k) => setGoal((g) => ({ ...g, [k]: !g[k] }))
  return (
    <div className="stop-panel">
      <div className="interest-chips" role="group" aria-label="What should the replacement be?">
        {[
          ['lessTouristy', 'Less touristy'],
          ['cheaper', 'Cheaper'],
          ['lessTravel', 'Less travel'],
        ].map(([k, label]) => (
          <button key={k} type="button" className={`chip${goal[k] ? ' chip-picked' : ''}`} aria-pressed={goal[k]} onClick={() => flip(k)}>
            {label}
          </button>
        ))}
      </div>
      {alts.length === 0 ? (
        <p className="empty">No other city fits here with those goals.</p>
      ) : (
        <ul className="alt-list">
          {alts.map((a) => (
            <li key={a.cityId}>
              <div>
                <strong>
                  {cityById[a.cityId].name} {countryByCode[cityById[a.cityId].country]?.flag}
                </strong>
                <small>Why it fits: {a.reasons.join('; ')}</small>
              </div>
              <button type="button" className="btn" onClick={() => onPick(a.cityId)}>
                Use
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="link-btn small" onClick={onClose}>
        Close
      </button>
    </div>
  )
}

function AddPanel({ plan, onAdd, onClose }) {
  const [pick, setPick] = useState('')
  const ideas = additionIdeas(plan, { limit: 4 })
  const inPlan = new Set(plan.stops.map((s) => s.cityId))
  return (
    <div className="stop-panel">
      {ideas.length > 0 && (
        <ul className="alt-list">
          {ideas.map((a) => (
            <li key={a.cityId}>
              <div>
                <strong>
                  {cityById[a.cityId].name} {countryByCode[cityById[a.cityId].country]?.flag}
                </strong>
                <small>Why it fits: {a.reasons.join('; ')}</small>
              </div>
              <button type="button" className="btn" onClick={() => onAdd(a.cityId)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="inline-field">
        Or pick any city
        <select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Choose…</option>
          {byName
            .filter((c) => !inPlan.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {countryByCode[c.country]?.flag}
              </option>
            ))}
        </select>
      </label>
      <div className="stop-panel-actions">
        <button type="button" className="btn" disabled={!pick} onClick={() => onAdd(pick)}>
          Add to the route
        </button>
        <button type="button" className="link-btn small" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

// The route, stop by stop: nights, order, replace, another option, remove, re-plan from here, add.
// Every change goes through modify.js and comes back with a summary; nothing is changed in place.
export default function RouteEditor({ plan, legs, keepLength, openIndex, onOpen, onChange }) {
  const [seen, setSeen] = useState({})
  const limit = plan.prefs.maxLegMinutes
  const change = (result, meta) => onChange(result, meta)
  const n = plan.stops.length

  return (
    <div className="route-editor">
      <ol className="plan-stops">
        {plan.stops.map((stop, i) => {
          const c = cityById[stop.cityId]
          const leg = i > 0 ? legs[i - 1] : null
          return [
            leg && <Leg key={`leg-${i}`} leg={leg} limit={limit} date={legDate(plan, i)} />,
            <li key={stop.cityId} className="plan-stop">
              <div className="plan-stop-head">
                <span className="stop-number">{i + 1}</span>
                <h3>
                  {c.name} <span aria-hidden="true">{countryByCode[c.country]?.flag}</span>
                  {c.hiddenGem && <span className="badge badge-gem">💎 Hidden gem</span>}
                  {ROLE[stop.role] && <span className="badge badge-user">{ROLE[stop.role]}</span>}
                </h3>
                <div className="nights-stepper" role="group" aria-label={`Nights in ${c.name}`}>
                  <button type="button" aria-label={`One night less in ${c.name}`} disabled={stop.nights <= (n === 1 ? 0 : 1)} onClick={() => change(changeNights(plan, i, -1, { keepLength }))}>
                    −
                  </button>
                  <span>
                    {stop.nights} night{stop.nights === 1 ? '' : 's'}
                  </span>
                  <button type="button" aria-label={`One night more in ${c.name}`} onClick={() => change(changeNights(plan, i, 1, { keepLength }))}>
                    +
                  </button>
                </div>
              </div>
              {stop.why?.length > 0 && <p className="plan-why">Why it fits: {stop.why.join('; ')}</p>}
              <div className="plan-stop-tools">
                <button type="button" className="link-btn small" disabled={i === 0} onClick={() => change(moveStop(plan, i, -1))} aria-label={`Move ${c.name} earlier`}>
                  ↑ Earlier
                </button>
                <button type="button" className="link-btn small" disabled={i === n - 1} onClick={() => change(moveStop(plan, i, 1))} aria-label={`Move ${c.name} later`}>
                  ↓ Later
                </button>
                <button type="button" className="link-btn small" aria-expanded={openIndex === i} onClick={() => onOpen(openIndex === i ? null : i)}>
                  Replace
                </button>
                <button
                  type="button"
                  className="link-btn small"
                  onClick={() => {
                    const list = [...(seen[i] || []), stop.cityId]
                    setSeen((s) => ({ ...s, [i]: list }))
                    change(anotherOption(plan, i, { seen: list }), { replaced: true })
                  }}
                >
                  Another option
                </button>
                {n > 1 && (
                  <button type="button" className="link-btn small" onClick={() => change(removeStop(plan, i, { keepLength }))}>
                    Remove
                  </button>
                )}
                {i < n - 1 && (
                  <button type="button" className="link-btn small" onClick={() => change(regenerateFrom(plan, i + 1))}>
                    Re-plan after this
                  </button>
                )}
              </div>
              {openIndex === i && (
                <ReplacePanel
                  plan={plan}
                  index={i}
                  onClose={() => onOpen(null)}
                  onPick={(cityId) => {
                    onOpen(null)
                    change(replaceStop(plan, i, cityId), { replaced: true })
                  }}
                />
              )}
            </li>,
          ]
        })}
        {legs.filter((l) => l.isReturn).map((l) => (
          <Leg key="home" leg={l} limit={limit} />
        ))}
      </ol>
      <div className="plan-add">
        <button type="button" className="btn" aria-expanded={openIndex === 'add'} onClick={() => onOpen(openIndex === 'add' ? null : 'add')}>
          + Add a city
        </button>
        {keepLength && <span className="rule">Your dates are fixed, so nights move between stops instead of lengthening the trip.</span>}
      </div>
      {openIndex === 'add' && (
        <AddPanel
          plan={plan}
          onClose={() => onOpen(null)}
          onAdd={(cityId) => {
            onOpen(null)
            change(addStop(plan, cityId, { keepLength }))
          }}
        />
      )}
    </div>
  )
}
