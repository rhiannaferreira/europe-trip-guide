// Travel Mode's Trip and More tabs: the whole trip at a glance (days, journeys, notes, saved places,
// budget, tips) and practical things (emergency number, location, time zone, offline). Kept off Today.
import CountryTips from '../components/CountryTips.jsx'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { Link, navigate } from '../lib/router.jsx'
import { requestTab } from '../assistant/bridge.js'
import { track } from '../lib/analytics.js'
import { addToDay } from './travelActions.js'
import { clockIn, deviceZone, differsFromDevice, flagOf, hm, pickedJourney, toMinutes, zoneAbbr } from './travelModel.js'
import { modeIcon } from './ui.jsx'
import { SourceLabel } from '../components/LiveBits.jsx'
import { stationName } from '../services/live/trains.js'
import { clock } from '../services/live/time.js'

const fmtDay = (d) => d.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function TripView({ env }) {
  const { trip, days, status, day, showDay, change, readOnly } = env
  const todayN = status.today?.number
  const legs = days.filter((d) => d.leg)
  const cityNote = trip.notes?.cities?.[day.cityId]
  const planned = new Set(Object.values(trip.itinerary || {}).flatMap((d) => d.placeIds))
  const savedHere = Object.keys(trip.statuses || {}).filter((id) => placeById[id]?.cityId === day.cityId && !planned.has(id))
  const openPlanning = (tab) => {
    if (tab) requestTab(tab)
    navigate('/trip')
    window.scrollTo(0, 0)
  }
  return (
    <div className="tm-info">
      <section className="tm-card" aria-labelledby="tm-days">
        <h2 className="tm-h2" id="tm-days">
          {trip.name?.trim() || 'Your trip'}
        </h2>
        <ol className="tm-daylist">
          {days.map((d) => {
            const n = (trip.itinerary?.[d.number]?.placeIds || []).length
            const done = (trip.itinerary?.[d.number]?.done || []).length
            return (
              <li key={d.number}>
                <button type="button" className={`tm-dayrow${d.number === day.number ? ' current' : ''}`} onClick={() => showDay(d.number)} aria-current={d.number === day.number ? 'date' : undefined}>
                  <span className="tm-dayrow-n">Day {d.number}</span>
                  <span>
                    {fmtDay(d)} · {cityById[d.cityId].name} {flagOf(d.cityId)}
                    {d.leg && <span className="tm-muted"> · {modeIcon(d.leg.mode)} from {d.leg.from.name}</span>}
                  </span>
                  <span className="tm-muted">
                    {d.number === todayN ? 'Today · ' : ''}
                    {n ? `${done ? `${done}/` : ''}${n} planned` : 'Free'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {legs.length > 0 && (
        <section className="tm-card" aria-labelledby="tm-transport">
          <h2 className="tm-h2" id="tm-transport">
            Transportation
          </h2>
          <ul className="tm-plain">
            {legs.map((d) => {
              const dep = toMinutes(trip.itinerary?.[d.number]?.depart)
              const train = pickedJourney(trip, d)
              return (
                <li key={d.number}>
                  {modeIcon(d.leg.mode)} <strong>{d.leg.from.name} → {d.leg.to.name}</strong>, day {d.number} ({fmtDay(d)})
                  {train ? (
                    <span className="tm-muted">
                      {' '}
                      · {clock(train.departure.scheduled, train.origin.tz)} {stationName(train.origin.name)} → {clock(train.arrival.scheduled, train.destination.tz)} {stationName(train.destination.name)}
                      {(train.legs || []).some((l) => l.service) && ` · ${train.legs.map((l) => l.service).filter(Boolean).join(', ')}`} <SourceLabel kind="scheduled" />
                    </span>
                  ) : (
                    <span className="tm-muted">
                      {' '}
                      · about {formatDuration(d.leg.minutes)}
                      {d.leg.estimated ? ' (estimated)' : ''}
                      {dep != null ? ` · departs ${hm(dep)} (your time)` : ' · departure time not set'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="tm-source">Picked trains come from the published timetable. Other journey times are Eurowander’s typical times.</p>
        </section>
      )}

      {(trip.notes?.trip || cityNote) && (
        <section className="tm-card" aria-labelledby="tm-notes">
          <h2 className="tm-h2" id="tm-notes">
            Notes
          </h2>
          {trip.notes.trip && <p className="tm-note">{trip.notes.trip}</p>}
          {cityNote && (
            <p className="tm-note">
              <strong>{cityById[day.cityId].name}:</strong> {cityNote}
            </p>
          )}
        </section>
      )}

      {savedHere.length > 0 && (
        <section className="tm-card" aria-labelledby="tm-saved">
          <h2 className="tm-h2" id="tm-saved">
            Saved in {cityById[day.cityId].name}, not on a day
          </h2>
          <ul className="tm-plain">
            {savedHere.map((id) => (
              <li key={id} className="tm-saved-row">
                <span>{placeById[id].name}</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="btn tm-btn-sm"
                    onClick={() => {
                      change((t) => addToDay(t, day.number, id))
                      track('saved_place_added_today', { from: 'trip_tab' })
                    }}
                  >
                    + {env.isToday ? 'Today' : `Day ${day.number}`}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tm-card" aria-labelledby="tm-planning">
        <h2 className="tm-h2" id="tm-planning">
          Planning tools
        </h2>
        <div className="tm-actions">
          <button type="button" className="btn tm-btn" onClick={() => openPlanning('days')}>
            📅 Full itinerary
          </button>
          <button type="button" className="btn tm-btn" onClick={() => openPlanning('budget')}>
            💶 Budget
          </button>
          <button type="button" className="btn tm-btn" onClick={() => openPlanning('trip')}>
            📝 Edit notes
          </button>
        </div>
      </section>

      <CountryTips code={cityById[day.cityId].country} />
    </div>
  )
}

export function MoreView({ env }) {
  const { day, city, location, online } = env
  const now = new Date()
  const tz = day.zone
  const country = countryByCode[city.country]
  return (
    <div className="tm-info">
      <section className="tm-card tm-safety" aria-labelledby="tm-safety">
        <h2 className="tm-h2" id="tm-safety">
          Emergency
        </h2>
        <p>
          <a className="tm-call" href="tel:112">
            📞 112
          </a>
        </p>
        <p>The European emergency number for police, ambulance and fire. It works in {country?.name || 'every country on this trip'} and across the EU, the UK and Switzerland, free from any phone.</p>
      </section>

      <section className="tm-card" aria-labelledby="tm-location">
        <h2 className="tm-h2" id="tm-location">
          Location
        </h2>
        {location.status === 'on' ? (
          <>
            <p>Nearby places use your location from this visit. It isn’t saved or sent anywhere.</p>
            <button type="button" className="btn tm-btn" onClick={location.forget}>
              Stop using my location
            </button>
          </>
        ) : (
          <>
            <p>Travel Mode works without your location: Nearby uses your current or next stop instead. If you allow it, it’s read once when you ask, kept on this phone and never saved or sent.</p>
            <button type="button" className="btn tm-btn" onClick={location.request} disabled={location.status === 'asking'}>
              📍 Use my location
            </button>
            {location.status === 'denied' && <p className="tm-source">Location is blocked for this site in your browser’s settings.</p>}
          </>
        )}
      </section>

      <section className="tm-card" aria-labelledby="tm-time">
        <h2 className="tm-h2" id="tm-time">
          Time zone
        </h2>
        <p>
          Times are local to {city.name}: it’s {hm(clockIn(tz, now).minutes)} there ({zoneAbbr(tz, now)}).
          {differsFromDevice(tz, now) ? ` Your phone is set to ${hm(clockIn(deviceZone(), now).minutes)}.` : ' Your phone shows the same time.'}
        </p>
      </section>

      <section className="tm-card" aria-labelledby="tm-offline">
        <h2 className="tm-h2" id="tm-offline">
          Offline
        </h2>
        <p>
          {online ? 'You’re online.' : 'You’re offline.'} Your itinerary, dates, notes, saved places, journey times and country tips are stored on this phone and work without a connection. Weather shows the last forecast saved, with its time. Maps and new places need a connection.
        </p>
      </section>

      <div className="tm-actions tm-pad">
        <Link to="/trip" className="btn tm-btn">
          ← Back to planning
        </Link>
      </div>
    </div>
  )
}
