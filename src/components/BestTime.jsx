import { eventsInCity } from '../data/events.js'
import { monthNames, monthRange } from '../lib/format.js'

const fmtDay = (mmdd) => {
  const [m, d] = mmdd.split('-').map(Number)
  return `${d} ${monthNames[m - 1]}`
}

// Seasonal info for a city: a month strip plus the hardcoded seasons and yearly events.
export default function BestTime({ city }) {
  const s = city.seasons
  const events = eventsInCity(city.id)
  return (
    <div className="info-card">
      <h3>🗓️ Best time to visit {city.name}</h3>
      <div className="month-strip" aria-hidden="true">
        {monthNames.map((m, i) => (
          <span key={m} className={`month${s.bestWeather.includes(i + 1) ? ' best' : ''}${s.busy.includes(i + 1) ? ' busy' : ''}`}>
            {m[0]}
          </span>
        ))}
      </div>
      <p className="month-legend">Green: best general weather · underline: busy season</p>
      <dl className="season-rows" style={{ marginTop: 10 }}>
        <dt>Best weather</dt>
        <dd>{monthRange(s.bestWeather)}</dd>
        {(s.special || []).map((sp) => (
          <div key={sp.label} style={{ display: 'contents' }}>
            <dt>{sp.label}</dt>
            <dd>{monthRange(sp.months)}</dd>
          </div>
        ))}
        <dt>Busy season</dt>
        <dd>{monthRange(s.busy)}</dd>
        <dt>Lower cost</dt>
        <dd>{monthRange(s.lowerCost)}</dd>
      </dl>
      {events.length > 0 && (
        <>
          <p className="subhead">Yearly events</p>
          <ul className="event-list">
            {events.map((e) => (
              <li key={e.id}>
                <span aria-hidden="true">{e.emoji}</span>
                <span>
                  <strong>{e.name}</strong> · about {fmtDay(e.start)}
                  {e.end !== e.start ? ` – ${fmtDay(e.end)}` : ''}
                  <small>{e.description}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
