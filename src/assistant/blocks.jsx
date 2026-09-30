// The cards the copilot draws in the chat: places, cities, routes, budgets, day plans, weather, comparisons,
// a trip to build, and proposed trip changes with a before/after preview. Every button carries an effect
// the panel runs (AssistantPanel.jsx); nothing here changes a trip by itself.
//
// `env`: { handle, tripKey (the open trip's key now), run(effect) → note | null, done, mark(key, note) }
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { placeById } from '../data/places.js'
import { costLabel, formatDuration } from '../lib/format.js'
import { describe } from '../lib/weather.js'
import { formatMoney } from '../utils/budgetCalculations.js'
import DataBadge from '../builder/DataBadge.jsx'
import { dayName } from './tripRun.js'

const cityName = (id) => cityById[id]?.name || id
const flag = (id) => countryByCode[cityById[id]?.country]?.flag || ''
const hours = (m) => formatDuration(Math.round(m))
const modeIcon = (mode) => (mode === 'flight' ? '✈️' : mode === 'bus' ? '🚌' : '🚆')
const stayLine = (stops) => stops.map((s) => `${cityName(s.cityId)} ${s.nights}n`).join(' → ')

// A button that runs an effect once and then shows what happened.
function Act({ id, effect, env, children, primary = false }) {
  const done = env.done?.[id]
  if (done) return <span className="cp-done">✓ {done.short || 'Done'}</span>
  return (
    <button
      type="button"
      className={primary ? 'btn btn-primary cp-btn' : 'chip cp-chip'}
      onClick={() => {
        const note = env.run(effect)
        if (note) env.mark(id, note)
      }}
    >
      {children}
    </button>
  )
}

function PlaceCard({ item, day, env }) {
  const p = placeById[item.placeId]
  if (!p) return null
  const interest = interestById[p.category]
  const saved = Boolean(env.handle?.trip?.statuses?.[p.id])
  // Days of the open trip in this place's city, for "Add to day".
  const days = (env.handle?.days || []).filter((d) => d.cityId === p.cityId && !d.items.some((i) => i.placeId === p.id))
  const target = day && days.find((d) => d.number === day)
  const key = `place:${p.id}`
  return (
    <li className="cp-card">
      <div className="cp-card-top">
        <span className="cp-emoji" aria-hidden="true" style={{ background: `var(--${p.category})` }}>
          {interest?.icon || '📍'}
        </span>
        <div>
          <strong>{p.name}</strong>
          <span className="cp-sub">
            {flag(p.cityId)} {cityName(p.cityId)} · {interest?.label || p.category}
            {p.rating != null && <> · ⭐ {p.rating.toFixed(1)}</>}
            {p.costLevel != null && <> · {costLabel(p.costLevel)}</>}
          </span>
        </div>
      </div>
      {item.note && <p className="cp-note">{item.note}</p>}
      {p.description && <p className="cp-desc">{p.description}</p>}
      <div className="cp-actions">
        <Act id={`${key}:map`} effect={{ type: 'map', cityId: p.cityId, placeId: p.id }} env={env}>
          📍 View
        </Act>
        {saved ? <span className="cp-done">✓ Saved</span> : <Act id={`${key}:save`} effect={{ type: 'save_place', placeId: p.id }} env={env}>♡ Save</Act>}
        {target ? (
          <Act id={`${key}:day`} effect={{ type: 'add_to_day', placeId: p.id, day: target.number }} env={env}>
            + Add to {dayName(target)}
          </Act>
        ) : days.length > 0 && !env.done?.[`${key}:day`] ? (
          <label className="cp-select">
            <span className="visually-hidden">Add {p.name} to a day</span>
            <select
              value=""
              onChange={(e) => {
                const n = Number(e.target.value)
                const note = n && env.run({ type: 'add_to_day', placeId: p.id, day: n })
                if (note) env.mark(`${key}:day`, note)
              }}
            >
              <option value="">+ Add to day…</option>
              {days.map((d) => (
                <option key={d.number} value={d.number}>
                  {dayName(d)}
                </option>
              ))}
            </select>
          </label>
        ) : env.done?.[`${key}:day`] ? (
          <span className="cp-done">✓ {env.done[`${key}:day`].short}</span>
        ) : null}
      </div>
    </li>
  )
}

