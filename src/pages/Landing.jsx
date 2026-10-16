import { useEffect } from 'react'
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { places } from '../data/places.js'
import { trainTimes } from '../data/trainTimes.js'
import { tripDays, tripLegs } from '../lib/trip.js'
import { formatDuration } from '../lib/format.js'
import { KEYS, readJSON } from '../lib/storage.js'
import { migrate } from '../lib/tripModel.js'
import TravelEntry from '../travel/TravelEntry.jsx'
import { Link, cityPath, countryPath } from '../lib/router.jsx'
import { setPageMeta } from '../lib/meta.js'
import Thumb from '../components/Thumb.jsx'
import InstallButton from '../components/InstallButton.jsx'
import TemplateCards from '../templates/TemplateCards.jsx'
import { JourneyMeta, RailRoute, SectionEyebrow, StationLabel } from '../components/RailRoute.jsx'
import './landing.css'

// Start downloading the planner while people read, so "Start exploring" opens instantly.
const preloadPlanner = () => import('../App.jsx')
const preloadBuilder = () => import('../builder/BuilderPage.jsx')

const SAMPLE_ROUTE = ['london', 'paris', 'brussels', 'amsterdam', 'berlin']
const GEM_SWAPS = [
  ['venice', 'chioggia'],
  ['barcelona', 'girona'],
  ['prague', 'brno'],
]
// The hero's example journey: real main stations; times come from the train-time data, not made up.
const HERO_JOURNEY = [
  { id: 'paris', station: 'Gare du Nord' },
  { id: 'brussels', station: 'Bruxelles-Midi' },
  { id: 'amsterdam', station: 'Amsterdam Centraal' },
]

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
  // Days only when the trip really says: its dates, or a length set on every stop.
  const byDates = tripDays(t.startDate, t.endDate)
  const byStops = stops.every((s) => Number.isInteger(s.days) && s.days > 0) ? stops.reduce((n, s) => n + s.days, 0) : null
  return { name: t.name?.trim() || 'Your trip', stops: stops.map((s) => s.cityId), days: byDates || byStops }
}

// "Your journey": the saved trip as a route strip, with real legs from the train-time data.
function ContinueStrip({ saved }) {
  const legs = tripLegs(saved.stops)
  return (
    <section className="home-continue-wrap" aria-labelledby="continue-title">
      <Link to="/trip" className="home-continue">
        <span className="home-continue-head">
          <span className="journey-meta">Your journey</span>
          <span id="continue-title" className="home-continue-name">
            {saved.name}
          </span>
        </span>
        <RailRoute
          direction="horizontal"
          className="home-continue-route"
          max={5}
          stops={saved.stops.map((id) => ({ key: id, name: cityById[id].name }))}
          legs={legs}
        />
        <span className="home-continue-end">
          <JourneyMeta items={[`${saved.stops.length} ${saved.stops.length === 1 ? 'stop' : 'stops'}`, saved.days && `${saved.days} days`]} />
          <span className="home-continue-go">
            Continue <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </section>
  )
}

// A faint rail line that runs behind the hero and on into the journeys, with a few station nodes.
function RailBackdrop() {
  return (
    <svg className="home-backdrop" aria-hidden="true" focusable="false" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice">
      <path className="home-backdrop-grid" d="M0 180H1440M0 450H1440M0 720H1440M360 0V900M720 0V900M1080 0V900" />
      <path className="home-backdrop-line" d="M-20 40 H 670 Q 725 40 725 95 V 735 Q 725 790 780 790 H 1460" />
      <circle cx="300" cy="40" r="5" />
      <circle cx="725" cy="420" r="5" />
      <circle cx="1120" cy="790" r="5" />
    </svg>
  )
}

