import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { TEMPLATE_DETAILS } from '../data/templateDays.js'
import { categoryById, templateById, templateBySlug, templatePath } from '../data/tripTemplates.js'
import { track } from '../lib/analytics.js'
import { formatDuration } from '../lib/format.js'
import { setPageMeta } from '../lib/meta.js'
import { Link, cityPath, navigate } from '../lib/router.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Thumb from '../components/Thumb.jsx'
import TrainSearchModal from '../components/TrainSearch.jsx'
import { useLiveEnabled } from '../components/LiveBits.jsx'
import DataBadge from '../builder/DataBadge.jsx'
import { loadPlanIntoBuilder } from '../builder/usePlanner.js'
import { useTheme } from '../useTheme.js'
import { computeStats } from '../planner/feasibility.js'
import { applyChange } from '../planner/modify.js'
import { planLegs } from '../planner/plan.js'
import { modeIcon, sourceLabel } from '../planner/transport.js'
import { hasRail } from '../services/live/trains.js'
import { requestAsk, requestFocus, setAssistantOpen, setBuilder } from '../assistant/bridge.js'
import { mapLibreOn } from '../map/config.js'
import { budgetLevel, bestMonthsText, quieterSwaps, routeText, stopsWithDays, templateDays, templateFlags, templatePlan, whyItWorks, withStartDate } from './templatePlan.js'
import { templateMeta } from './templateMeta.js'
import TemplateSaveDialog from './TemplateSaveDialog.jsx'
import './templates.css'

// The route map loads after the rest of the page (it's the heaviest part), on the same map as Build My Trip.
const RouteMap = lazy(() => (mapLibreOn() ? import('../map/PlanRouteMap.jsx') : import('../builder/PlanMap.jsx')))

const stopsKey = (plan) => `${plan.prefs.startDate}|${plan.stops.map((s) => `${s.cityId}:${s.nights}`).join(',')}`
const SLOT = { travel: 'Travel', morning: 'Morning', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'Evening' }
const dayRange = (a, b) => (a === b ? `Day ${a}` : `Days ${a}–${b}`)
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Copilot prompts. They work on this page's copy of the trip; nothing changes until Apply.
function copilotPrompts(days) {
  const shorter = days > 7 ? 7 : null
  return [
    { label: 'Make it cheaper', prompt: 'Make this trip cheaper', kind: 'cheaper' },
    shorter ? { label: `Make it ${shorter} days`, prompt: `Make this trip ${shorter} days`, kind: 'length' } : { label: 'Make it 10 days', prompt: 'Make this trip 10 days', kind: 'length' },
    { label: 'Add a hidden gem', prompt: 'Add a hidden gem', kind: 'gems' },
    { label: 'More relaxed', prompt: 'Make my trip more relaxed', kind: 'relaxed' },
    { label: 'Add another country', prompt: 'Add a city in another country', kind: 'country' },
    { label: 'Less train time', prompt: 'Reduce my train time', kind: 'travel' },
    { label: 'More nightlife', prompt: 'More nightlife', kind: 'nightlife' },
    { label: 'More nature', prompt: 'More nature', kind: 'nature' },
  ]
}

function Leg({ leg, date }) {
  const [open, setOpen] = useState(false)
  const railOn = useLiveEnabled('rail')
  // Real timetables only once there's a date, and only when asked: nothing is searched in the background.
  const canSearch = railOn && date && leg.mode !== 'flight' && hasRail(leg.from.id) && hasRail(leg.to.id)
  return (
    <li className="tpl-leg">
      <span className="tpl-leg-line" aria-hidden="true" />
      <span>
        <span aria-hidden="true">{modeIcon(leg.mode)}</span> {leg.mode === 'train' ? 'Train' : leg.mode === 'bus' ? 'Bus' : leg.mode}, about {formatDuration(leg.minutes)}{' '}
        <DataBadge kind="estimate" title={`${sourceLabel(leg.source)}. A typical journey time, not a live timetable.`} />
        {!date && <small className="tpl-leg-note">Typical time. Add a start date to check real trains.</small>}
      </span>
      {canSearch && (
        <button type="button" className="btn btn-small" onClick={() => setOpen(true)}>
          🚆 Check real trains
        </button>
      )}
      {open && <TrainSearchModal fromCityId={leg.from.id} toCityId={leg.to.id} date={date} estimate={leg} onClose={() => setOpen(false)} />}
    </li>
  )
}