function CityCard({ item, env }) {
  const c = cityById[item.cityId]
  if (!c) return null
  const inTrip = env.handle?.plan.stops.some((s) => s.cityId === c.id)
  const key = `city:${c.id}`
  return (
    <li className="cp-card">
      <div className="cp-card-top">
        <span className="cp-emoji cp-flag" aria-hidden="true">
          {flag(c.id)}
        </span>
        <div>
          <strong>{c.name}</strong>
          <span className="cp-sub">{countryByCode[c.country]?.name}</span>
        </div>
      </div>
      {item.why?.length > 0 && (
        <ul className="cp-why">
          {item.why.map((w) => (
            <li key={w}>✓ {w}</li>
          ))}
        </ul>
      )}
      {item.train && (
        <p className="cp-train">
          {modeIcon(item.train.mode)} {hours(item.train.minutes)} from {cityName(item.train.from)}
          {item.train.source !== 'sample' && <span className="cp-est"> (estimate)</span>}
        </p>
      )}
      <div className="cp-actions">
        <Act id={`${key}:open`} effect={{ type: 'navigate', to: `/city/${c.id}` }} env={env}>
          Explore
        </Act>
        {inTrip ? (
          <span className="cp-done">✓ In your trip</span>
        ) : (
          <Act id={`${key}:add`} effect={env.handle ? { type: 'ask', prompt: `Add ${c.name} to my trip` } : { type: 'add_city', cityId: c.id }} env={env}>
            + Add to trip
          </Act>
        )}
        <Act id={`${key}:map`} effect={{ type: 'map', cityId: c.id }} env={env}>
          📍 Map
        </Act>
      </div>
    </li>
  )
}

function RouteBlock({ block }) {
  return (
    <div className="cp-route">
      <ol>
        {block.legs.map((l, i) => (
          <li key={i}>
            <span>
              {flag(l.from)} {cityName(l.from)} → {flag(l.to)} {cityName(l.to)}
            </span>
            <span className="cp-sub">
              {modeIcon(l.mode)} ~{hours(l.minutes)}
              {l.source !== 'sample' && ' (estimate)'}
            </span>
          </li>
        ))}
      </ol>
      {block.total != null && (
        <p className="cp-total">
          Total travel: <strong>~{hours(block.total)}</strong>
        </p>
      )}
    </div>
  )
}