export default function Landing() {
  const saved = savedTripSummary()
  const legs = tripLegs(SAMPLE_ROUTE)
  const routeMinutes = legs.reduce((n, l) => n + l.minutes, 0)
  const routeCountries = new Set(SAMPLE_ROUTE.map((id) => cityById[id].country)).size
  const heroLegs = tripLegs(HERO_JOURNEY.map((s) => s.id))
  const heroMinutes = heroLegs.reduce((n, l) => n + l.minutes, 0)
  const heroCountries = new Set(HERO_JOURNEY.map((s) => cityById[s.id].country)).size

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
        <div className="landing-header-inner">
          <div className="home-brand">
            <Link to="/" className="landing-brand" aria-label="Eurowander home">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
            </Link>
            <span className="home-brand-meta" aria-hidden="true">
              Europe · Train-first
            </span>
          </div>
          <nav aria-label="Main" className="home-nav">
            <Link to="/explore">Explore</Link>
            <Link to="/build" className="home-nav-build" onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
              Build a trip
            </Link>
            <Link to="/trip-ideas">Trip ideas</Link>
            <Link to="/trip" aria-label={saved ? `My trip, ${saved.stops.length} ${saved.stops.length === 1 ? 'stop' : 'stops'}` : undefined}>
              My trip
              {saved && (
                <span className="home-nav-count" aria-hidden="true">
                  · {saved.stops.length}
                </span>
              )}
            </Link>
            <InstallButton className="link-btn install-link" />
          </nav>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <div className="home-band home-band-hero">
          <RailBackdrop />
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-text">
              <TravelEntry trip={migrate(readJSON(KEYS.trip))} variant="landing" />
              <SectionEyebrow>Europe by rail</SectionEyebrow>
              <h1 id="hero-title">
                See more of Europe, <em>one train ride</em> at a time.
              </h1>
              <p className="hero-sub">
                Find places worth seeing, swap the crowded favourites for hidden gems, and stitch cities in different countries into one trip, planned day by day.
              </p>
              <div className="home-ctas">
                <Link to="/build" className="home-cta" onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
                  Build my trip <span aria-hidden="true">→</span>
                </Link>
                <a href="#trip-ideas" className="home-text-link home-text-link-strong">
                  Start with a ready-made journey <span aria-hidden="true">→</span>
                </a>
              </div>
              <p className="home-tertiary">
                or{' '}
                <Link to="/explore" className="home-text-link" onMouseEnter={preloadPlanner} onFocus={preloadPlanner}>
                  explore the map
                </Link>
                {!saved && (
                  <>
                    {' '}
                    ·{' '}
                    <a href="#sample-route" className="home-text-link">
                      see a sample rail route
                    </a>
                  </>
                )}
              </p>
              <p className="home-coverage">
                <span className="home-coverage-label">EuroWander covers</span> {countries.length} countries · {cities.length} cities · {Math.floor(places.length / 10) * 10}+ curated places{' '}
                <span className="home-coverage-live">+ live discoveries</span>
              </p>
            </div>

            <figure className="hero-journey" aria-labelledby="hero-journey-title">
              <figcaption className="hero-journey-head">
                <span id="hero-journey-title" className="journey-meta">
                  Example route · {HERO_JOURNEY.length} stops · {heroCountries} countries
                </span>
                <span className="journey-meta hero-journey-total">{formatDuration(heroMinutes)} on board</span>
              </figcaption>
              <RailRoute
                className="hero-route"
                label={`Example route: ${HERO_JOURNEY.map((s) => cityById[s.id].name).join(', ')}`}
                stops={HERO_JOURNEY.map((s) => ({ key: s.id, name: cityById[s.id].name, sub: s.station }))}
                legs={heroLegs}
                renderStop={(stop, i) => {
                  const c = cityById[stop.key]
                  return (
                    <div className={`hero-stop hero-stop-${i}`}>
                      <StationLabel name={stop.name} sub={stop.sub} />
                      <div className="hero-stop-photo">
                        <Thumb id={c.id} emoji={c.emoji} alt={`${c.name}, ${countryByCode[c.country].name}`} kind="city" item={c} width={i === 0 ? 960 : 500} credit="badge" eager={i === 0} />
                      </div>
                    </div>
                  )
                }}
              />
            </figure>
          </section>

          {saved && <ContinueStrip saved={saved} />}
        </div>

        <TemplateCards />

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
