import { countries, countryByCode } from '../data/countries.js'
import { cities, citiesInCountry } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { costLabel } from '../lib/format.js'
import Thumb from './Thumb.jsx'

function CityCard({ city, inTrip, onSelect, onAddCity }) {
  const country = countryByCode[city.country]
  return (
    <article className="city-card">
      <button type="button" className="city-card-main" onClick={() => onSelect(city.id)}>
        <Thumb id={city.id} image={city.image} emoji={city.emoji} alt={city.name} className="city-thumb" />
        <span className="city-card-text">
          <strong>{city.name}</strong>
          <small>
            {country.flag} {country.name} · {costLabel(city.costLevel)}
          </small>
          {city.hiddenGem && <span className="badge badge-gem">💎 Hidden gem</span>}
        </span>
      </button>
      <button
        type="button"
        className={`add-city-btn${inTrip ? ' added' : ''}`}
        onClick={() => onAddCity(city.id)}
        aria-label={inTrip ? `${city.name} is in your trip` : `Add ${city.name} to trip`}
        title={inTrip ? 'In your trip' : 'Add to trip'}
        disabled={inTrip}
      >
        {inTrip ? '✓' : '+'}
      </button>
    </article>
  )
}

// Country picker, city grid, and the selected city's details (passed in as children).
export default function CityExplorer({ country, city, gemMode, tripCityIds, onSelectCountry, onSelectCity, onAddCity, onToggleGemMode, children }) {
  const inTrip = (id) => tripCityIds.includes(id)
  let list = country ? citiesInCountry(country) : cities
  if (gemMode) list = list.filter((c) => c.hiddenGem)
  else if (!country) list = list.filter((c) => !c.hiddenGem)

  return (
    <section className="explorer">
      <div className="explorer-header">
        <h2 className="section-title">Explore</h2>
        <button type="button" className={`gem-toggle${gemMode ? ' active' : ''}`} aria-pressed={gemMode} onClick={onToggleGemMode}>
          💎 Hidden gems
        </button>
      </div>

      <div className="country-chips" role="group" aria-label="Countries">
        <button type="button" className={`country-chip${!country ? ' active' : ''}`} aria-pressed={!country} onClick={() => onSelectCountry('')}>
          🌍 All
        </button>
        {countries.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`country-chip${country === c.code ? ' active' : ''}`}
            aria-pressed={country === c.code}
            onClick={() => onSelectCountry(c.code)}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>

      {city ? (
        <div className="city-detail-wrap">
          <button type="button" className="link-btn back-btn" onClick={() => onSelectCity('')}>
            ← All cities{country ? ` in ${countryByCode[country].name}` : ''}
          </button>
          <CityDetail city={city} inTrip={inTrip(city.id)} onAddCity={onAddCity} />
          {children}
        </div>
      ) : (
        <>
          <p className="explorer-hint">
            {gemMode
              ? 'Less crowded places that make great alternatives to the famous names.'
              : country
                ? `${list.length} cities in ${countryByCode[country].name}. Pick one to explore.`
                : 'Pick a country, or jump straight into a city.'}
          </p>
          <div className="city-grid">
            {list.map((c) => (
              <CityCard key={c.id} city={c} inTrip={inTrip(c.id)} onSelect={onSelectCity} onAddCity={onAddCity} />
            ))}
          </div>
          {list.length === 0 && <p className="empty">No hidden gems in this country yet.</p>}
          {children}
        </>
      )}
    </section>
  )
}

function CityDetail({ city, inTrip, onAddCity }) {
  const country = countryByCode[city.country]
  return (
    <article className="city-detail">
      <Thumb id={city.id} image={city.image} emoji={city.emoji} alt={city.name} className="city-hero" />
      <div className="city-detail-body">
        <div className="city-detail-title">
          <h2>
            {city.name} <span className="flag">{country.flag}</span>
          </h2>
          <button type="button" className={`btn${inTrip ? ' btn-done' : ' btn-primary'}`} onClick={() => onAddCity(city.id)} disabled={inTrip}>
            {inTrip ? '✓ In your trip' : '+ Add to trip'}
          </button>
        </div>
        <p className="city-meta">
          {country.name} · {city.lat.toFixed(4)}, {city.lng.toFixed(4)} · Cost {costLabel(city.costLevel)}
          {city.hiddenGem && <span className="badge badge-gem">💎 Hidden gem</span>}
        </p>
        <p>{city.description}</p>
        <p className="city-interests">
          Popular for{' '}
          {city.interests.map((id) => (
            <span key={id} className={`mini-tag tag-${id}`}>
              {interestById[id].icon} {interestById[id].label}
            </span>
          ))}
        </p>
      </div>
    </article>
  )
}
