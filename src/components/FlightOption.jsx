// The flight alternative for a long leg: airports at both ends, a rough door-to-door time next to the
// ground journey, and a link out to search real flights. Shown only where flying saves real time
// (lib/flights.js), so trains stay first.
import { formatDuration } from '../lib/format.js'
import { track } from '../lib/analytics.js'
import { airportText, flightOption, flightSearchUrl } from '../lib/flights.js'
import { SourceLabel } from './LiveBits.jsx'

export default function FlightOption({ leg, date = '' }) {
  const opt = flightOption(leg)
  if (!opt) return null
  const isFlight = leg.mode === 'flight'
  return (
    <span className="flight-option">
      <span>
        ✈️ {isFlight ? 'Fly ' : 'Or fly '}
        {airportText(leg.from, opt.fromAirports)} → {airportText(leg.to, opt.toAirports)}
        {!isFlight && (
          <>
            : about <strong>{formatDuration(opt.minutes)}</strong> door to door, against ~{formatDuration(opt.groundMinutes)} on the ground
          </>
        )}{' '}
        <SourceLabel kind="estimate">Estimate</SourceLabel>
      </span>
      <a
        className="btn btn-small"
        href={flightSearchUrl(leg, date)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('flight_search', { from: leg.from.id, to: leg.to.id })}
      >
        Search flights ↗
      </a>
    </span>
  )
}
