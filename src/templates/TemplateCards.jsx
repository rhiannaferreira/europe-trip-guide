import { useEffect, useRef } from 'react'
import { featuredTemplates, tripTemplates } from '../data/tripTemplates.js'
import { track } from '../lib/analytics.js'
import { Link } from '../lib/router.jsx'
import TemplateCard from './TemplateCard.jsx'

const preloadIdeas = () => import('./TemplatePage.jsx')
let seenThisVisit = false

// "Start with a trip" on the home page: the featured ready-made trips in one row (swipe on phones,
// three or four at a time on wider screens), and a link to all of them.
export default function TemplateCards() {
  const ref = useRef(null)

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
    <section className="tpl-home" id="trip-ideas" aria-labelledby="tpl-home-title" ref={ref}>
      <div className="tpl-home-head">
        <div>
          <p className="eyebrow">Ready-made trips</p>
          <h2 id="tpl-home-title">Start with a trip</h2>
          <p className="section-sub">Choose a ready-made Europe itinerary and make it yours.</p>
        </div>
        <Link to="/trip-ideas" className="tpl-all-link" onMouseEnter={preloadIdeas} onFocus={preloadIdeas}>
          View all {tripTemplates.length} trips →
        </Link>
      </div>
      <ul className="tpl-row" aria-label="Featured trips">
        {featuredTemplates.map((t) => (
          <li key={t.id}>
            <TemplateCard template={t} onOpen={() => track('trip_template_opened', { template: t.id, source: 'home' })} />
          </li>
        ))}
      </ul>
      <p className="tpl-home-foot">
        <Link to="/trip-ideas" className="btn">
          Explore all trips
        </Link>
      </p>
    </section>
  )
}
