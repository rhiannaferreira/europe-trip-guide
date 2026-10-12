import { useEffect, useMemo, useState } from 'react'
import { countryByCode } from '../data/countries.js'
import { TEMPLATE_CATEGORIES, tripTemplates } from '../data/tripTemplates.js'
import { track } from '../lib/analytics.js'
import { setPageMeta } from '../lib/meta.js'
import { Link } from '../lib/router.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useTheme } from '../useTheme.js'
import TemplateCard from './TemplateCard.jsx'
import { DURATIONS, STYLES, filterTemplates, templateCountries } from './templateFacts.js'
import { IDEAS_META } from './templateMeta.js'

const EMPTY = { category: 'all', duration: '', style: '', country: '', pace: '', countries: '' }
const PACES = [
  ['relaxed', 'Relaxed'],
  ['moderate', 'Moderate'],
  ['fast', 'Fast-paced'],
]

// All ready-made trips, with a few simple filters.
export default function TripIdeasPage() {
  const { theme, toggle } = useTheme()
  const [f, setF] = useState(EMPTY)
  const list = useMemo(() => filterTemplates(tripTemplates, f), [f])
  const countryOptions = useMemo(() => [...new Set(tripTemplates.flatMap(templateCountries))].map((c) => countryByCode[c]).sort((a, b) => a.name.localeCompare(b.name)), [])
  const filtered = Object.keys(EMPTY).some((k) => f[k] !== EMPTY[k])

  useEffect(() => {
    setPageMeta(IDEAS_META)
    track('trip_template_viewed', { source: 'trip_ideas', count: tripTemplates.length })
  }, [])

  const set = (key, value) => {
    setF((x) => ({ ...x, [key]: value }))
    if (value && value !== 'all') track('template_filter_used', { filter: key, value })
  }

  return (
    <div className="builder tpl-page">
      <header className="builder-header">
        <Link to="/" className="landing-brand" aria-label="Eurowander home">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
        </Link>
        <nav aria-label="Main">
          <Link to="/explore">Explore</Link>
          <Link to="/build">Build a trip</Link>
          <Link to="/trip">My trip</Link>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </nav>
      </header>

      <main className="builder-main" id="trip-ideas-main">
        <section className="builder-intro">
          <p className="eyebrow">Ready-made trips</p>
          <h1>Start with a trip</h1>
          <p className="hero-sub">
            Routes that work, with nights, train times and ideas for every day. Open one, then make it yours: change the dates, cities and pace, or ask the copilot. Or{' '}
            <Link to="/build">build one from scratch</Link>.
          </p>
        </section>

        <div className="quick-chips tpl-cats" role="group" aria-label="Kind of trip">
          <button type="button" className={`chip${f.category === 'all' ? ' chip-picked' : ''}`} aria-pressed={f.category === 'all'} onClick={() => set('category', 'all')}>
            All trips
          </button>
          {TEMPLATE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`chip${f.category === c.id ? ' chip-picked' : ''}`} aria-pressed={f.category === c.id} onClick={() => set('category', c.id)}>
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        <div className="tpl-filters" role="group" aria-label="Filters">
          <label>
            Length
            <select value={f.duration} onChange={(e) => set('duration', e.target.value)}>
              <option value="">Any length</option>
              {DURATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Style
            <select value={f.style} onChange={(e) => set('style', e.target.value)}>
              <option value="">Any style</option>
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <select value={f.country} onChange={(e) => set('country', e.target.value)}>
              <option value="">Anywhere</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pace
            <select value={f.pace} onChange={(e) => set('pace', e.target.value)}>
              <option value="">Any pace</option>
              {PACES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Countries
            <select value={f.countries} onChange={(e) => set('countries', e.target.value)}>
              <option value="">One or more</option>
              <option value="one">One country</option>
              <option value="multi">Two or more</option>
            </select>
          </label>
          {filtered && (
            <button type="button" className="link-btn small" onClick={() => setF(EMPTY)}>
              Clear filters
            </button>
          )}
        </div>

        <p className="rule" role="status">
          {list.length} {list.length === 1 ? 'trip' : 'trips'}
        </p>
        {list.length ? (
          <ul className="tpl-grid">
            {list.map((t) => (
              <li key={t.id}>
                <TemplateCard template={t} headingLevel={2} onOpen={() => track('trip_template_opened', { template: t.id, source: 'trip_ideas' })} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="builder-empty">
            <p>No ready-made trip matches all of those. Try fewer filters, or let Eurowander build one around exactly what you want.</p>
            <p>
              <button type="button" className="btn" onClick={() => setF(EMPTY)}>
                Clear filters
              </button>{' '}
              <Link to="/build" className="btn btn-primary">
                Build my trip
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
