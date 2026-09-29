import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { daysOutsideTrip, stopDayRanges, unscheduledPlaceIds } from '../utils/tripCalculations.js'
import DayPicker from './DayPicker.jsx'
import ItineraryDay from './ItineraryDay.jsx'
import TripDates from './TripDates.jsx'

// How the trip's days are split between stops, with +/- to change a stop's length.
function DaySplit({ trip, days }) {
  const ranges = stopDayRanges(days, trip.stops)
  const anyFixed = ranges.some((r) => r.fixed)
  return (
    <div className="day-split">
      <div className="subhead-row">
        <p className="subhead">Days per city</p>
        {anyFixed && (
          <button type="button" className="link-btn small" onClick={trip.resetStopDays}>
            Share evenly again
          </button>
        )}
      </div>
      <ul>
        {ranges.map((r) => {
          const city = cityById[r.cityId]
          return (
            <li key={r.cityId} className={r.count === 0 ? 'no-days' : ''}>
              <span className="day-split-city">
                {countryByCode[city.country].flag} {city.name}
                <small>{r.count === 0 ? 'No days left' : r.count === 1 ? `Day ${r.firstDay}` : `Days ${r.firstDay}–${r.lastDay}`}</small>
              </span>
              <span className="stepper">
                <button type="button" onClick={() => trip.setStopDays(r.cityId, Math.max(0, r.count - 1))} disabled={r.count === 0} aria-label={`One day less in ${city.name}`}>
                  −
                </button>
                <span className="stepper-value">
                  {r.count}
                  {!r.fixed && <small title="Shared out automatically">auto</small>}
                </span>
                <button type="button" onClick={() => trip.setStopDays(r.cityId, r.count + 1)} disabled={r.count >= days.length} aria-label={`One day more in ${city.name}`}>
                  +
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      {ranges.some((r) => r.count === 0) && (
        <p className="note note-warn">Some cities have no days. Add days to them, lengthen the trip, or remove a stop.</p>
      )}
    </div>
  )
}

// Saved places that aren't on a day yet, each with a day picker.
function Unscheduled({ ids, days, trip, onFocusPlace }) {
  if (ids.length === 0) return null
  return (
    <details className="unscheduled" open={ids.length <= 6}>
      <summary>
        Saved places not on a day yet <span className="count">{ids.length}</span>
      </summary>
      <ul>
        {ids.map((id) => {
          const place = placeById[id]
          return (
            <li key={id}>
              <button type="button" className="link-btn" onClick={() => onFocusPlace(id)}>
                {place.name} <small>{cityById[place.cityId].name}</small>
              </button>
              <DayPicker days={days} preferCityId={place.cityId} label={`Add ${place.name} to a day`} placeholder="Add to day…" onPick={(n) => trip.assignToDay(id, n)} className="compact" />
            </li>
          )
        })}
      </ul>
    </details>
  )
}

// Days that hold places or notes but fall after the (new) end date. Kept, not deleted.
function OutsideDays({ numbers, trip, days }) {
  if (numbers.length === 0) return null
  return (
    <section className="outside-days">
      <p className="subhead">Outside your dates</p>
      <p className="rule">Your trip got shorter, so these plans no longer have a day. Move them onto a day or remove them.</p>
      {numbers.map((n) => {
        const entry = trip.itinerary[n]
        return (
          <div key={n} className="outside-day">
            <strong>Former day {n}</strong>
            <ul>
              {entry.placeIds.map((id) => (
                <li key={id}>
                  <span>{placeById[id].name}</span>
                  <DayPicker days={days} preferCityId={placeById[id].cityId} label={`Move ${placeById[id].name} to a day`} placeholder="Move to…" onPick={(d) => trip.assignToDay(id, d)} className="compact" />
                  <button type="button" className="remove-btn" onClick={() => trip.removeFromDay(id)} aria-label={`Take ${placeById[id].name} off the plan`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {entry.note && (
              <p className="outside-note">
                📝 {entry.note}{' '}
                <button type="button" className="link-btn small" onClick={() => trip.setDayNote(n, '')}>
                  Delete note
                </button>
              </p>
            )}
          </div>
        )
      })}
    </section>
  )
}

// The "Days" tab: one card per trip day, built from the trip dates and stops.
export default function DailyItinerary({ trip, days, tripLength, selectedDay, onSelectDay, onFocusPlace }) {
  if (trip.stops.length === 0) {
    return <p className="empty">Add a city with + or save places with ♡, then plan them day by day here.</p>
  }
  if (days.length === 0) {
    return (
      <>
        <TripDates startDate={trip.startDate} endDate={trip.endDate} days={tripLength} onChange={trip.setDates} />
        <p className="empty">Add your start and end dates to create Day 1, Day 2 and so on.</p>
      </>
    )
  }

  const unscheduled = unscheduledPlaceIds(trip.stops, trip.itinerary)
  const outside = daysOutsideTrip(trip.itinerary, days.length)

  return (
    <div className="itinerary">
      <TripDates startDate={trip.startDate} endDate={trip.endDate} days={tripLength} onChange={trip.setDates} />
      <DaySplit trip={trip} days={days} />
      <Unscheduled ids={unscheduled} days={days} trip={trip} onFocusPlace={onFocusPlace} />
      <div className="day-list">
        {days.map((day) => (
          <ItineraryDay
            key={day.number}
            day={day}
            entry={trip.itinerary[day.number]}
            days={days}
            unscheduled={unscheduled}
            trip={trip}
            selected={selectedDay === day.number}
            onSelect={onSelectDay}
            onFocusPlace={onFocusPlace}
          />
        ))}
      </div>
      <OutsideDays numbers={outside} trip={trip} days={days} />
    </div>
  )
}
