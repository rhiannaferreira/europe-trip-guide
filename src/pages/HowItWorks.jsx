// How it works: a short guided tour for new visitors, in the home page's rail style. Four stops (explore,
// build, adjust with the copilot, travel), each with a small live demo that runs on Eurowander's own data
// and planner, so nothing on this page is a mock-up that can drift from what the app really does.
// Every demo ends in a button into the real feature.
import { useEffect, useMemo, useState } from 'react'
import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { interests, interestById } from '../data/interests.js'
import { places, placesInCity } from '../data/places.js'
import { featuredTemplates } from '../data/tripTemplates.js'
import { generatePlan } from '../planner/route.js'
import { planLegs, planTotals } from '../planner/plan.js'
import { legBetween } from '../planner/transport.js'
import { PACES } from '../planner/preferences.js'
import { requestAsk, requestBuild, setAssistantOpen } from '../assistant/bridge.js'
import { formatDuration } from '../lib/format.js'
import { Link, cityPath, navigate } from '../lib/router.jsx'
import { setPageMeta } from '../lib/meta.js'
import { JourneyMeta, RailRoute, SectionEyebrow, StationLabel, legTime } from '../components/RailRoute.jsx'
import Thumb from '../components/Thumb.jsx'
import SiteHeader from './SiteHeader.jsx'
import { savedTripSummary } from './Landing.jsx'
import './landing.css'
import './howItWorks.css'

export const HOW_META = {
  title: 'How it works',
  description:
    'A two-minute tour of Eurowander: browse places by interest, get a whole Europe rail trip drafted from your dates, fine-tune it with the copilot, then use Travel Mode on the road.',
  path: '/how-it-works',
}

const STOPS = [
  { id: 'explore', name: 'Explore', sub: 'Find places you like' },
  { id: 'build', name: 'Build', sub: 'Get a whole route drafted' },
  { id: 'adjust', name: 'Adjust', sub: 'Ask the copilot for changes' },
  { id: 'travel', name: 'Travel', sub: 'Today’s plan, on the road' },
]

const preloadBuilder = () => import('../builder/BuilderPage.jsx')
const preloadPlanner = () => import('../App.jsx')

// ---------- 1. Explore ----------
const EXPLORE_CITIES = ['paris', 'rome', 'barcelona']

