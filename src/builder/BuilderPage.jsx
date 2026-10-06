import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { track } from '../lib/analytics.js'
import { setPageMeta } from '../lib/meta.js'
import { Link } from '../lib/router.jsx'
import { shareUrl } from '../lib/share.js'
import { useTripWeather } from '../lib/weather.js'
import TripPanel from '../components/TripPanel.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useTheme } from '../useTheme.js'
import { costlyStop } from '../planner/alternatives.js'
import { planBudget } from '../planner/budget.js'
import { planToTrip } from '../planner/convert.js'
import { europeNotes } from '../planner/europe.js'
import { computeStats, feasibilityWarnings } from '../planner/feasibility.js'
import { applyChange } from '../planner/modify.js'
import { planLegs } from '../planner/plan.js'
import { applyRainSuggestion } from '../planner/weatherPlan.js'
import { usePlanner } from './usePlanner.js'
import { setBuilder, takeBuild, useAssistantBridge } from '../assistant/bridge.js'
import BuilderForm from './BuilderForm.jsx'
import PlanSummary from './PlanSummary.jsx'
import RouteEditor from './RouteEditor.jsx'
import DayPlans from './DayPlans.jsx'
import PlanBudget from './PlanBudget.jsx'
import PlanWeather from './PlanWeather.jsx'
import Assistant from './Assistant.jsx'
import SaveDialog from './SaveDialog.jsx'
import DataBadge from './DataBadge.jsx'
import { mapLibreOn } from '../map/config.js'

// The map is the heaviest part, so it loads after the rest of the page.
const PlanMap = lazy(() => (mapLibreOn() ? import('../map/PlanRouteMap.jsx') : import('./PlanMap.jsx')))

const TABS = [
  { id: 'days', label: 'Days', icon: '📅' },
  { id: 'budget', label: 'Budget', icon: '💶' },
  { id: 'weather', label: 'Weather', icon: '🌦️' },
  { id: 'europe', label: 'Tips', icon: '🇪🇺' },
  { id: 'assistant', label: 'Ask', icon: '💬' },
]

const QUICK = [
  { label: 'More relaxed', change: { type: 'make_relaxed' } },
  { label: 'Less train time', change: { type: 'reduce_travel' } },
  { label: 'Best order', change: { type: 'optimize_order' } },
  { label: 'Cheaper', change: { type: 'make_cheaper' } },
  { label: 'More hidden gems', change: { type: 'more_gems' } },
  { label: 'More nightlife', change: { type: 'more_interest', interest: 'nightlife' } },
  { label: 'More nature', change: { type: 'more_interest', interest: 'nature' } },
]

let startedThisVisit = false

