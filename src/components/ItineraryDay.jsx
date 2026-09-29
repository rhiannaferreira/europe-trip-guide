import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { formatDay } from '../utils/tripCalculations.js'
import DayPicker from './DayPicker.jsx'

// One day of the itinerary: its date and city, the places on it (in visiting order), and a note.
export default function ItineraryDay({ day, entry, days, unscheduled, trip, onFocusPlace }) {
  const city = cityById[day.cityId]
  const country = countryByCode[city.country]
  const placeIds = entry?.placeIds || []
  const note = entry?.note || ''
  const fromCity = day.leg ? day.leg.from : null

  // Unscheduled places for the "add" menu: this day's city first.
  const here = unscheduled.filter((id) => placeById[id].cityId === day.cityId)
  const elsewhere = unscheduled.filter((id) => placeById[id].cityId !== day.cityId)

  return (
    <article className={`day-card${day.leg ? ' travel-day' : ''}`} aria-labelledby={`day-${day.number}-title`}>
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
      </header>

      {day.leg && (
        <p className="day-leg">
          🚆 {fromCity.name} → {city.name}: ~{formatDuration(day.leg.minutes)} <span className="estimate">{day.leg.estimated ? 'rough estimate' : 'estimate'}</span>
        </p>
      )}

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
