import { useCallback, useEffect, useRef, useState } from 'react'
import { featuredTemplates, tripTemplates } from '../data/tripTemplates.js'
import { track } from '../lib/analytics.js'
import { Link } from '../lib/router.jsx'
import TemplateCard from './TemplateCard.jsx'
import { SectionEyebrow } from '../components/RailRoute.jsx'

const preloadIdeas = () => import('./TemplatePage.jsx')
let seenThisVisit = false

// "Start with a trip" on the home page: the featured ready-made trips in one row (swipe on phones,
// whole cards at a time with previous / next buttons on wider screens), and a link to all of them.
export default function TemplateCards() {
  const ref = useRef(null)
  const rowRef = useRef(null)
  const [ends, setEnds] = useState({ start: true, end: false })

  // Whether the row can scroll further either way, so the buttons can say when there's nothing more.
  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    setEnds({ start: row.scrollLeft <= 4, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // One "page" of whole cards each way.
  const page = (dir) => {
    const row = rowRef.current
    if (!row) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    row.scrollBy({ left: dir * row.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  // Counted once per visit, when the row is actually on screen.
  useEffect(() => {
    if (seenThisVisit || !ref.current || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || seenThisVisit) return
      seenThisVisit = true
      track('trip_template_viewed', { source: 'home', count: featuredTemplates.length })
      io.disconnect()
    })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <div className="home-band home-band-trips">
      <section className="tpl-home" id="trip-ideas" aria-labelledby="tpl-home-title" ref={ref}>
        <div className="tpl-home-head">
          <div>
            <SectionEyebrow>Ready-made journeys</SectionEyebrow>
            <h2 id="tpl-home-title">Start with a journey</h2>
            <p className="section-sub">Choose a ready-made Europe itinerary, with the train legs worked out, and make it yours.</p>
          </div>
          <div className="tpl-home-tools">
            <Link to="/trip-ideas" className="tpl-all-link" onMouseEnter={preloadIdeas} onFocus={preloadIdeas}>
              All {tripTemplates.length} journeys <span aria-hidden="true">→</span>
            </Link>
            <div className="tpl-row-nav">
              <button type="button" className="tpl-row-btn" onClick={() => page(-1)} disabled={ends.start} aria-controls="tpl-home-row" aria-label="Previous journeys">
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" className="tpl-row-btn" onClick={() => page(1)} disabled={ends.end} aria-controls="tpl-home-row" aria-label="More journeys">
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
        <ul className="tpl-row" id="tpl-home-row" aria-label="Featured journeys" ref={rowRef} onScroll={measure}>
          {featuredTemplates.map((t) => (
            <li key={t.id}>
              <TemplateCard template={t} variant="feature" onOpen={() => track('trip_template_opened', { template: t.id, source: 'home' })} />
            </li>
          ))}
        </ul>
        <p className="tpl-home-foot">
          <Link to="/trip-ideas" className="home-text-link home-text-link-strong">
            See all {tripTemplates.length} journeys <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>
    </div>
  )
}
