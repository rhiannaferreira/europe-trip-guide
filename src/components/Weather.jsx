import { cityById } from '../data/cities.js'
import { describe, FORECAST_DAYS, lastForecastDate, useForecast, useTripWeather } from '../lib/weather.js'

const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })
const shortDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const temp = (n) => `${Math.round(n)}°`

function Failed({ error, onRetry, what }) {
  return (
    <div className="notice" role="status">
      <span>{error?.offline ? `You're offline, so the ${what} can't load.` : `The ${what} couldn't load right now.`}</span>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

// The next week in a city, on its page.
export function CityWeather({ city }) {
  const fc = useForecast(city)
  return (
    <section className="weather" aria-labelledby="city-weather-title">
      <h3 className="subhead" id="city-weather-title">
        Weather this week in {city.name}
      </h3>
      {fc.status === 'loading' && (
        <div className="weather-strip" aria-label="Loading forecast" role="status">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="weather-day skeleton" />
          ))}
        </div>
      )}
      {fc.status === 'error' && <Failed error={fc.error} onRetry={fc.retry} what="forecast" />}
      {fc.status === 'ready' && fc.days.length === 0 && <p className="rule">No forecast available for {city.name} right now.</p>}
      {fc.status === 'ready' && fc.days.length > 0 && (
        <>
          <ul className="weather-strip">
            {fc.days.slice(0, 7).map((d) => {
              const w = describe(d.code)
              return (
                <li key={d.date} className="weather-day" title={`${w.text}, ${temp(d.min)} to ${temp(d.max)}, ${d.rain ?? 0}% chance of rain`}>
                  <span className="weather-dow">{weekday(d.date)}</span>
                  <span className="weather-icon" role="img" aria-label={w.text}>
                    {w.icon}
                  </span>
                  <span className="weather-temp">
                    {temp(d.max)} <small>{temp(d.min)}</small>
                  </span>
                  {d.rain != null && <span className="weather-rain">💧{d.rain}%</span>}
                </li>
              )
            })}
          </ul>
          <p className="source-note">
            Forecast by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Open-Meteo
            </a>
            , °C. Forecasts change; check again closer to the day.
          </p>
        </>
      )}
    </section>
  )
}

// Weather for each day of the trip, in the Trip tab.
export function TripWeather({ days }) {
  const withCities = days.map((d) => ({ ...d, city: cityById[d.cityId] }))
  const w = useTripWeather(withCities)

  if (days.length === 0) return null
  const start = days[0].date
  const end = days[days.length - 1].date
  const now = new Date()
  const over = end < new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const shown = withCities.filter((d) => w.byDay[d.number])
  const anyLastYear = shown.some((d) => w.byDay[d.number].kind === 'last-year')
  const horizon = lastForecastDate()

  return (
    <section className="trip-weather" aria-labelledby="trip-weather-title">
      <h2 className="section-title" id="trip-weather-title">
        Weather
      </h2>
      {over && <p className="empty">This trip is over, so there's no forecast to show.</p>}
      {!over && w.status === 'loading' && (
        <p className="loading-line" role="status">
          <span className="spinner small" aria-hidden="true" /> Checking the weather for your dates…
        </p>
      )}
      {!over && w.status === 'error' && <Failed error={w.error} onRetry={w.retry} what="weather" />}
      {!over && w.status === 'ready' && (
        <>
          {start > horizon && (
            <p className="rule">
              Forecasts only reach {FORECAST_DAYS} days ahead, so real forecasts appear from {shortDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() - FORECAST_DAYS + 1))}. Until then,
              here's the weather on the same dates last year as a rough guide.
            </p>
          )}
          {shown.length === 0 ? (
            <p className="empty">No weather data for these dates yet.</p>
          ) : (
            <ul className="trip-weather-list">
              {shown.map((d) => {
                const day = w.byDay[d.number]
                const info = describe(day.code)
                return (
                  <li key={d.number} className={day.kind === 'last-year' ? 'last-year' : ''}>
                    <span className="tw-date">
                      Day {d.number} · {shortDate(d.date)}
                    </span>
                    <span className="tw-city">{d.city.name}</span>
                    <span className="tw-icon" role="img" aria-label={info.text}>
                      {info.icon}
                    </span>
                    <span className="tw-temp">
                      {temp(day.max)} / {temp(day.min)}
                    </span>
                    <span className="tw-rain">
                      {day.kind === 'forecast' ? (day.rain != null ? `💧${day.rain}%` : '') : day.rain != null ? `${day.rain.toFixed(1)} mm` : ''}
                    </span>
                    {day.kind === 'last-year' && <span className="estimate">last year</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {w.partial && <p className="rule">Some cities' weather couldn't load. <button type="button" className="link-btn small" onClick={w.retry}>Try again</button></p>}
          <p className="source-note">
            {anyLastYear ? 'Last year’s weather is a rough guide, not a forecast. ' : ''}Data by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Open-Meteo
            </a>
            , °C{shown.some((d) => w.byDay[d.number].kind === 'forecast') ? ', 💧 chance of rain' : ''}.
          </p>
        </>
      )}
    </section>
  )
}
