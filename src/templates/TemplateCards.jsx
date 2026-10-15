import { useCallback, useEffect, useRef, useState } from 'react'
import { featuredTemplates, tripTemplates } from '../data/tripTemplates.js'
import { track } from '../lib/analytics.js'
import { Link } from '../lib/router.jsx'
import TemplateCard from './TemplateCard.jsx'

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
            <p className="home-eyebrow">Ready-made trips</p>
            <h2 id="tpl-home-title">Start with a trip</h2>
            <p className="section-sub">Choose a ready-made Europe itinerary and make it yours.</p>
          </div>
          <div className="tpl-home-tools">
            <Link to="/trip-ideas" className="tpl-all-link" onMouseEnter={preloadIdeas} onFocus={preloadIdeas}>
              View all {tripTemplates.length} trips <span aria-hidden="true">→</span>
            </Link>
            <div className="tpl-row-nav">
              <button type="button" className="tpl-row-btn" onClick={() => page(-1)} disabled={ends.start} aria-controls="tpl-home-row" aria-label="Previous trips">
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" className="tpl-row-btn" onClick={() => page(1)} disabled={ends.end} aria-controls="tpl-home-row" aria-label="More trips">
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
        <ul className="tpl-row" id="tpl-home-row" aria-label="Featured trips" ref={rowRef} onScroll={measure}>
          {featuredTemplates.map((t) => (
            <li key={t.id}>
              <TemplateCard template={t} variant="feature" onOpen={() => track('trip_template_opened', { template: t.id, source: 'home' })} />
            </li>
          ))}
        </ul>
        <p className="tpl-home-foot">
          <Link to="/trip-ideas" className="home-cta home-cta-secondary">
            Explore all {tripTemplates.length} trips
          </Link>
        </p>
      </section>
    </div>
  )
}