function DayCard({ day }) {
  const city = cityById[day.cityId]
  const showOnMap = (placeId) => {
    requestFocus({ cityId: day.cityId, placeId })
    navigate(cityPath(day.cityId))
    window.scrollTo(0, 0)
  }
  const travel = day.items.filter((it) => it.slot === 'travel')
  const places = day.items.filter((it) => it.placeId && placeById[it.placeId])
  return (
    <li className="tpl-day">
      <h4>
        <span className="tpl-day-n">
          {city.name} · Day {day.number}
          {day.date ? ` · ${shortDate(day.date)}` : ''}
        </span>
        {day.title}
      </h4>
      <ul className="tpl-day-items">
        {travel.map((it) => (
          <li key={it.label} className="tpl-day-travel">
            {it.label}
          </li>
        ))}
        {places.map((it) => (
          <li key={it.placeId}>
            <span className="tpl-slot">{SLOT[it.slot]}</span>
            <button type="button" className="link-btn tpl-place" onClick={() => showOnMap(it.placeId)} title={`Show ${placeById[it.placeId].name} on the map`}>
              {placeById[it.placeId].name}
            </button>
          </li>
        ))}
        {day.ideas.map((idea) => (
          <li key={idea} className="tpl-idea">
            {idea}
          </li>
        ))}
      </ul>
    </li>
  )
}

