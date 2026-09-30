import { useEffect } from 'react'
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { places } from '../data/places.js'
import { trainTimes } from '../data/trainTimes.js'
import { tripLegs } from '../lib/trip.js'
import { formatDuration } from '../lib/format.js'
import { KEYS, readJSON } from '../lib/storage.js'
import { Link, cityPath, countryPath } from '../lib/router.jsx'
import { setPageMeta } from '../lib/meta.js'
import Thumb from '../components/Thumb.jsx'
import InstallButton from '../components/InstallButton.jsx'

// Start downloading the planner while people read, so "Start exploring" opens instantly.
const preloadPlanner = () => import('../App.jsx')
const preloadBuilder = () => import('../builder/BuilderPage.jsx')

const SAMPLE_ROUTE = ['london', 'paris', 'brussels', 'amsterdam', 'berlin']
const GEM_SWAPS = [
  ['venice', 'chioggia'],
  ['barcelona', 'girona'],
  ['prague', 'brno'],
]
const HERO_CITIES = ['lisbon', 'florence', 'prague']

const PILLARS = [
  {
    icon: '🇪🇺',
    title: 'Only Europe, in depth',
    text: `${countries.length} countries and ${cities.length} cities, each with local tips on money, tipping, meal times, Sundays and trains, plus the best months to go and what's on.`,
  },
  {
    icon: '🚆',
    title: 'Train-first',
    text: `Journey times for ${trainTimes.length}+ city pairs, clearly marked estimates for the rest, and a heads-up when a leg is long enough for a night train or a flight.`,
  },
  {
    icon: '💎',
    title: 'Hidden gems',
    text: 'Every famous city comes with quieter alternatives nearby: same feel, fewer queues, often cheaper.',
  },
  {
    icon: '🧳',
    title: 'Multi-country plans',
    text: 'Mix stops from any countries, or let the trip builder draft the whole route from your dates, interests and pace. Then plan it day by day with a timeline, a rough budget and the weather.',
  },
]

const STEPS = [
  ['Explore', 'Pick a country or city and browse food, outdoors, museums, nightlife, history and shopping.'],
  ['Save', 'Heart the places you like. Their cities become the stops of your trip.'],
  ['Plan', 'Add dates to get days, travel legs, pace, a budget and the forecast.'],
  ['Share', 'Send the whole trip as a link. No account needed.'],
]

function savedTripSummary() {
  const t = readJSON(KEYS.trip)
  const stops = Array.isArray(t?.stops) ? t.stops.filter((s) => cityById[s?.cityId]) : []
  if (stops.length === 0) return null
  return { name: t.name?.trim() || 'your trip', count: stops.length }
}

