import { useEffect, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { templateDayCount, templatePath } from '../data/tripTemplates.js'
import { tripLegs } from '../lib/trip.js'
import { Link } from '../lib/router.jsx'
import Thumb from '../components/Thumb.jsx'
import { routeText, templateCountries, templateFlags } from './templateFacts.js'
import { countryByCode } from '../data/countries.js'
import { JourneyMeta, RailRoute } from '../components/RailRoute.jsx'
import './templates.css'

// Whether an element has come near the screen. The card's photo is only looked up then, so a row of cards
// never sends a burst of photo requests for cards nobody scrolls to.
function useNearScreen() {
  const ref = useRef(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (near || !ref.current) return undefined
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '200px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near])
  return [ref, near]
}

// One ready-made trip as a card: photo, days, flags, title, route, a few tags. Everything comes from the
// template's own small record; nothing here calls the planner or a live service.
export default function TemplateCard({ template: t, onOpen, headingLevel = 3, variant }) {
  const [ref, near] = useNearScreen()
  const hero = cityById[t.heroCityId] || cityById[t.stops[0].cityId]
  const H = `h${headingLevel}`
  const train = t.categories.includes('train')
  if (variant === 'feature') return <FeatureCard t={t} hero={hero} H={H} train={train} onOpen={onOpen} photoRef={ref} near={near} />
  return (
    <Link to={templatePath(t)} className="tpl-card" onClick={() => onOpen?.(t)} aria-label={`${t.title}: ${routeText(t.stops)}`}>
      <div ref={ref} className="tpl-card-photo">
        <Thumb id={hero.id} emoji={hero.emoji} alt="" kind={near ? 'city' : undefined} item={near ? hero : undefined} width={500} credit="title" />
        <span className="tpl-days-badge">
          {templateDayCount(t)} days{train ? <span aria-hidden="true"> · 🚆</span> : null}
        </span>
      </div>
      <div className="tpl-card-body">
        <p className="tpl-card-kicker">
          <span aria-hidden="true">{templateFlags(t)}</span> {t.name}
        </p>
        <H className="tpl-card-title">{t.title}</H>
        <p className="tpl-card-route">{routeText(t.stops)}</p>
        <p className="tpl-card-tags">{t.tags.slice(0, 3).join(' · ')}</p>
        <p className="tpl-card-desc">{t.description}</p>
        <span className="tpl-card-cta" aria-hidden="true">
          Explore trip →
        </span>
      </div>
    </Link>
  )
}

// The home page's journey card: a photo, a ticket-style perforation, then the route as EuroWander draws it
// (stations, train times between them), the trip's name and style. One link, so it works without hover.
function FeatureCard({ t, hero, H, train, onOpen, photoRef, near }) {
  const legs = tripLegs(t.stops.map((s) => s.cityId))
  const railLegs = legs.filter((l) => l.mode === 'train').length
  const countryNames = templateCountries(t).map((c) => countryByCode[c].name)
  const where = countryNames.length > 2 ? `${countryNames.length} countries` : countryNames.join(' & ')
  return (
    <Link to={templatePath(t)} className="jcard" onClick={() => onOpen?.(t)}>
      <div ref={photoRef} className="jcard-photo">
        <Thumb id={hero.id} emoji={hero.emoji} alt="" kind={near ? 'city' : undefined} item={near ? hero : undefined} width={500} sizes="(max-width: 560px) 84vw, 380px" credit="title" />
        <JourneyMeta className="jcard-tag" items={[where, `${templateDayCount(t)} days`]} />
      </div>
      <div className="jcard-body">
        <RailRoute
          className="jcard-route"
          max={4}
          label={`Route: ${t.stops.map((s) => cityById[s.cityId]?.name).join(', ')}`}
          stops={t.stops.map((s) => ({ key: s.cityId, name: cityById[s.cityId]?.name }))}
          legs={legs}
        />
        <div className="jcard-text">
          <p className="jcard-kicker">{t.name}</p>
          <H className="jcard-title">{t.title}</H>
          <p className="jcard-tags">{t.tags.filter((tag) => tag !== 'Train-friendly').slice(0, 3).join(' · ')}</p>
        </div>
        <p className="jcard-foot">
          <span className="jcard-rail">{train ? `${railLegs} rail ${railLegs === 1 ? 'leg' : 'legs'}` : `${t.stops.length} stops`}</span>
          <span className="jcard-cta">
            Explore journey <span aria-hidden="true">→</span>
          </span>
        </p>
      </div>
    </Link>
  )
}