function BudgetBlock({ block }) {
  const money = (n) => formatMoney(n, block.currency)
  return (
    <div className="cp-budget">
      <table>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">
                {r.icon} {r.label}
              </th>
              <td>{money(r.amount)}</td>
            </tr>
          ))}
          <tr className="cp-sum">
            <th scope="row">Estimated total</th>
            <td>{money(block.total)}</td>
          </tr>
          {block.budget != null && (
            <>
              <tr>
                <th scope="row">Your budget</th>
                <td>{money(block.budget)}</td>
              </tr>
              <tr className={block.remaining < 0 ? 'cp-over' : 'cp-under'}>
                <th scope="row">{block.remaining < 0 ? 'Over by' : 'Left over'}</th>
                <td>{money(Math.abs(block.remaining))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      {block.perCity?.length > 1 && (
        <details>
          <summary>By city</summary>
          <ul>
            {[...block.perCity]
              .sort((a, b) => b.amount - a.amount)
              .map((c) => (
                <li key={c.cityId}>
                  {flag(c.cityId)} {cityName(c.cityId)}: {money(c.amount)}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function DaysBlock({ days }) {
  return (
    <ul className="cp-days">
      {days.map((d) => (
        <li key={d.number}>
          <strong>
            {dayName(d)} · {cityName(d.cityId)}
          </strong>
          {d.before && (
            <span className="cp-sub cp-before">
              Before: {d.before.length ? d.before.join(', ') : 'nothing planned'}
            </span>
          )}
          <span className="cp-sub">
            {d.before ? 'After: ' : ''}
            {d.after.length ? d.after.join(', ') : 'Free day'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function WeatherBlock({ block }) {
  return (
    <ul className="cp-weather">
      {block.days.map((d) => {
        const w = describe(d.weather.code)
        return (
          <li key={d.number} className={d.weather.wet ? 'cp-wet' : ''}>
            <span aria-hidden="true">{w.icon}</span>
            <span>
              {dayName(d)} · {cityName(d.cityId)}
            </span>
            <span className="cp-sub">
              {w.text}, {d.weather.max}° / {d.weather.min}°{d.weather.rain != null && `, ${d.weather.rain}% rain`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CompareBlock({ block }) {
  return (
    <div className="cp-compare">
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Measure</span>
            </th>
            {block.cities.map((id) => (
              <th key={id} scope="col">
                {flag(id)} {cityName(id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {r.values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BuildBlock({ block, env, id }) {
  return (
    <div className="cp-option">
      <p className="cp-title">
        {block.days}-day trip: {stayLine(block.stops)}
      </p>
      {block.replaces && <p className="cp-sub">This replaces the trip open on the Build page (Undo there brings it back).</p>}
      <div className="cp-actions">
        <Act id={`${id}:build`} effect={{ type: 'build', input: block.input }} env={env} primary>
          Build this trip
        </Act>
      </div>
    </div>
  )
}

function Delta({ label, before, after, format, lowerIsBetter = true }) {
  if (before === after) return null
  const better = lowerIsBetter ? after < before : after > before
  return (
    <li>
      {label}: {format(before)} → <strong className={better ? 'cp-good' : 'cp-bad'}>{format(after)}</strong>
    </li>
  )
}

// Proposed changes. Apply goes through the trip handle (the only copy of the trip); an option made for an
// older version of the trip can't be applied.
function OptionsBlock({ block, env, id }) {
  const applied = env.done?.[`${id}:applied`]
  const dismissed = env.done?.dismiss
  const stale = !applied && block.key !== env.tripKey
  const many = block.options.length > 1
  return (
    <div className="cp-options">
      {block.options.map((o, i) => {
        const pv = o.preview
        const stopsChanged = JSON.stringify(pv.before) !== JSON.stringify(pv.after)
        const isApplied = applied?.option === i
        return (
          <div key={i} className={`cp-option${isApplied ? ' cp-applied' : ''}`}>
            <p className="cp-title">
              {many && <span className="cp-num">{i + 1}</span>}
              {o.title}
            </p>
            {o.detail && <p className="cp-sub">{o.detail}</p>}
            {stopsChanged && (
              <div className="cp-diff">
                <p className="cp-sub cp-before">Now: {stayLine(pv.before)}</p>
                <p className="cp-sub">After: {stayLine(pv.after)}</p>
              </div>
            )}
            <ul className="cp-deltas">
              <Delta label="Travel" before={pv.travel[0]} after={pv.travel[1]} format={(m) => `~${hours(m)}`} />
              <Delta label="Est. cost" before={pv.cost[0]} after={pv.cost[1]} format={(n) => formatMoney(n, pv.currency)} />
            </ul>
            {pv.days?.length > 0 && <DaysBlock days={pv.days} />}
            {isApplied ? (
              <div className="cp-actions">
                <span className="cp-done">✓ Applied</span>
                {applied.undo && !env.done?.[`${id}:undone`] && (
                  <button
                    type="button"
                    className="chip cp-chip"
                    onClick={() => {
                      applied.undo()
                      env.mark(`${id}:undone`, { short: 'Undone' })
                    }}
                  >
                    ↩ Undo
                  </button>
                )}
                {env.done?.[`${id}:undone`] && <span className="cp-done">↩ Undone</span>}
              </div>
            ) : (
              !applied &&
              !dismissed &&
              !stale && (
                <div className="cp-actions">
                  <button type="button" className="btn btn-primary cp-btn" onClick={() => env.applyOption(id, i, o)}>
                    {many ? `Apply option ${i + 1}` : 'Apply change'}
                  </button>
                </div>
              )
            )}
          </div>
        )
      })}
      {stale && !dismissed && <p className="cp-sub">Your trip has changed since this was worked out. Ask again for up-to-date options.</p>}
      {dismissed && !applied && <p className="cp-sub">Kept your current trip.</p>}
    </div>
  )
}

export function Sources({ sources = [], ai = false }) {
  const kinds = [...new Set(sources)]
  if (!kinds.length && !ai) return null
  return (
    <div className="cp-sources">
      {ai && <DataBadge kind="ai" />}
      {kinds.map((k) => (
        <DataBadge key={k} kind={k} />
      ))}
    </div>
  )
}

export default function Block({ block, env, id }) {
  switch (block.type) {
    case 'places':
      return (
        <ul className="cp-cards">
          {block.items.map((it) => (
            <PlaceCard key={it.placeId} item={it} day={block.day} env={env} />
          ))}
        </ul>
      )
    case 'cities':
      return (
        <ul className="cp-cards">
          {block.items.map((it) => (
            <CityCard key={it.cityId} item={it} env={env} />
          ))}
        </ul>
      )
    case 'route':
      return <RouteBlock block={block} />
    case 'stats':
      return (
        <dl className="cp-stats">
          {block.items.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )
    case 'list':
      return (
        <ul className="cp-list">
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )
    case 'budget':
      return <BudgetBlock block={block} />
    case 'days':
      return <DaysBlock days={block.days} />
    case 'weather':
      return <WeatherBlock block={block} />
    case 'compare':
      return <CompareBlock block={block} />
    case 'build':
      return <BuildBlock block={block} env={env} id={id} />
    case 'options':
      return <OptionsBlock block={block} env={env} id={id} />
    default:
      return null
  }
}
