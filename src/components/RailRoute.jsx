// EuroWander's route language: a thin rail line with station nodes, CITY labels and the travel time on the
// line between stops. Always a real list with the times as text, so the drawing is never the only way the
// route is told. Used on the home page (hero, Continue strip, journey cards); meant to spread to trip pages,
// the builder and share cards later.
import { formatDuration } from '../lib/format.js'
import './rail.css'

// "1h 25m", or "~4h" when the time is an estimate rather than a known fastest train.
export const legTime = (leg) => (leg ? `${leg.estimated ? '~' : ''}${formatDuration(leg.minutes)}` : '')

// Rail is the default, so only other ways of travelling are named on the line ("~3h bus").
const MODE_WORD = { bus: 'bus', flight: 'flight', 'rail + ferry': 'rail + ferry', ferry: 'ferry' }
export const legMode = (leg) => MODE_WORD[leg?.mode] || ''
const legHow = (leg) => (leg?.mode === 'flight' ? 'by plane' : leg?.mode === 'bus' ? 'by bus' : leg?.mode?.includes('ferry') ? 'by train and ferry' : 'by train')

// A city in station-board style: the name in tracked caps, a station or country underneath.
export function StationLabel({ name, sub, as: Tag = 'span', className = '' }) {
  return (
    <Tag className={`station-label ${className}`}>
      <span className="station-name">{name}</span>
      {sub && <span className="station-sub">{sub}</span>}
    </Tag>
  )
}

export function RouteNode({ end = false }) {
  return <span className={`route-node${end ? ' route-node-end' : ''}`} aria-hidden="true" />
}

// stops: [{ key, name, sub }]; legs[i] is the journey from stops[i] to stops[i + 1] ({ minutes, estimated }).
// direction 'vertical' (cards, hero, phones) or 'horizontal' (the Continue strip).
// max: show at most this many stops, then "+n more stops".
export function RailRoute({ stops, legs = [], direction = 'vertical', max, label, className = '', renderStop }) {
  const shown = max && stops.length > max ? [...stops.slice(0, max - 1), stops[stops.length - 1]] : stops
  const hidden = stops.length - shown.length
  return (
    <ol className={`rail-route rail-route-${direction} ${className}`} aria-label={label}>
      {shown.map((s, i) => {
        const last = i === shown.length - 1
        const skipped = hidden > 0 && i === shown.length - 2
        const leg = !last && !skipped ? legs[stops.indexOf(s)] : null
        return (
          <li key={s.key || s.name} className={`rail-stop${i === 0 || last ? ' rail-stop-end' : ''}`} style={{ '--i': i }}>
            <RouteNode end={i === 0 || last} />
            {renderStop ? renderStop(s, i) : <StationLabel name={s.name} sub={s.sub} />}
            {leg && (
              <span className={`rail-leg${legMode(leg) ? ' rail-leg-road' : ''}`}>
                <span className="visually-hidden">, then </span>
                {legTime(leg)}
                {legMode(leg) && <span aria-hidden="true"> {legMode(leg)}</span>}
                <span className="visually-hidden"> {legHow(leg)} to the next stop</span>
              </span>
            )}
            {skipped && (
              <span className="rail-leg rail-leg-more">
                +{hidden} more {hidden === 1 ? 'stop' : 'stops'}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// The same route language for lists people work with (a trip's stops, the builder's route editor): a rail
// line down the left edge with a station node at each stop, so cards, buttons and day plans sit beside it.
// Put .rail-track on the <ol>, .rail-track-stop on each stop's <li> with a <RouteNode> first, and
// .rail-track-leg on the journey between two stops (.is-road when it isn't by rail: the line is dashed).

// Small tracked-caps metadata: ITALY · 10 DAYS · 2 RAIL LEGS
export function JourneyMeta({ items, className = '' }) {
  return <p className={`journey-meta ${className}`}>{items.filter(Boolean).join(' · ')}</p>
}

// A short rail-red rule and a tracked-caps label above a section title.
export function SectionEyebrow({ children, className = '' }) {
  return <p className={`section-eyebrow ${className}`}>{children}</p>
}
