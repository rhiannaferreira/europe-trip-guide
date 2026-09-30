import { useState } from 'react'
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { CURRENCIES } from '../data/costs.js'
import { formatDuration, monthNames } from '../lib/format.js'
import { BUILDER_INTERESTS, DESTINATION_MIX, MAX_DAYS, MAX_LEG_OPTIONS, MIN_DAYS, PACES, TRANSPORT } from '../planner/preferences.js'

const STEPS = [
  { id: 'dates', label: 'Dates' },
  { id: 'prefs', label: 'Preferences' },
  { id: 'places', label: 'Destinations' },
  { id: 'budget', label: 'Budget' },
  { id: 'go', label: 'Generate' },
]
const byName = [...cities].sort((a, b) => a.name.localeCompare(b.name))
const cityLabel = (c) => `${c.name} ${countryByCode[c.country]?.flag || ''}`
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function CitySelect({ id, value, onChange, empty, exclude = [] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {byName
        .filter((c) => !exclude.includes(c.id) || c.id === value)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {cityLabel(c)}
          </option>
        ))}
    </select>
  )
}

// The builder form. Nothing is required: every empty field has a default, listed next to it.
// On a phone it's a five-step flow (Dates, Preferences, Destinations, Budget, Generate); on wider screens
// every step shows at once.
export default function BuilderForm({ input, onChange, onGenerate, hasPlan, notes = [] }) {
  const [step, setStep] = useState(0)
  const set = (patch) => onChange(patch)
  const noteFor = (field) => notes.filter((n) => n.field === field)
  const current = (i) => `builder-step${step === i ? ' is-current' : ''}`
  const submit = (e) => {
    e.preventDefault()
    onGenerate()
  }
  const lengthFromDates = Boolean(input.startDate && input.endDate)

  return (
    <form className="builder-form" onSubmit={submit} aria-label="Trip preferences">
      <ol className="builder-stepper" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={step === i ? 'active' : ''} aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}>
              <span className="stepper-number">{i + 1}</span> {s.label}
            </button>
          </li>
        ))}
      </ol>

      <fieldset className={current(0)}>
        <legend>When and how long</legend>
        <div className="field-grid">
          <label>
            Start date <small>optional</small>
            <input type="date" value={input.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </label>
          <label>
            End date <small>optional</small>
            <input type="date" value={input.endDate} min={input.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} />
          </label>
          <label>
            Days
            <input
              type="number"
              min={MIN_DAYS}
              max={MAX_DAYS}
              inputMode="numeric"
              value={lengthFromDates ? '' : input.days}
              placeholder={lengthFromDates ? 'From your dates' : '10'}
              disabled={lengthFromDates}
              onChange={(e) => set({ days: e.target.value })}
            />
          </label>
          {!input.startDate && (
            <label>
              Month <small>for seasons</small>
              <select value={input.month || ''} onChange={(e) => set({ month: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Not sure yet</option>
                {monthNames.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {[...noteFor('startDate'), ...noteFor('endDate'), ...noteFor('days')].map((n) => (
          <p key={n.text} className={`field-note ${n.level}`}>
            {n.text}
          </p>
        ))}
        <p className="rule">No dates? The plan uses {input.days || 10} days and seasonal info instead of forecasts.</p>
      </fieldset>

      <fieldset className={current(1)}>
        <legend>What you enjoy</legend>
        <div className="interest-chips" role="group" aria-label="Interests">
          {BUILDER_INTERESTS.map((i) => (
            <button key={i.id} type="button" className={`chip${input.interests.includes(i.id) ? ' chip-picked' : ''}`} aria-pressed={input.interests.includes(i.id)} onClick={() => set({ interests: toggle(input.interests, i.id) })}>
              <span aria-hidden="true">{i.icon}</span> {i.label}
            </button>
          ))}
        </div>
        <div className="field-grid">
          <div className="field">
            <span className="field-label" id="pace-label">
              Pace
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby="pace-label">
              {PACES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={input.pace === p.id} className={input.pace === p.id ? 'active' : ''} onClick={() => set({ pace: p.id })} title={p.hint}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label>
            Getting around
            <select value={input.transport} onChange={(e) => set({ transport: e.target.value })}>
              {TRANSPORT.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}: {t.hint}
                </option>
              ))}
            </select>
          </label>
          <label>
            Longest journey you'd like
            <select value={input.maxLegMinutes ?? 'none'} onChange={(e) => set({ maxLegMinutes: e.target.value === 'none' ? null : Number(e.target.value) })}>
              {MAX_LEG_OPTIONS.map((m) => (
                <option key={m ?? 'none'} value={m ?? 'none'}>
                  {m ? `Up to ${formatDuration(m)}` : 'No limit'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Famous or hidden gems
            <select value={input.mix} onChange={(e) => set({ mix: e.target.value })}>
              {DESTINATION_MIX.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className={current(2)}>
        <legend>Where</legend>
        <div className="field-grid">
          <label>
            Start in
            <CitySelect value={input.startCityId} onChange={(v) => set({ startCityId: v })} empty="Anywhere" />
          </label>
          <label>
            End in
            <select value={input.endCityId} onChange={(e) => set({ endCityId: e.target.value })}>
              <option value="">Wherever the route ends</option>
              {input.startCityId && <option value={input.startCityId}>Back in {cityById[input.startCityId].name} (round trip)</option>}
              {byName
                .filter((c) => c.id !== input.startCityId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {cityLabel(c)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="field">
          <span className="field-label">Must visit</span>
          {input.mustVisit.length > 0 && (
            <ul className="picked-list">
              {input.mustVisit.map((id) => (
                <li key={id}>
                  {cityById[id] ? cityLabel(cityById[id]) : id}
                  <button type="button" className="remove-btn" aria-label={`Remove ${cityById[id]?.name || id}`} onClick={() => set({ mustVisit: input.mustVisit.filter((x) => x !== id) })}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <CitySelect
            value=""
            onChange={(v) => v && set({ mustVisit: [...input.mustVisit, v] })}
            empty="Add a city…"
            exclude={[...input.mustVisit, input.startCityId, input.endCityId]}
          />
        </div>
        <details className="builder-more" open={input.includeCountries.length > 0 || input.avoidCountries.length > 0}>
          <summary>Countries to include or avoid</summary>
          <p className="rule">Tap once to include, twice to avoid, three times to clear.</p>
          <div className="country-picks" role="group" aria-label="Countries">
            {countries.map((c) => {
              const state = input.includeCountries.includes(c.code) ? 'include' : input.avoidCountries.includes(c.code) ? 'avoid' : ''
              const next = () => {
                if (state === '') set({ includeCountries: [...input.includeCountries, c.code] })
                else if (state === 'include') set({ includeCountries: input.includeCountries.filter((x) => x !== c.code), avoidCountries: [...input.avoidCountries, c.code] })
                else set({ avoidCountries: input.avoidCountries.filter((x) => x !== c.code) })
              }
              return (
                <button key={c.code} type="button" className={`chip country-pick ${state}`} onClick={next} aria-label={`${c.name}: ${state === 'include' ? 'include' : state === 'avoid' ? 'avoid' : 'no preference'}`}>
                  {c.flag} {c.name}
                  {state === 'include' && <span aria-hidden="true"> ✓</span>}
                  {state === 'avoid' && <span aria-hidden="true"> ✕</span>}
                </button>
              )
            })}
          </div>
        </details>
        {[...noteFor('startCityId'), ...noteFor('endCityId'), ...noteFor('mustVisit'), ...noteFor('includeCountries'), ...noteFor('avoidCountries')].map((n) => (
          <p key={n.text} className={`field-note ${n.level}`}>
            {n.text}
          </p>
        ))}
      </fieldset>

      <fieldset className={current(3)}>
        <legend>Budget</legend>
        <div className="field-grid">
          <label>
            Total budget <small>optional, for everyone</small>
            <input type="text" inputMode="decimal" value={input.budget} placeholder="e.g. 3000" onChange={(e) => set({ budget: e.target.value })} />
          </label>
          <label>
            Currency
            <select value={input.currency} onChange={(e) => set({ currency: e.target.value })}>
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Travellers
            <input type="number" min="1" max="20" inputMode="numeric" value={input.travellers} onChange={(e) => set({ travellers: e.target.value })} />
          </label>
        </div>
        {noteFor('budget').map((n) => (
          <p key={n.text} className={`field-note ${n.level}`}>
            {n.text}
          </p>
        ))}
      </fieldset>

      <div className={`${current(4)} builder-go`}>
        <button type="submit" className="btn btn-primary btn-lg builder-cta">
          {hasPlan ? 'Build a new trip' : 'Build my Europe trip'}
        </button>
        <p className="rule">Routes, times and costs are worked out by fixed rules from Eurowander’s data, not by AI, and every estimate is labelled.</p>
      </div>

      <div className="builder-step-nav">
        <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <span />
        )}
      </div>
    </form>
  )
}
