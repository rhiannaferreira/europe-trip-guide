import { cities } from '../data/cities.js'
import { countries } from '../data/countries.js'
import { interests } from '../data/interests.js'

export default function Filters({ country, city, activeInterests, onCountryChange, onCityChange, onToggleInterest }) {
  const cityOptions = country ? cities.filter((c) => c.country === country) : cities

  return (
    <div className="filters">
      <div className="filter-row">
        <label>
          Country
          <select value={country} onChange={(e) => onCountryChange(e.target.value)}>
            <option value="">All of Europe</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          City
          <select value={city} onChange={(e) => onCityChange(e.target.value)}>
            <option value="">All cities</option>
            {cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="interest-chips" role="group" aria-label="Interests">
        {interests.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`chip chip-${i.id}${activeInterests.has(i.id) ? ' active' : ''}`}
            aria-pressed={activeInterests.has(i.id)}
            onClick={() => onToggleInterest(i.id)}
          >
            <span aria-hidden="true">{i.icon}</span> {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}
