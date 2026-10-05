import { useState } from 'react'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { formatDay, travelDayAdvice } from '../utils/tripCalculations.js'
import { optimizeDay } from '../utils/routeOptimizer.js'
import { formatDistance } from '../utils/distance.js'
import DayPicker from './DayPicker.jsx'
import TrainSearchModal from './TrainSearch.jsx'
import { SourceLabel } from './LiveBits.jsx'
import { misdatedJourney, pickedJourney } from '../travel/travelModel.js'
import { stationName } from '../services/live/trains.js'
import { clock, durationText } from '../services/live/time.js'

// One day of the itinerary: its date and city, the places on it (in visiting order), and a note.
export const modeIcon = (mode) => ({ bus: '🚌', 'rail + ferry': '⛴️' })[mode] || '🚆'

export default function ItineraryDay({ day, entry, days, unscheduled, trip, selected, onSelect, onFocusPlace }) {
  const [optimizeMsg, setOptimizeMsg] = useState('')
  const [trains, setTrains] = useState(false)
  const city = cityById[day.cityId]
  const country = countryByCode[city.country]
  const placeIds = entry?.placeIds || []
  const note = entry?.note || ''
  // Set in Travel Mode: start times, and what was done or skipped on the day.
  const times = entry?.times || {}
  const done = new Set(entry?.done || [])
  const skipped = new Set(entry?.skipped || [])
  const fromCity = day.leg ? day.leg.from : null
  const advice = travelDayAdvice(day, placeIds.length)
  // A real train picked for this hop (and one saved for another date, after the trip's dates moved).
  const train = day.leg ? pickedJourney({ journeys: trip.journeys }, day) : null
  const oldTrain = day.leg ? misdatedJourney({ journeys: trip.journeys }, day) : null
  const dayIso = day.date ? `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}` : ''

  const optimize = () => {
    const result = optimizeDay(placeIds.map((id) => placeById[id]))
    if (result.changed) {
      trip.setDayOrder(day.number, result.order.map((p) => p.id))
      setOptimizeMsg(`Reordered by distance: ${formatDistance(result.before)} → ${formatDistance(result.after)} in straight lines.`)
    } else {
      setOptimizeMsg('This order already looks sensible by distance.')
    }
    onSelect(day.number)
  }

  // Unscheduled places for the "add" menu: this day's city first.
  const here = unscheduled.filter((id) => placeById[id].cityId === day.cityId)
  const elsewhere = unscheduled.filter((id) => placeById[id].cityId !== day.cityId)

  return (
    <article className={`day-card${day.leg ? ' travel-day' : ''}${selected ? ' selected' : ''}`} aria-labelledby={`day-${day.number}-title`}>
      <header className="day-header">
        <div>
          <h3 id={`day-${day.number}-title`}>
            Day {day.number} <span className="day-date">{formatDay(day.date)}</span>
          </h3>
          <p className="day-city">
            {fromCity ? `${fromCity.name} → ` : ''}
            {city.name} <span title={country.name}>{country.flag}</span>
          </p>
        </div>
        <button type="button" className={`btn map-day-btn${selected ? ' active' : ''}`} aria-pressed={selected} onClick={() => onSelect(selected ? null : day.number)}>
          🗺️ {selected ? 'On map' : 'Map'}
        </button>
      </header>

      {day.leg && train && (
        <div className="day-leg">
          🚆 {clock(train.departure.scheduled, train.origin.tz)} {stationName(train.origin.name)} → {clock(train.arrival.scheduled, train.destination.tz)} {stationName(train.destination.name)}{' '}
          <SourceLabel kind="scheduled" />
          <span className="leg-note">
            {durationText(train.durationMin)} · {train.transfers === 0 ? 'direct' : `${train.transfers} change${train.transfers === 1 ? '' : 's'}`}
            {train.operators?.length > 0 && ` · ${train.operators.join(', ')}`}. Live status shows in Travel Mode on the day.
          </span>
          <span className="journey-pick">
            <button type="button" className="btn" onClick={() => setTrains(true)}>
              Change train
            </button>
            <button type="button" className="btn" onClick={() => trip.setJourney(fromCity.id, city.id, null)}>
              Remove
            </button>
          </span>
        </div>
      )}
      {day.leg && !train && (
        <div className="day-leg">
          {modeIcon(day.leg.mode)} {fromCity.name} → {city.name}: ~{formatDuration(day.leg.minutes)}{' '}
          <SourceLabel kind="estimate">{day.leg.estimated ? 'Rough estimate' : 'Estimate'}</SourceLabel>
          {entry?.depart && <span className="day-depart"> · departs {entry.depart}</span>}
          {day.leg.estimated && day.leg.note && <span className="leg-note">{day.leg.note}</span>}
          {oldTrain && <span className="leg-note warn-text">Your saved train was for another date. Pick one for this day.</span>}
          {dayIso && (
            <span className="journey-pick">
              <button type="button" className="btn" onClick={() => setTrains(true)}>
                🚆 Find real trains
              </button>
            </span>
          )}
        </div>
      )}
      {trains && (
        <TrainSearchModal
          fromCityId={fromCity.id}
          toCityId={city.id}
          date={dayIso}
          time={entry?.depart || '08:00'}
          chosen={train}
          estimate={day.leg}
          onChoose={(j) => {
            trip.setJourney(fromCity.id, city.id, j)
            if (j) setTrains(false)
          }}
          onClose={() => setTrains(false)}
        />
      )}
      {advice && <p className={`note ${advice.level === 'heavy' ? 'note-warn' : 'note-tip'} travel-advice`}>{advice.text}</p>}

      {placeIds.length > 0 ? (
        <ol className="day-places">
          {placeIds.map((id, i) => {
            const place = placeById[id]
            const otherCity = place.cityId !== day.cityId ? cityById[place.cityId] : null
            return (
              <li key={id}>
                <span className="day-place-number">{i + 1}</span>
                <div className="day-place-main">
                  <button type="button" className="link-btn" onClick={() => onFocusPlace(id)}>
                    {place.name}
                  </button>
                  {(times[id] || done.has(id) || skipped.has(id)) && (
                    <small className="day-travel-marks">
                      {times[id] && <span>🕘 {times[id]}</span>}
                      {done.has(id) && <span className="done">✓ Done</span>}
                      {skipped.has(id) && <span>Skipped</span>}
                    </small>
                  )}
                  {otherCity && <small className="warn-text">In {otherCity.name}, not {city.name}</small>}
                </div>
                <div className="day-place-tools">
                  <button type="button" onClick={() => trip.movePlaceInDay(day.number, id, -1)} disabled={i === 0} aria-label={`Move ${place.name} earlier`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => trip.movePlaceInDay(day.number, id, 1)} disabled={i === placeIds.length - 1} aria-label={`Move ${place.name} later`}>
                    ↓
                  </button>
                  <DayPicker
                    days={days}
                    exclude={day.number}
                    preferCityId={place.cityId}
                    label={`Move ${place.name} to another day`}
                    placeholder="Move…"
                    onPick={(n) => trip.assignToDay(id, n)}
                    className="compact"
                  />
                  <button type="button" className="remove-btn" onClick={() => trip.removeFromDay(id)} aria-label={`Take ${place.name} off day ${day.number}`}>
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="no-places">Nothing planned yet. That's fine: free days are good too.</p>
      )}

      {placeIds.length >= 3 && (
        <div className="optimize">
          <button type="button" className="btn optimize-btn" onClick={optimize}>
            ✨ Optimize route
          </button>
          <small>{optimizeMsg || 'Orders places by distance to cut backtracking. A rough guide, not a perfect route.'}</small>
        </div>
      )}

      {unscheduled.length > 0 && (
        <select
          className="day-add"
          aria-label={`Add a saved place to day ${day.number}`}
          value=""
          onChange={(e) => e.target.value && trip.assignToDay(e.target.value, day.number)}
        >
          <option value="">+ Add a saved place</option>
          {here.length > 0 && (
            <optgroup label={`In ${city.name}`}>
              {here.map((id) => (
                <option key={id} value={id}>
                  {placeById[id].name}
                </option>
              ))}
            </optgroup>
          )}
          {elsewhere.length > 0 && (
            <optgroup label="Other saved places">
              {elsewhere.map((id) => (
                <option key={id} value={id}>
                  {placeById[id].name} ({cityById[placeById[id].cityId].name})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}

      <label className="note-field">
        <span className="visually-hidden">Notes for day {day.number}</span>
        <textarea rows={note ? 2 : 1} value={note} placeholder="📝 Notes for this day (optional)" onChange={(e) => trip.setDayNote(day.number, e.target.value)} />
      </label>
    </article>
  )
}