function ExploreDemo() {
  const [cityId, setCityId] = useState('paris')
  const [interest, setInterest] = useState('')
  const [hearts, setHearts] = useState(() => new Set())
  const city = cityById[cityId]
  const all = placesInCity(cityId)
  const shown = (interest ? all.filter((p) => p.category === interest) : all).slice(0, 4)
  const toggle = (id) =>
    setHearts((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="how-demo how-explore" aria-label="Try it: browse places by interest">
      <p className="how-demo-tag">Try it · real places from the guide</p>
      <div className="how-tabs" role="group" aria-label="City">
        {EXPLORE_CITIES.map((id) => (
          <button key={id} type="button" className="how-tab" aria-pressed={id === cityId} onClick={() => setCityId(id)}>
            {cityById[id].name}
          </button>
        ))}
      </div>
      <div className="how-explore-city">
        <div className="how-explore-photo">
          <Thumb id={city.id} emoji={city.emoji} alt={`${city.name}, ${countryByCode[city.country].name}`} kind="city" item={city} width={500} credit="badge" />
        </div>
        <div>
          <StationLabel name={city.name} sub={countryByCode[city.country].name} />
          <p className="how-explore-desc">{city.description}</p>
        </div>
      </div>
      <div className="how-chips" role="group" aria-label="Interest">
        <button type="button" className="how-chip" aria-pressed={!interest} onClick={() => setInterest('')}>
          All
        </button>
        {interests.map((i) => (
          <button key={i.id} type="button" className="how-chip" aria-pressed={interest === i.id} onClick={() => setInterest(i.id)}>
            <span aria-hidden="true">{i.icon}</span> {i.label}
          </button>
        ))}
      </div>
      <ul className="how-places" aria-live="polite">
        {shown.length === 0 && <li className="how-empty">No {interestById[interest]?.label.toLowerCase()} picks in {city.name} yet. On the map, live places fill gaps like this.</li>}
        {shown.map((p) => (
          <li key={p.id} className="how-place">
            <span className="how-place-icon" aria-hidden="true">
              {interestById[p.category]?.icon}
            </span>
            <span className="how-place-text">
              <strong>{p.name}</strong>
              <span>{p.description}</span>
            </span>
            <button type="button" className="how-heart" aria-pressed={hearts.has(p.id)} aria-label={`Save ${p.name} (demo)`} onClick={() => toggle(p.id)}>
              {hearts.has(p.id) ? '♥' : '♡'}
            </button>
          </li>
        ))}
      </ul>
      <p className="how-demo-note">
        {hearts.size > 0
          ? `${hearts.size} saved in this demo. In the app, a heart adds the place, and its city, to My trip.`
          : 'Hearts here are only a demo. In the app, they add the place and its city to My trip.'}
      </p>
    </div>
  )
}

// ---------- 2. Build ----------
const BUILD_DAYS = [5, 7, 10, 14]
const BUILD_INTERESTS = [
  { id: 'food', label: 'Food' },
  { id: 'history', label: 'History' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'Nightlife' },
]
const BUILD_STARTS = ['', 'paris', 'amsterdam', 'rome', 'vienna']

function BuildDemo() {
  const [days, setDays] = useState(10)
  const [interest, setInterest] = useState('food')
  const [pace, setPace] = useState('moderate')
  const [start, setStart] = useState('paris')
  const input = useMemo(() => ({ days, interests: [interest], pace, startCityId: start, transport: 'train' }), [days, interest, pace, start])
  const { plan } = useMemo(() => generatePlan(input), [input])
  const legs = useMemo(() => planLegs(plan), [plan])
  const total = planTotals(plan)
  const onBoard = legs.reduce((n, l) => n + l.minutes, 0)
  const countryCount = new Set(plan.stops.map((s) => cityById[s.cityId].country)).size

  const openInBuilder = () => {
    requestBuild(input)
    navigate('/build')
    window.scrollTo(0, 0)
  }

  return (
    <div className="how-demo how-build" aria-label="Try it: draft a trip">
      <p className="how-demo-tag">Try it · the real trip planner, running here</p>
      <div className="how-build-form">
        <div className="how-field">
          <span className="how-field-label" id="how-days">
            Days
          </span>
          <div className="how-tabs" role="group" aria-labelledby="how-days">
            {BUILD_DAYS.map((d) => (
              <button key={d} type="button" className="how-tab" aria-pressed={d === days} onClick={() => setDays(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="how-field">
          <span className="how-field-label" id="how-interest">
            Into
          </span>
          <div className="how-tabs" role="group" aria-labelledby="how-interest">
            {BUILD_INTERESTS.map((i) => (
              <button key={i.id} type="button" className="how-tab" aria-pressed={i.id === interest} onClick={() => setInterest(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        </div>
        <div className="how-field">
          <span className="how-field-label" id="how-pace">
            Pace
          </span>
          <div className="how-tabs" role="group" aria-labelledby="how-pace">
            {PACES.map((p) => (
              <button key={p.id} type="button" className="how-tab" aria-pressed={p.id === pace} onClick={() => setPace(p.id)} title={p.hint}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <label className="how-field">
          <span className="how-field-label">Start in</span>
          <select className="how-select" value={start} onChange={(e) => setStart(e.target.value)}>
            {BUILD_STARTS.map((id) => (
              <option key={id || 'any'} value={id}>
                {id ? cityById[id].name : 'Anywhere'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="how-build-result" aria-live="polite">
        <JourneyMeta
          className="how-build-meta"
          items={[`${total.days} days`, `${plan.stops.length} ${plan.stops.length === 1 ? 'stop' : 'stops'}`, `${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`, legs.length > 0 && `${formatDuration(onBoard)} on board`]}
        />
        <RailRoute
          className="how-build-route"
          label={`Drafted route: ${plan.stops.map((s) => cityById[s.cityId].name).join(', ')}`}
          stops={plan.stops.map((s) => ({ key: s.cityId, name: cityById[s.cityId].name, sub: `${s.nights} ${s.nights === 1 ? 'night' : 'nights'} · ${countryByCode[cityById[s.cityId].country].name}` }))}
          legs={legs}
        />
      </div>
      <div className="how-demo-actions">
        <button type="button" className="home-cta how-cta-small" onClick={openInBuilder} onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
          Open this in the builder <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="how-demo-note">The builder adds dates, a plan for every day, weather and a rough budget, and you can swap any city.</p>
    </div>
  )
}

// ---------- 3. Adjust (copilot) ----------
// Each example's answer is worked out from the same data and planner the copilot uses. The real copilot
// words things its own way, so the demo says these are examples.
function copilotExamples() {
  const italy = generatePlan({ days: 7, includeCountries: ['IT'], interests: ['food'], startCityId: 'rome' }).plan
  const italyStops = italy.stops.map((s) => `${cityById[s.cityId].name} (${s.nights} ${s.nights === 1 ? 'night' : 'nights'})`)
  const gemId = cityById.venice.hiddenGems[0]
  const gem = cityById[gemId]
  const leg = legBetween('paris', 'amsterdam', { transport: 'train' })
  return [
    {
      prompt: 'Plan 7 days in Italy for food',
      answer: `Here’s a 7-day food trip by train: ${italyStops.join(', ')}. I can open it in the builder so you can change nights or swap a city.`,
    },
    {
      prompt: 'Swap Venice for somewhere quieter',
      answer: `Try ${gem.name}: ${gem.description} It’s one of the quieter alternatives near Venice. Want me to replace Venice with it in your trip?`,
    },
    {
      prompt: 'How long is the train from Paris to Amsterdam?',
      answer: `About ${legTime(leg)} on the fastest direct trains${leg.estimated ? ' (an estimate from the distance)' : ''}. Journey times are typical, not live timetables, so check the operator before you book.`,
    },
  ]
}

function CopilotDemo() {
  const examples = useMemo(copilotExamples, [])
  const [pick, setPick] = useState(0)
  const ex = examples[pick]

  return (
    <div className="how-demo how-copilot" aria-label="Try it: ask the copilot">
      <p className="how-demo-tag">Example answers from Eurowander’s data</p>
      <div className="how-chips" role="group" aria-label="Example questions">
        {examples.map((e, i) => (
          <button key={e.prompt} type="button" className="how-chip" aria-pressed={i === pick} onClick={() => setPick(i)}>
            {e.prompt}
          </button>
        ))}
      </div>
      <div className="how-chat" aria-live="polite">
        <p className="how-bubble how-bubble-you">
          <span className="visually-hidden">You: </span>
          {ex.prompt}
        </p>
        <p className="how-bubble how-bubble-ew">
          <span className="how-bubble-who" aria-hidden="true">
            EuroWander
          </span>
          <span className="visually-hidden">EuroWander: </span>
          {ex.answer}
        </p>
      </div>
      <div className="how-demo-actions">
        <button type="button" className="home-cta how-cta-small" onClick={() => requestAsk(ex.prompt, { source: 'how_it_works', kind: 'ask' })}>
          Ask the copilot for real <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="how-demo-note">The copilot can change your trip too, and always shows you the change before it applies it.</p>
    </div>
  )
}

// ---------- 4. Travel ----------
function TravelDemo() {
  const today = placesInCity('florence').slice(0, 3)
  const leg = legBetween('florence', 'bologna', { transport: 'train' })
  return (
    <div className="how-demo how-travel" aria-label="Example: Travel Mode on a phone">
      <p className="how-demo-tag">Example · Travel Mode on a phone</p>
      <div className="how-phone">
        <div className="how-phone-head">
          <JourneyMeta items={['Day 3 of 7', 'Florence']} />
          <p className="how-phone-title">Today</p>
        </div>
        <ol className="how-phone-list">
          {today.map((p, i) => (
            <li key={p.id} className={i === 0 ? 'done' : ''}>
              <span className="how-phone-check" aria-hidden="true">
                {i === 0 ? '✓' : ''}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>{i === 0 ? 'Done' : interestById[p.category]?.label}</small>
              </span>
            </li>
          ))}
        </ol>
        <div className="how-phone-next">
          <JourneyMeta items={['Tomorrow']} />
          <RailRoute
            direction="horizontal"
            className="how-phone-route"
            stops={[
              { key: 'florence', name: 'Florence' },
              { key: 'bologna', name: 'Bologna' },
            ]}
            legs={[leg]}
          />
        </div>
        <div className="how-phone-nav" aria-hidden="true">
          <span className="on">☀️ Today</span>
          <span>🗺️ Map</span>
          <span>🧳 Trip</span>
          <span>✨ Ask</span>
        </div>
      </div>
    </div>
  )
}

// ---------- The page ----------
const KEEP = [
  { title: 'Saved as you go', text: 'Your trip stays in this browser, no account needed. Sign in with an email link if you want it on every device.' },
  { title: 'Share with one link', text: 'The whole trip packs into a link. Whoever opens it gets asked before it replaces their own trip.' },
  { title: 'Works offline', text: 'Install Eurowander as an app. Pages you’ve opened keep working on trains with no signal.' },
  { title: 'Print or PDF', text: 'A clean printable summary of stops, days and notes, for the folder in your bag.' },
]

const FAQ = [
  ['Is it free?', 'Yes. Everything on Eurowander is free to use, with no account needed.'],
  ['Are the train times live?', 'Journey times are typical fastest trains for each pair of cities, with estimates clearly marked. Eurowander helps you plan the shape of a trip; book tickets with the rail operator.'],
  ['Where do the places come from?', `${Math.floor(places.length / 10) * 10}+ hand-picked places across ${cities.length} cities, plus live places from OpenStreetMap on the map. Photos come from Wikimedia Commons, with credits on each one.`],
  ['Does the copilot need an account?', 'No. Open it from the EuroWander button on any page. It answers from Eurowander’s own data, and asks before it changes your trip.'],
]

function StepHead({ n, id, title, children }) {
  return (
    <div className="how-step-text">
      <p className="how-step-num" aria-hidden="true">
        {String(n).padStart(2, '0')}
      </p>
      <SectionEyebrow>{STOPS.find((s) => s.id === id).name}</SectionEyebrow>
      <h2 id={`how-${id}-title`}>{title}</h2>
      {children}
    </div>
  )
}

export default function HowItWorks() {
  const saved = savedTripSummary()
  useEffect(() => setPageMeta(HOW_META), [])

  return (
    <div className="landing how">
      <a className="skip-link" href="#how-main">
        Skip to content
      </a>
      <SiteHeader saved={saved} current="/how-it-works" />

      <main id="how-main" tabIndex={-1}>
        <div className="home-band how-hero-band">
          <section className="how-hero" aria-labelledby="how-title">
            <div>
              <SectionEyebrow>How it works</SectionEyebrow>
              <h1 id="how-title">
                From first idea to the platform, in <em>four stops</em>.
              </h1>
              <p className="hero-sub">
                Eurowander is a trip guide for Europe by train. Find places you love, get a whole route drafted in seconds, fine-tune it with the copilot, then take it with you. Every demo below runs on the real app.
              </p>
              <JourneyMeta className="how-hero-meta" items={[`${countries.length} countries`, `${cities.length} cities`, 'Free', 'No account needed']} />
            </div>
            <nav aria-label="Tour stops" className="how-hero-route">
              <RailRoute
                stops={STOPS.map((s) => ({ key: s.id, name: s.name, sub: s.sub }))}
                renderStop={(s, i) => (
                  <a href={`#how-${s.key}`} className="how-hero-stop">
                    <span className="how-hero-n">{String(i + 1).padStart(2, '0')}</span>
                    <StationLabel name={s.name} sub={s.sub} />
                  </a>
                )}
              />
            </nav>
          </section>
        </div>

        <section className="how-step" id="how-explore" aria-labelledby="how-explore-title">
          <StepHead n={1} id="explore" title="Browse Europe by what you love">
            <p>
              Pick a country or city and filter its places by food, outdoors, museums, nightlife, history or shopping. Every famous city comes with quieter hidden gems nearby, and the map adds live places around them.
            </p>
            <p>Heart what you like. Its city becomes a stop on your trip.</p>
            <div className="how-step-links">
              <Link to="/explore" className="home-text-link home-text-link-strong" onMouseEnter={preloadPlanner} onFocus={preloadPlanner}>
                Explore the map <span aria-hidden="true">→</span>
              </Link>
              <Link to={cityPath('florence')} className="home-text-link">
                or open a city page
              </Link>
            </div>
          </StepHead>
          <ExploreDemo />
        </section>

        <section className="how-step how-step-flip" id="how-build" aria-labelledby="how-build-title">
          <StepHead n={2} id="build" title="Get a whole rail route drafted">
            <p>
              Tell the trip builder how many days you have, what you’re into and how fast you like to travel. It picks cities in a sensible order, gives each the right number of nights and keeps train legs short. Change anything you like below and watch the route redraw.
            </p>
            <p>Rather start from something proven? Pick a ready-made trip and make it yours.</p>
            <ul className="how-ideas">
              {featuredTemplates.slice(0, 3).map((t) => (
                <li key={t.slug}>
                  <Link to={`/trip-ideas/${t.slug}`} className="home-text-link">
                    {t.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/trip-ideas" className="home-text-link home-text-link-strong">
                  All trip ideas <span aria-hidden="true">→</span>
                </Link>
              </li>
            </ul>
          </StepHead>
          <BuildDemo />
        </section>

        <section className="how-step" id="how-adjust" aria-labelledby="how-adjust-title">
          <StepHead n={3} id="adjust" title="Fine-tune it, or just ask">
            <p>
              Plan each day with your saved places, see the forecast and a rough budget, and add notes. Or open the EuroWander copilot on any page and say what you want in plain words: a new trip, a quieter city, a lighter day, a train time.
            </p>
            <div className="how-step-links">
              <button type="button" className="home-text-link home-text-link-strong how-link-btn" onClick={() => setAssistantOpen(true)}>
                Open the copilot <span aria-hidden="true">→</span>
              </button>
              <Link to="/trip" className="home-text-link">
                or open My trip
              </Link>
            </div>
          </StepHead>
          <CopilotDemo />
        </section>

        <section className="how-step how-step-flip" id="how-travel" aria-labelledby="how-travel-title">
          <StepHead n={4} id="travel" title="Take it with you">
            <p>
              Once you’re on the road, Travel Mode turns your plan into one screen for today: what’s next, the train you’re catching, places nearby and the weather. Tick things off, skip what you don’t fancy, and ask the copilot to replan the rest of the day.
            </p>
            <div className="how-step-links">
              <Link to="/travel" className="home-text-link home-text-link-strong">
                Open Travel Mode <span aria-hidden="true">→</span>
              </Link>
            </div>
          </StepHead>
          <TravelDemo />
        </section>

        <section className="how-keep" aria-labelledby="how-keep-title">
          <SectionEyebrow>Keep it</SectionEyebrow>
          <h2 id="how-keep-title">Yours, wherever you are</h2>
          <ul className="how-keep-grid">
            {KEEP.map((k) => (
              <li key={k.title}>
                <h3>{k.title}</h3>
                <p>{k.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="how-faq" aria-labelledby="how-faq-title">
          <SectionEyebrow>Good to know</SectionEyebrow>
          <h2 id="how-faq-title">Questions</h2>
          <div className="how-faq-list">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="how-end" aria-labelledby="how-end-title">
          <h2 id="how-end-title">
            Ready when you are. <em>All aboard.</em>
          </h2>
          <div className="home-ctas">
            <Link to="/build" className="home-cta" onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
              Build my trip <span aria-hidden="true">→</span>
            </Link>
            <Link to="/trip-ideas" className="home-text-link home-text-link-strong">
              Start with a ready-made journey <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Free to use, no account needed. Your trip is saved in this browser. Ratings, prices and journey times are estimates.</p>
      </footer>
    </div>
  )
}