// A ready-made trip: the route, the cities, a day-by-day outline, and the ways to make it yours.
// The page works on its own copy of the template (date, swaps, copilot changes), so the template never
// changes; "Customize this trip" saves that copy as the traveller's own trip.
export default function TemplatePage({ slug }) {
  const t = templateBySlug[slug]
  const { theme, toggle } = useTheme()
  const original = useMemo(() => templatePlan(t), [t])
  const [plan, setPlan] = useState(original)
  const [dayEdits, setDayEdits] = useState(null)
  const [message, setMessage] = useState('')
  const [focus, setFocus] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [saved, setSaved] = useState(false)
  const [share, setShare] = useState('')
  const [openStops, setOpenStops] = useState(() => new Set([0]))
  const details = TEMPLATE_DETAILS[t.id] || { intro: t.description, highlights: [] }

  useEffect(() => {
    setPageMeta(templateMeta(t))
    track('trip_template_opened', { template: t.id, source: 'page' })
    setPlan(original)
    setDayEdits(null)
    setMessage('')
    setFocus(null)
    setOpenStops(new Set([0]))
  }, [t, original])

  const legs = useMemo(() => planLegs(plan), [plan])
  const key = stopsKey(plan)
  const days = useMemo(() => (dayEdits?.key === key ? dayEdits.days : templateDays(plan, legs)), [plan, legs, dayEdits, key])
  const stats = useMemo(() => computeStats(plan), [plan])
  const why = useMemo(() => whyItWorks(plan, stats), [plan, stats])
  const swaps = useMemo(() => quieterSwaps(plan, stats), [plan, stats])
  const groups = useMemo(() => stopsWithDays(plan, days), [plan, days])
  const changed = key !== stopsKey(original) || Boolean(dayEdits)
  const budget = budgetLevel(plan.stops)
  const months = bestMonthsText(plan.stops)
  const allTrain = legs.length > 0 && legs.every((l) => l.mode === 'train')

  const change = (next, note) => {
    setPlan(next)
    setMessage(note)
    setSaved(false)
  }

  // The copilot sees this page's copy as the open trip (like the Build page's plan). Applying one of its
  // suggestions changes the copy here, never the template.
  useEffect(() => {
    setBuilder({
      plan,
      days,
      weatherByDay: {},
      apply: (next, { message: note = '', days: nextDays = null } = {}) => {
        setPlan(next)
        setDayEdits(nextDays ? { key: stopsKey(next), days: nextDays } : null)
        setMessage(note)
        setSaved(false)
      },
    })
  }, [plan, days])
  useEffect(() => () => setBuilder(null), [])

  const ask = (p) => {
    track('trip_template_ai_customize', { template: t.id, kind: p.kind, via: 'copilot' })
    requestAsk(p.prompt, { source: 'trip_template', kind: p.kind })
  }
  const openInBuilder = () => {
    loadPlanIntoBuilder(plan, days, { message: `Started from “${t.title}”. Change anything here, or ask the copilot.` })
    track('trip_template_ai_customize', { template: t.id, via: 'builder' })
    navigate('/build')
    window.scrollTo(0, 0)
    setAssistantOpen(true)
  }
  const customize = (then) => {
    if (then === 'open') track('trip_template_customize_clicked', { template: t.id, changed })
    setDialog(then)
  }
  const shareTemplate = async () => {
    const url = `${window.location.origin}${templatePath(t)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: t.title, text: `${t.title}: ${routeText(t.stops)}`, url })
        setShare('shared')
        track('trip_template_shared', { template: t.id, method: 'native' })
        return
      }
      await navigator.clipboard.writeText(url)
      setShare('copied')
      track('trip_template_shared', { template: t.id, method: 'copy' })
    } catch (e) {
      if (e?.name !== 'AbortError') setShare(url)
    }
  }
  const setDate = (startDate) => {
    setPlan(withStartDate(plan, startDate))
    setDayEdits(null)
  }
  const resetToOriginal = () => {
    setPlan(withStartDate(original, plan.prefs.startDate))
    setDayEdits(null)
    setMessage('Back to the original trip.')
  }
  const lengths = [7, 10, 14].filter((n) => n !== stats.days)
  const toggleStop = (i) =>
    setOpenStops((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const pick = (i) => {
    setFocus(plan.stops[i].cityId)
    setOpenStops((s) => new Set([...s, i]))
  }
  const hero = cityById[t.heroCityId] || cityById[t.stops[0].cityId]
  const countries = stats.countries.map((c) => countryByCode[c].name)

  return (
    <div className="builder tpl-page">
      <header className="builder-header">
        <Link to="/" className="landing-brand" aria-label="Eurowander home">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
        </Link>
        <nav aria-label="Main">
          <Link to="/trip-ideas">Trip ideas</Link>
          <Link to="/build">Build a trip</Link>
          <Link to="/trip">My trip</Link>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </nav>
      </header>

      <main className="builder-main tpl-main" id="template-main">
        <nav className="tpl-crumbs" aria-label="Breadcrumb">
          <Link to="/trip-ideas">Trip ideas</Link> <span aria-hidden="true">›</span> {t.title}
        </nav>

        <section className="tpl-hero" aria-labelledby="tpl-title">
          <div className="tpl-hero-text">
            <p className="eyebrow">
              <span aria-hidden="true">{templateFlags(t)}</span> {t.name}
            </p>
            <h1 id="tpl-title">{t.title}</h1>
            <p className="tpl-hero-route">{routeText(plan.stops)}</p>
            <p className="tpl-hero-facts">
              {stats.days} days · {stats.cities} {stats.cities === 1 ? 'city' : 'cities'} · {countries.length === 1 ? countries[0] : `${countries.length} countries`}
              {allTrain ? ' · 🚆 by train' : ''}
            </p>
            <p className="tpl-hero-intro">{details.intro}</p>
            <ul className="tpl-tags" aria-label="Good for">
              {t.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <div className="tpl-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => customize('open')}>
                Customize this trip
              </button>
              <button type="button" className="btn btn-lg" onClick={() => customize('stay')}>
                {saved ? 'Saved ✓' : 'Save to My Trips'}
              </button>
              <button type="button" className="btn btn-lg" onClick={shareTemplate}>
                {share === 'copied' ? 'Link copied' : share === 'shared' ? 'Shared' : 'Share'}
              </button>
            </div>
            {share && share.startsWith('http') && (
              <label className="share-url">
                Link to this trip idea
                <input type="text" readOnly value={share} onFocus={(e) => e.target.select()} />
              </label>
            )}
            {saved && (
              <p className="note note-good" role="status">
                Saved as your trip. <Link to="/trip">Open My trip</Link> to change dates, cities and places.
              </p>
            )}
          </div>
          <Thumb id={hero.id} emoji={hero.emoji} alt={`${hero.name}, ${countryByCode[hero.country].name}`} kind="city" item={hero} width={960} sizes="(max-width: 760px) 100vw, 480px" className="tpl-hero-photo" credit="badge" eager />
        </section>

        {(changed || message) && (
          <p className="note note-tip tpl-changed" role="status">
            {message || 'This is your version of the trip.'} The original trip idea doesn’t change.{' '}
            {changed && (
              <button type="button" className="link-btn small" onClick={resetToOriginal}>
                Back to the original
              </button>
            )}
          </p>
        )}

        <div className="tpl-columns">
          <div className="tpl-col-main">
            <section aria-labelledby="tpl-route-title">
              <div className="tpl-route-head">
                <h2 id="tpl-route-title" className="section-title">
                  Route
                </h2>
                <label className="tpl-date">
                  Start date <small>optional</small>
                  <input type="date" value={plan.prefs.startDate} onChange={(e) => setDate(e.target.value)} />
                </label>
              </div>
              <ol className="tpl-route">
                {groups.map((g, i) => (
                  <li key={g.stop.cityId} className="tpl-stop-wrap">
                    <div className={`tpl-stop${focus === g.stop.cityId ? ' is-focus' : ''}`}>
                      <button type="button" className="tpl-stop-main" onClick={() => pick(i)} aria-label={`Show ${g.city.name} on the map`}>
                        <span className="tpl-stop-n" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span>
                          <strong>
                            {g.city.name} <span aria-hidden="true">{countryByCode[g.city.country].flag}</span>
                          </strong>
                          <small>
                            {dayRange(g.from, g.to)} · {g.stop.nights} night{g.stop.nights === 1 ? '' : 's'}
                            {g.city.hiddenGem ? ' · 💎 hidden gem' : ''}
                          </small>
                        </span>
                      </button>
                      <button type="button" className="link-btn small" aria-expanded={openStops.has(i)} onClick={() => toggleStop(i)}>
                        {openStops.has(i) ? 'Hide days' : 'Show days'}
                      </button>
                    </div>
                    {openStops.has(i) && (
                      <div className="tpl-stop-days">
                        <ul className="tpl-days">
                          {g.days.map((d) => (
                            <DayCard key={d.number} day={d} />
                          ))}
                        </ul>
                        <p className="tpl-more">
                          <Link to={cityPath(g.city.id)}>More places in {g.city.name}, including live listings →</Link>
                        </p>
                      </div>
                    )}
                    {legs[i] && <Leg leg={legs[i]} date={days.find((d) => d.leg === legs[i])?.date || ''} />}
                  </li>
                ))}
              </ol>
              <p className="rule">
                Ideas, not a schedule: each day leaves room for your own finds. Opening hours aren’t in Eurowander’s data, so check them before you go.
              </p>
            </section>

            {details.highlights.length > 0 && (
              <section aria-labelledby="tpl-hl-title" className="tpl-block">
                <h2 id="tpl-hl-title" className="section-title">
                  Highlights
                </h2>
                <ul className="tpl-highlights">
                  {details.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
            )}

            {why.length > 0 && (
              <section aria-labelledby="tpl-why-title" className="tpl-block">
                <h2 id="tpl-why-title" className="section-title">
                  Why this trip works
                </h2>
                <ul className="tpl-why">
                  {why.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            )}

            {swaps.length > 0 && (
              <section aria-labelledby="tpl-gems-title" className="tpl-block">
                <h2 id="tpl-gems-title" className="section-title">
                  Want something quieter?
                </h2>
                <ul className="tpl-swaps">
                  {swaps.map((s) => (
                    <li key={s.cityId}>
                      <span>Instead of {cityById[s.cityId].name}:</span>
                      {s.options.map((o) => (
                        <button
                          key={o.cityId}
                          type="button"
                          className="chip"
                          onClick={() => change(o.plan, `Swapped ${cityById[s.cityId].name} for ${cityById[o.cityId].name}.`)}
                          title={cityById[o.cityId].description}
                        >
                          💎 {cityById[o.cityId].name}
                          {Math.abs(o.deltaMinutes) >= 15 && (
                            <small>
                              {' '}
                              ({o.deltaMinutes > 0 ? '+' : '−'}
                              {formatDuration(Math.abs(o.deltaMinutes))} travel)
                            </small>
                          )}
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="tpl-ai-title" className="tpl-block tpl-ai">
              <h2 id="tpl-ai-title" className="section-title">
                Like this trip, but want something different?
              </h2>
              <p className="section-sub">Ask the copilot. It suggests changes with before-and-after numbers, and nothing changes until you press Apply.</p>
              <div className="quick-chips" role="group" aria-label="Ask the copilot">
                {copilotPrompts(stats.days).map((p) => (
                  <button key={p.label} type="button" className="chip" onClick={() => ask(p)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p>
                <button type="button" className="btn" onClick={openInBuilder}>
                  ✨ Customize with AI in the trip builder
                </button>
              </p>
            </section>

            <section aria-labelledby="tpl-var-title" className="tpl-block">
              <h2 id="tpl-var-title" className="section-title">
                Variations
              </h2>
              <div className="quick-chips" role="group" aria-label="Other lengths and related trips">
                {lengths.map((n) => (
                  <button key={n} type="button" className="chip" onClick={() => {
                    const r = applyChange(plan, { type: 'set_length', days: n })
                    if (r.changed) change(r.plan, r.summary)
                  }}>
                    {n} days
                  </button>
                ))}
                {t.variants.map((id) => templateById[id]).filter(Boolean).map((v) => (
                  <Link key={v.id} to={templatePath(v)} className="chip" onClick={() => track('trip_template_opened', { template: v.id, source: 'variant' })}>
                    {v.title}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="tpl-col-side" aria-label="Map and trip facts">
            <Suspense fallback={<div className="plan-map map-loading">Loading map…</div>}>
              <RouteMap stops={plan.stops.map((s) => cityById[s.cityId])} legs={legs} focusId={focus} />
            </Suspense>
            <dl className="tpl-stats">
              <div>
                <dt>Length</dt>
                <dd>{stats.days} days</dd>
              </div>
              <div>
                <dt>Cities</dt>
                <dd>{stats.cities}</dd>
              </div>
              <div>
                <dt>Countries</dt>
                <dd>{stats.countries.length}</dd>
              </div>
              <div>
                <dt>Transfers</dt>
                <dd>{stats.transfers}</dd>
              </div>
              <div>
                <dt>Between cities</dt>
                <dd>about {formatDuration(stats.travelMinutes)}</dd>
              </div>
              <div>
                <dt>Pace</dt>
                <dd>{stats.pace?.label || '—'}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>
                  {budget.symbol} <small>{budget.label}</small>
                </dd>
              </div>
              {months && (
                <div>
                  <dt>Best weather</dt>
                  <dd>{months}</dd>
                </div>
              )}
            </dl>
            <p className="rule">
              <DataBadge kind="estimate" /> Travel times are typical journeys from Eurowander’s data; budget and seasons are rough guides. {allTrain ? 'Train-first.' : ''}{' '}
              {t.categories.map((c) => categoryById[c]?.label).filter(Boolean).join(' · ')}
            </p>
          </aside>
        </div>

        <div className="tpl-sticky" role="group" aria-label="Make this trip yours">
          <span>
            <strong>{t.title}</strong>
            <small>
              {stats.days} days · {routeText(plan.stops)}
            </small>
          </span>
          <button type="button" className="btn btn-primary" onClick={() => customize('open')}>
            Customize
          </button>
        </div>
      </main>

      {dialog && (
        <TemplateSaveDialog
          template={t}
          plan={plan}
          days={days}
          changed={changed}
          then={dialog}
          onSaved={() => {
            setSaved(true)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