// Build My Europe Trip: preferences in, a whole route out, then edit it piece by piece.
export default function BuilderPage() {
  const planner = usePlanner()
  const { plan, days, input } = planner
  const { theme, toggle: toggleTheme } = useTheme()
  const [tab, setTab] = useState('days')
  const [openStop, setOpenStop] = useState(null)
  const [saving, setSaving] = useState(false)
  const [share, setShare] = useState({ status: 'idle', url: '' })
  const [formOpen, setFormOpen] = useState(!plan)
  const resultRef = useRef(null)

  useEffect(() => {
    setPageMeta({ title: 'Build my Europe trip', path: '/build' })
    if (!startedThisVisit) {
      startedThisVisit = true
      track('trip_builder_started', { returning: Boolean(plan) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const legs = useMemo(() => (plan ? planLegs(plan) : []), [plan])
  const stats = useMemo(() => (plan ? computeStats(plan) : null), [plan])
  const warnings = useMemo(() => (plan ? feasibilityWarnings(plan, stats) : []), [plan, stats])
  const costly = useMemo(() => (plan ? costlyStop(plan) : null), [plan])
  const budget = useMemo(() => (plan ? planBudget(plan, days) : null), [plan, days])
  const tips = useMemo(() => (plan ? europeNotes(plan) : []), [plan])

  // Weather for dated trips: a live forecast within 16 days, last year's weather further out.
  const weatherDays = useMemo(
    () => (plan?.prefs.startDate ? days.filter((d) => d.date).map((d) => ({ number: d.number, cityId: d.cityId, city: cityById[d.cityId], date: new Date(`${d.date}T00:00:00`) })) : []),
    [plan, days],
  )
  const weather = useTripWeather(weatherDays)

  useEffect(() => setShare({ status: 'idle', url: '' }), [plan, days])

  const generate = (from = input) => {
    const result = planner.generate(from)
    const s = computeStats(result.plan)
    track('trip_generated', { cities: s.cities, days: s.days, countries: s.countries.length, warnings: feasibilityWarnings(result.plan, s).length, pace: result.plan.prefs.pace, transport: result.plan.prefs.transport })
    setFormOpen(false)
    setOpenStop(null)
    setTimeout(() => resultRef.current?.focus(), 50)
  }

  // Every change comes back as { plan, summary, changed } from the planner.
  const onChange = (result, meta = {}) => {
    if (!result.changed) return planner.apply(plan, { message: result.summary })
    planner.apply(result.plan, { message: result.summary })
    if (meta.replaced) track('city_replaced', { via: 'editor' })
  }
  const fix = (change) => {
    const r = applyChange(plan, change)
    onChange(r)
    if (r.changed && change.type === 'optimize_order') track('route_optimized', { via: 'button' })
  }
  const fromAssistant = (nextPlan, { message, days: nextDays, replaced, optimized }) => {
    planner.apply(nextPlan, { message, days: nextDays })
    if (replaced) track('city_replaced', { via: 'assistant' })
    if (optimized) track('route_optimized', { via: 'assistant' })
  }

  // The site-wide assistant: it can work on the plan shown here, and hand over a new trip to build.
  useEffect(() => {
    setBuilder(plan ? { plan, days, weatherByDay: weather.byDay, input, apply: fromAssistant } : null)
  }, [plan, days, weather.byDay, input]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setBuilder(null), [])
  const buildRequest = useAssistantBridge((s) => s.build)
  useEffect(() => {
    const next = buildRequest && takeBuild()
    if (next) generate(next)
  }, [buildRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  const makeShare = async () => {
    setShare({ status: 'working', url: '' })
    try {
      const url = await shareUrl(planToTrip(plan, days))
      setShare({ status: 'ready', url })
      track('trip_shared', { source: 'builder', cities: plan.stops.length })
      await navigator.clipboard?.writeText(url).then(() => setShare({ status: 'copied', url }), () => {})
    } catch {
      setShare({ status: 'error', url: '' })
    }
  }

  const keepLength = Boolean(input.startDate && input.endDate)

  return (
    <div className="builder">
      <header className="builder-header">
        <Link to="/" className="landing-brand" aria-label="Eurowander home">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
        </Link>
        <nav aria-label="Main">
          <Link to="/explore">Explore</Link>
          <Link to="/trip">My trip</Link>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </nav>
      </header>

      <main className="builder-main" id="builder-main">
        <section className="builder-intro">
          <p className="eyebrow">Build my Europe trip</p>
          <h1>Tell us how you like to travel. We’ll draft the route.</h1>
          <p className="hero-sub">
            Pick dates, interests and pace, or leave it all blank. You get cities in a sensible order, nights per stop, journey times, a day plan and a rough budget, and you can change any part of it.
          </p>
        </section>

        {plan && !formOpen ? (
          <div className="builder-form-closed">
            <button type="button" className="btn" onClick={() => setFormOpen(true)}>
              Change preferences
            </button>
          </div>
        ) : (
          <BuilderForm input={input} onChange={planner.setInput} onGenerate={() => generate()} hasPlan={Boolean(plan)} notes={planner.notes} />
        )}

        {plan && (
          <section className="builder-result" ref={resultRef} tabIndex={-1} aria-label="Your generated trip">
            {planner.notes.length > 0 && (
              <ul className="notes">
                {planner.notes.map((n) => (
                  <li key={n.text} className={`note ${n.level === 'error' || n.level === 'warn' ? 'note-warn' : 'note-tip'}`}>
                    {n.text}
                  </li>
                ))}
              </ul>
            )}

            <PlanSummary
              plan={plan}
              stats={stats}
              warnings={warnings}
              costly={costly}
              onFix={fix}
              onOpenStop={(i) => {
                setOpenStop(i)
                setTimeout(() => document.querySelector('.stop-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
              }}
            />

            <div className="builder-bar" role="toolbar" aria-label="Trip actions">
              <button type="button" className="btn btn-primary" onClick={() => setSaving(true)}>
                Save as my trip
              </button>
              <button type="button" className="btn" onClick={makeShare} disabled={share.status === 'working'}>
                {share.status === 'copied' ? 'Link copied' : 'Share link'}
              </button>
              <button type="button" className="btn" disabled={!planner.canUndo} onClick={planner.undo}>
                Undo
              </button>
              <button type="button" className="btn" onClick={() => planner.generate(input, { exclude: plan.stops.filter((s) => s.role === 'pick').map((s) => s.cityId) })}>
                Different cities
              </button>
            </div>
            {share.url && (
              <label className="share-url">
                Link to this plan (anyone can open it; no account needed)
                <input type="text" readOnly value={share.url} onFocus={(e) => e.target.select()} />
              </label>
            )}
            {share.status === 'error' && <p className="note note-warn">The share link couldn’t be made in this browser.</p>}
            {planner.message && (
              <p className="note note-good builder-message" role="status">
                {planner.message}
              </p>
            )}

            <div className="quick-chips interest-chips" role="group" aria-label="Quick changes">
              {QUICK.map((q) => (
                <button key={q.label} type="button" className="chip" onClick={() => fix(q.change)}>
                  {q.label}
                </button>
              ))}
            </div>

            <div className="builder-columns">
              <div>
                <h2 className="section-title">Route</h2>
                <RouteEditor plan={plan} legs={legs} keepLength={keepLength} openIndex={openStop} onOpen={setOpenStop} onChange={onChange} />
              </div>
              <div className="builder-map-col">
                <Suspense fallback={<div className="plan-map map-loading">Loading map…</div>}>
                  <PlanMap stops={plan.stops.map((s) => cityById[s.cityId])} legs={legs} overLimit={stats.overLimit} />
                </Suspense>
              </div>
            </div>

            <div className="builder-tabs">
              <TripPanel tab={tab} onTabChange={setTab} tabs={TABS}>
                {tab === 'days' && (
                  <DayPlans
                    days={days}
                    planned={planner.daysPlanned}
                    edited={Boolean(planner.dayEdits)}
                    onPlan={planner.planMyDays}
                    onChangeDays={(next, summary) => planner.apply(plan, { days: next, message: summary })}
                    onReset={planner.resetDays}
                  />
                )}
                {tab === 'budget' && <PlanBudget budget={budget} travellers={plan.prefs.travellers} onFix={fix} />}
                {tab === 'weather' && (
                  <PlanWeather
                    plan={plan}
                    days={days}
                    weather={weather}
                    daysPlanned={planner.daysPlanned}
                    onApplyRain={(s) => planner.apply(plan, { days: applyRainSuggestion(days, s), message: s.text })}
                  />
                )}
                {tab === 'europe' && (
                  <ul className="europe-notes">
                    {tips.map((t) => (
                      <li key={t.id} className="info-card">
                        <h3>
                          <span aria-hidden="true">{t.icon}</span> {t.title}
                        </h3>
                        <p>{t.text}</p>
                      </li>
                    ))}
                    <li className="rule">
                      <DataBadge kind="seasonal" /> General guidance from Eurowander’s country notes. Entry rules depend on your nationality; check official sources before you go.
                    </li>
                  </ul>
                )}
                {tab === 'assistant' && <Assistant plan={plan} days={days} weather={weather} onApply={fromAssistant} />}
              </TripPanel>
            </div>

            <div className="builder-bottom">
              <button type="button" className="link-btn small" onClick={() => planner.startOver()}>
                Start over
              </button>
            </div>
          </section>
        )}
      </main>

      {saving && plan && <SaveDialog plan={plan} days={days} onClose={() => setSaving(false)} />}
    </div>
  )
}
