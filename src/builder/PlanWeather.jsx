import { cityById } from '../data/cities.js'
import { describe } from '../lib/weather.js'
import { rainSuggestions, weatherOutlook } from '../planner/weatherPlan.js'
import DataBadge from './DataBadge.jsx'
import { dayTitle } from './DayPlans.jsx'

const KIND_BADGE = { forecast: 'live', 'last-year': 'history', seasonal: 'seasonal' }

// Weather: live forecasts only within 16 days, last year's weather further out, and seasonal notes
// without dates. Only a real forecast can suggest moving plans around.
export default function PlanWeather({ plan, days, weather, daysPlanned, onApplyRain }) {
  const byDay = weather.byDay || {}
  const outlook = weatherOutlook(plan, days, byDay)
  const suggestions = daysPlanned ? rainSuggestions(days, byDay) : []
  const rows = days.filter((d) => byDay[d.number])
  return (
    <div className="plan-weather">
      {weather.status === 'loading' && <p className="rule">Loading weather from Open-Meteo…</p>}
      {weather.status === 'error' && (
        <p className="note note-warn">
          Weather couldn’t load right now.{' '}
          <button type="button" className="link-btn small" onClick={weather.retry}>
            Try again
          </button>
        </p>
      )}
      <div className="outlook">
        <DataBadge kind={KIND_BADGE[outlook.kind] || 'seasonal'} />
        {outlook.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      {suggestions.length > 0 && (
        <>
          <h3 className="subhead">Rain plan</h3>
          <ul className="notes">
            {suggestions.map((s) => (
              <li key={s.id} className="note note-tip">
                {s.text}{' '}
                <button type="button" className="link-btn small" onClick={() => onApplyRain(s)}>
                  Swap them
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {!daysPlanned && outlook.kind === 'forecast' && <p className="rule">Plan your days to get swaps for rainy days.</p>}
      {rows.length > 0 && (
        <ul className="weather-rows">
          {rows.map((d) => {
            const w = byDay[d.number]
            const info = describe(w.code)
            return (
              <li key={d.number}>
                <span>
                  Day {d.number} · {dayTitle(d)} · {cityById[d.cityId].name}
                </span>
                <span>
                  <span aria-hidden="true">{info.icon}</span> {Math.round(w.max)}° / {Math.round(w.min)}°{w.kind === 'forecast' && w.rain != null ? `, ${w.rain}% rain` : w.rain != null ? `, ${w.rain} mm` : ''}
                </span>
                <DataBadge kind={w.kind === 'forecast' ? 'live' : 'history'} />
              </li>
            )
          })}
        </ul>
      )}
      <p className="rule">Weather by Open-Meteo. Forecasts reach 16 days ahead; further out you see last year’s weather on the same dates, which is history, not a prediction.</p>
    </div>
  )
}
