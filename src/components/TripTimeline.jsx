import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { formatDay, travelDayAdvice } from '../utils/tripCalculations.js'
import { modeIcon } from './ItineraryDay.jsx'

const flagOf = (city) => countryByCode[city.country].flag

function LegLine({ leg }) {
  return (
    <span className="tl-leg">
      {modeIcon(leg.mode)} ~{formatDuration(leg.minutes)} <span className="estimate">{leg.estimated ? 'rough estimate' : 'estimate'}</span>
    </span>
  )
}

// Without dates: just the stops in order and the journeys between them.
function UndatedTimeline({ stops, legs }) {
  return (
    <>
      <p className="empty">Add trip dates to see the timeline day by day. For now, here's the order of your stops.</p>
      <ol className="timeline">
        {stops.map((s, i) => {
          const city = cityById[s.cityId]
          return (
            <li key={s.cityId} className={`tl-day${i > 0 ? ' tl-travel' : ''}`}>
              <span className="tl-dot" aria-hidden="true">
                {i > 0 && legs[i - 1] ? modeIcon(legs[i - 1].mode) : ''}
              </span>
              <div className="tl-body">
                {i > 0 && legs[i - 1] && (
                  <div className="tl-travel-row">
                    {legs[i - 1].from.name} → {city.name} <LegLine leg={legs[i - 1]} />
                  </div>
                )}
                <div className="tl-city">
                  {city.name} {flagOf(city)}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

// The whole trip at a glance: dates, cities, activities, travel days and approximate train times.
export default function TripTimeline({ stops, legs, days, itinerary, statuses, onOpenDay }) {
  if (stops.length === 0) return <p className="empty">Your timeline appears here once you add cities to the trip.</p>
  if (days.length === 0) return <UndatedTimeline stops={stops} legs={legs} />

  return (
    <ol className="timeline" aria-label="Trip timeline">
      {days.map((day) => {
        const city = cityById[day.cityId]
        const entry = itinerary[day.number]
        const placeIds = entry?.placeIds || []
        const advice = travelDayAdvice(day, placeIds.length)
        return (
          <li key={day.number} className={`tl-day${day.leg ? ' tl-travel' : ''}`}>
            <span className="tl-dot" aria-hidden="true">
              {day.leg ? modeIcon(day.leg.mode) : ''}
            </span>
            <div className="tl-body">
              <div className="tl-head">
                <span className="tl-date">{formatDay(day.date)}</span>
                <button type="button" className="link-btn small" onClick={() => onOpenDay(day.number)}>
                  Day {day.number}
                </button>
              </div>
              {day.leg ? (
                <div className="tl-city">
                  {day.leg.from.name} → {city.name} {flagOf(city)}
                  <LegLine leg={day.leg} />
                </div>
              ) : (
                <div className="tl-city">
                  {city.name} {flagOf(city)}
                </div>
              )}
              {day.leg?.estimated && day.leg.note && <p className="tl-note">{day.leg.note}</p>}
              {advice?.level === 'heavy' && <p className="tl-advice">{advice.text}</p>}
              {placeIds.length > 0 ? (
                <ul className="tl-activities">
                  {placeIds.map((id) => (
                    <li key={id}>
                      {statuses[id] === 'visited' ? '✓ ' : ''}
                      {placeById[id].name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tl-free">{day.leg ? 'Travel and settle in' : 'Free day'}</p>
              )}
              {entry?.note && <p className="tl-note">📝 {entry.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
