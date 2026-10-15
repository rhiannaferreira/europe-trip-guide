import { useEffect, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { templateDayCount, templatePath } from '../data/tripTemplates.js'
import { tripLegs } from '../lib/trip.js'
import { formatDuration } from '../lib/format.js'
import { Link } from '../lib/router.jsx'
import Thumb from '../components/Thumb.jsx'
import { routeText, templateFlags } from './templateFacts.js'
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

// The home page's larger card: the photo carries the days, name, title and route; the rail facts sit below.
// No aria-label, so screen readers hear everything the card shows, in order.
function FeatureCard({ t, hero, H, train, onOpen, photoRef, near }) {
  const legs = tripLegs(t.stops.map((s) => s.cityId))
  const railLegs = legs.filter((l) => l.mode === 'train')
  const railMinutes = railLegs.reduce((n, l) => n + l.minutes, 0)
  return (
    <Link to={templatePath(t)} className="tpl-fcard" onClick={() => onOpen?.(t)}>
      <div ref={photoRef} className="tpl-fcard-photo">
        <Thumb id={hero.id} emoji={hero.emoji} alt="" kind={near ? 'city' : undefined} item={near ? hero : undefined} width={500} sizes="(max-width: 560px) 84vw, 380px" credit="title" />
        <span className="tpl-fcard-top">
          <span className="tpl-fcard-days">{templateDayCount(t)} days</span>
          {train && <span className="tpl-fcard-train">By train</span>}
        </span>
        <div className="tpl-fcard-overlay">
          <span className="tpl-fcard-kicker">{t.name}</span>
          <H className="tpl-fcard-title">{t.title}</H>
          <span className="tpl-fcard-route">
            {t.stops.map((s, i) => (
              <span key={s.cityId}>
                {i > 0 && (
                  <>
                    {' '}
                    <span className="tpl-fcard-sep" aria-hidden="true">
                      →
                    </span>{' '}
                  </>
                )}
                {cityById[s.cityId]?.name}
              </span>
            ))}
          </span>
        </div>
      </div>
      <span className="tpl-fcard-body">
        <span className="tpl-fcard-tags">{t.tags.filter((tag) => tag !== 'Train-friendly').slice(0, 3).join(' · ')}</span>
        <span className="tpl-fcard-meta">
          {railLegs.length > 0 ? (
            <>
              {railLegs.length} rail {railLegs.length === 1 ? 'leg' : 'legs'} · ~{formatDuration(railMinutes)}
            </>
          ) : (
            <>{t.stops.length} stops</>
          )}
          <span className="tpl-fcard-cta">
            Explore <span aria-hidden="true">→</span>
          </span>
        </span>
      </span>
    </Link>
  )
}