export default function Landing() {
  const saved = savedTripSummary()
  const legs = tripLegs(SAMPLE_ROUTE)
  const routeMinutes = legs.reduce((n, l) => n + l.minutes, 0)
  const routeCountries = new Set(SAMPLE_ROUTE.map((id) => cityById[id].country)).size

  useEffect(() => {
    setPageMeta({ path: '/' })
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500))
    idle(() => preloadPlanner().catch(() => {}))
  }, [])

  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">
        Skip to content
      </a>
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Eurowander home">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
        </Link>
        <nav aria-label="Main">
          <Link to="/explore">Explore</Link>
          <Link to="/build">Build a trip</Link>
          <Link to="/trip">{saved ? `My trip (${saved.count})` : 'My trip'}</Link>
          <InstallButton className="link-btn install-link" />
        </nav>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">A trip guide for Europe</p>
            <h1>See more of Europe, one train ride at a time.</h1>
            <p className="hero-sub">
              Find places worth seeing, swap the crowded favourites for hidden gems, and stitch cities in different countries into one trip, planned day by day.
            </p>
            <div className="hero-actions">
              <Link to="/build" className="btn btn-primary btn-lg" onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
                Build my Europe trip
              </Link>
              <Link to="/explore" className="btn btn-lg" onMouseEnter={preloadPlanner} onFocus={preloadPlanner}>
                Start exploring
              </Link>
              {saved ? (
                <Link to="/trip" className="btn btn-lg">
                  Continue {saved.name} ({saved.count} {saved.count === 1 ? 'city' : 'cities'})
                </Link>
              ) : (
                <a href="#sample-route" className="btn btn-lg">
                  See a sample route
                </a>
              )}
            </div>
            <p className="hero-stats">
              <span>
                <strong>{countries.length}</strong> countries
              </span>
              <span>
                <strong>{cities.length}</strong> cities and towns
              </span>
              <span>
                <strong>{Math.floor(places.length / 10) * 10}+</strong> places, plus more from OpenStreetMap
              </span>
            </p>
          </div>
          <div className="hero-photos">
            {HERO_CITIES.map((id, i) => {
              const c = cityById[id]
              return <Thumb key={id} id={id} emoji={c.emoji} alt={c.name} kind="city" item={c} width={500} className={`hero-photo hero-photo-${i}`} credit="badge" eager={i === 0} />
            })}
          </div>
        </section>

        <section className="pillars" aria-labelledby="pillars-title">
          <h2 id="pillars-title">What makes Eurowander different</h2>
          <div className="pillar-grid">
            {PILLARS.map((p) => (
              <article key={p.title} className="pillar">
                <span className="pillar-icon" aria-hidden="true">
                  {p.icon}
                </span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sample-route" id="sample-route" aria-labelledby="route-title">
          <h2 id="route-title">
            {SAMPLE_ROUTE.length} cities, {routeCountries} countries, no flights
          </h2>
          <p className="section-sub">A classic northern loop, all by train. About {formatDuration(routeMinutes)} on board in total.</p>
          <ol className="route-line">
            {SAMPLE_ROUTE.map((id, i) => {
              const c = cityById[id]
              const leg = legs[i]
              return (
                <li key={id}>
                  <Link to={cityPath(id)} className="route-stop">
                    <span className="route-flag" aria-hidden="true">
                      {countryByCode[c.country].flag}
                    </span>
                    {c.name}
                  </Link>
                  {leg && (
                    <span className="route-leg">
                      🚆 ~{formatDuration(leg.minutes)}
                      {leg.estimated && <span className="estimate"> estimate</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="rule">Journey times are approximate fastest trains, not live timetables. Check with the rail operator before booking.</p>
        </section>

        <section className="gem-swaps" aria-labelledby="gems-title">
          <h2 id="gems-title">Swap the crowds for a hidden gem</h2>
          <div className="swap-grid">
            {GEM_SWAPS.map(([famousId, gemId]) => {
              const famous = cityById[famousId]
              const gem = cityById[gemId]
              return (
                <Link key={gemId} to={cityPath(gemId)} className="swap-card">
                  <Thumb id={gem.id} emoji={gem.emoji} alt={gem.name} kind="city" item={gem} width={500} className="swap-photo" credit="title" />
                  <span className="swap-text">
                    <small>Instead of {famous.name}</small>
                    <strong>
                      💎 {gem.name} {countryByCode[gem.country].flag}
                    </strong>
                    <span>{gem.description}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="steps" aria-labelledby="steps-title">
          <h2 id="steps-title">How it works</h2>
          <ol className="step-list">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span className="step-number" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="country-list" aria-labelledby="countries-title">
          <h2 id="countries-title">Where to?</h2>
          <ul>
            {countries.map((c) => (
              <li key={c.code}>
                <Link to={countryPath(c.code)} className="country-chip">
                  {c.flag} {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/explore" className="btn btn-primary btn-lg" onMouseEnter={preloadPlanner}>
            Start planning
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          Free to use, no account needed. Your trip is saved in this browser. Ratings, prices and journey times are estimates.
        </p>
        <p>
          Map data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap contributors
          </a>
          . Photos from{' '}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
            Wikimedia Commons
          </a>
          , with the photographer and licence on each photo (hover or focus the ©, or open the city). Weather by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
