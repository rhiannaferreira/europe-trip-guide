import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import TripDates from './TripDates.jsx'
import StatusPicker from './StatusPicker.jsx'

const modeIcon = { train: '🚆', bus: '🚌', 'rail + ferry': '⛴️' }

function Leg({ leg }) {
  return (
    <div className="leg">
      <span aria-hidden="true">{modeIcon[leg.mode] || '🚆'}</span>
      <span>
        <span className="leg-mode">
          {leg.mode === 'train' ? 'Train' : leg.mode[0].toUpperCase() + leg.mode.slice(1)}: ~{formatDuration(leg.minutes)}
        </span>{' '}
        <span className="estimate">{leg.estimated ? 'rough estimate' : 'estimate'}</span>
        {leg.note && <span className="leg-note">{leg.note}</span>}
      </span>
    </div>
  )
}

// "My Trip": dates, the ordered list of stops with their saved places, and the travel legs between them.
export default function TripBoard({ trip, legs, days, onSelectCity, onFocusPlace, onViewTrip }) {
  const { stops, startDate, endDate } = trip

  const clear = () => {
    if (window.confirm('Clear your whole trip? This removes every stop and saved place.')) trip.clear()
  }

  return (
    <section className="trip-board" id="my-trip" aria-labelledby="my-trip-title">
      <div className="trip-header">
        <h2 className="section-title" id="my-trip-title">
          🧳 My Trip
        </h2>
        {stops.length > 0 && (
          <div className="trip-actions">
            <button type="button" className="link-btn" onClick={onViewTrip}>
              View on map
            </button>
            <button type="button" className="link-btn" onClick={clear}>
              Clear
            </button>
          </div>
        )}
      </div>

      <TripDates startDate={startDate} endDate={endDate} days={days} onChange={trip.setDates} />

      {stops.length === 0 ? (
        <p className="empty">
          Add cities with <strong>+</strong> or save places with <strong>♡</strong>. Mix as many countries as you like, then reorder the stops here.
        </p>
      ) : (
        <ol className="trip-cities">
          {stops.map((stop, i) => {
            const city = cityById[stop.cityId]
            return (
              <li key={stop.cityId}>
                <div className="trip-city">
                  <div className="trip-city-header">
                    <span className="stop-number">{i + 1}</span>
                    <h3>
                      <button type="button" className="link-btn" onClick={() => onSelectCity(city.id)}>
                        {city.name}
                      </button>{' '}
                      <span title={countryByCode[city.country].name}>{countryByCode[city.country].flag}</span>
                    </h3>
                    <div className="stop-tools">
                      <button type="button" onClick={() => trip.moveCity(city.id, -1)} disabled={i === 0} aria-label={`Move ${city.name} earlier`}>
                        ↑
                      </button>
                      <button type="button" onClick={() => trip.moveCity(city.id, 1)} disabled={i === stops.length - 1} aria-label={`Move ${city.name} later`}>
                        ↓
                      </button>
                      <button type="button" className="remove-stop" onClick={() => trip.removeCity(city.id)} aria-label={`Remove ${city.name} from trip`}>
                        ×
                      </button>
                    </div>
                  </div>
                  {stop.placeIds.length > 0 ? (
                    <ul>
                      {stop.placeIds.map((id) => (
                        <li key={id} className={trip.statuses[id] === 'visited' ? 'visited' : ''}>
                          <button type="button" className="link-btn" onClick={() => onFocusPlace(id)}>
                            {placeById[id].name}
                          </button>
                          <StatusPicker place={placeById[id]} status={trip.statuses[id]} onChange={(s) => trip.setStatus(id, s)} compact />
                          <button type="button" className="remove-btn" onClick={() => trip.togglePlace(id)} aria-label={`Remove ${placeById[id].name}`}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-places">No places saved here yet.</p>
                  )}
                  <details className="city-note" open={Boolean(trip.notes.cities[city.id])}>
                    <summary>📝 {trip.notes.cities[city.id] ? 'Note' : 'Add a note'}</summary>
                    <label className="note-field">
                      <span className="visually-hidden">Notes for {city.name}</span>
                      <textarea
                        rows={2}
                        value={trip.notes.cities[city.id] || ''}
                        placeholder={`e.g. Try the bakery near the hotel in ${city.name}`}
                        onChange={(e) => trip.setCityNote(city.id, e.target.value)}
                      />
                    </label>
                  </details>
                </div>
                {legs[i] && <Leg leg={legs[i]} />}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
