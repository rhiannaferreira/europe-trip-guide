import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { statusInfo } from '../lib/statuses.js'
import { formatMoney } from '../utils/budgetCalculations.js'
import { formatDay, formatLongDate, parseDate, stopDayRanges } from '../utils/tripCalculations.js'

const modeLabel = (mode) => (mode === 'train' ? 'Train' : mode === 'bus' ? 'Bus' : 'Rail + ferry')

// A clean, printable summary of the whole trip. The print stylesheet hides everything else on the page.
export default function PrintTrip({ trip, days, legs, budgetSummary, currency }) {
  const cities = trip.stops.map((s) => cityById[s.cityId])
  const countries = [...new Set(cities.map((c) => c.country))].map((code) => countryByCode[code])
  const ranges = stopDayRanges(days, trip.stops)
  const money = (n) => formatMoney(n, currency)
  const cityNotes = trip.stops.filter((s) => (trip.notes.cities[s.cityId] || '').trim())

  return (
    <article className="print-trip">
      <header>
        <h1>{trip.displayName}</h1>
        <p className="print-dates">
          {days.length
            ? `${formatLongDate(parseDate(trip.startDate))} – ${formatLongDate(parseDate(trip.endDate))} ${parseDate(trip.endDate).getFullYear()} · ${days.length} day${days.length === 1 ? '' : 's'}`
            : 'Dates not set'}
        </p>
        {countries.length > 0 && <p>Countries: {countries.map((c) => `${c.flag} ${c.name}`).join(', ')}</p>}
      </header>

      {trip.stops.length === 0 && <p>This trip has no cities yet.</p>}

      {cities.length > 0 && (
        <section>
          <h2>Cities</h2>
          <ol>
            {cities.map((c, i) => (
              <li key={c.id}>
                {c.name} {countryByCode[c.country].flag}
                {ranges[i]?.count > 0 && ` (${ranges[i].count} day${ranges[i].count === 1 ? '' : 's'})`}
              </li>
            ))}
          </ol>
        </section>
      )}

      {days.length > 0 && (
        <section>
          <h2>Daily itinerary</h2>
          {days.map((d) => {
            const entry = trip.itinerary[d.number]
            return (
              <div key={d.number} className="print-day">
                <h3>
                  Day {d.number} · {formatDay(d.date)} · {d.leg ? `${d.leg.from.name} → ` : ''}
                  {cityById[d.cityId].name}
                </h3>
                {d.leg && (
                  <p className="print-muted">
                    Travel day: {modeLabel(d.leg.mode)} ~{formatDuration(d.leg.minutes)} ({d.leg.estimated ? 'rough estimate' : 'estimate'})
                  </p>
                )}
                {entry?.placeIds.length ? (
                  <ol>
                    {entry.placeIds.map((id) => (
                      <li key={id}>{placeById[id].name}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="print-muted">Nothing planned.</p>
                )}
                {entry?.note && <p>Note: {entry.note}</p>}
              </div>
            )
          })}
        </section>
      )}

      {legs.length > 0 && (
        <section>
          <h2>Transportation</h2>
          <ul>
            {legs.map((l) => (
              <li key={`${l.from.id}-${l.to.id}`}>
                {l.from.name} → {l.to.name}: {modeLabel(l.mode)} ~{formatDuration(l.minutes)} ({l.estimated ? 'rough estimate' : 'estimate'}){l.note ? `. ${l.note}` : ''}
              </li>
            ))}
          </ul>
          <p className="print-muted">Times are approximate sample values, not live timetables.</p>
        </section>
      )}

      {trip.stops.some((s) => s.placeIds.length) && (
        <section>
          <h2>Saved places</h2>
          {trip.stops
            .filter((s) => s.placeIds.length)
            .map((s) => (
              <div key={s.cityId}>
                <h3>{cityById[s.cityId].name}</h3>
                <ul>
                  {s.placeIds.map((id) => (
                    <li key={id}>
                      {statusInfo(trip.statuses[id]).icon} {placeById[id].name} ({statusInfo(trip.statuses[id]).label})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      )}

      <section>
        <h2>Budget summary</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <th scope="row">Total budget</th>
              <td>{budgetSummary.total === null ? 'Not set' : money(budgetSummary.total)}</td>
            </tr>
            <tr>
              <th scope="row">Estimated spending</th>
              <td>{money(budgetSummary.estimated)}</td>
            </tr>
            {budgetSummary.remaining !== null && (
              <tr>
                <th scope="row">Remaining</th>
                <td>{money(budgetSummary.remaining)}</td>
              </tr>
            )}
            {budgetSummary.categories.map((c) => (
              <tr key={c.id} className="print-sub">
                <th scope="row">{c.label}</th>
                <td>{money(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="print-muted">Rough planning estimates from sample cost levels, not live prices.</p>
      </section>

      {(trip.notes.trip.trim() || cityNotes.length > 0) && (
        <section>
          <h2>Travel notes</h2>
          {trip.notes.trip.trim() && <p className="print-note">{trip.notes.trip}</p>}
          {cityNotes.map((s) => (
            <p key={s.cityId} className="print-note">
              <strong>{cityById[s.cityId].name}:</strong> {trip.notes.cities[s.cityId]}
            </p>
          ))}
        </section>
      )}
    </article>
  )
}
