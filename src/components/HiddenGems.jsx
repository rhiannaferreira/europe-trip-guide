import { cities, gemAlternativeTo, hiddenGemsFor } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { getTrainTime } from '../data/trainTimes.js'
import { formatDuration } from '../lib/format.js'
import Thumb from './Thumb.jsx'

// For a famous city: "Want something less crowded?" with its alternatives.
// For a hidden gem: which famous places it's an alternative to.
export default function HiddenGems({ city, tripCityIds, onSelectCity, onAddCity }) {
  if (city.hiddenGem) {
    const famous = gemAlternativeTo(city.id)
    if (famous.length === 0) return null
    return (
      <div className="info-card gems">
        <h3>💎 A quieter alternative to {famous.map((c) => c.name).join(' or ')}</h3>
        <p>Fewer crowds, usually lower prices, and still easy to reach.</p>
      </div>
    )
  }

  const gems = hiddenGemsFor(city)
  if (gems.length === 0) return null
  return (
    <div className="info-card gems">
      <h3>💎 Want something less crowded?</h3>
      <ul className="gem-list">
        {gems.map((gem) => {
          const link = getTrainTime(city.id, gem.id)
          const inTrip = tripCityIds.includes(gem.id)
          return (
            <li key={gem.id} className="gem">
              <Thumb id={gem.id} image={gem.image} emoji={gem.emoji} alt={gem.name} className="city-thumb" kind="city" item={gem} width={120} />
              <div className="gem-body">
                <strong>
                  {gem.name} {countryByCode[gem.country].flag}
                </strong>
                <p>{gem.description}</p>
                {link && (
                  <p>
                    {link.mode === 'bus' ? '🚌' : '🚆'} ~{formatDuration(link.minutes)} from {city.name} <span className="estimate">estimate</span>
                  </p>
                )}
                <div className="gem-actions">
                  <button type="button" className="btn" onClick={() => onSelectCity(gem.id)}>
                    Explore
                  </button>
                  <button type="button" className={`btn ${inTrip ? 'btn-done' : 'btn-gem'}`} disabled={inTrip} onClick={() => onAddCity(gem.id)}>
                    {inTrip ? '✓ In trip' : '+ Add to trip'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Hidden Gem Mode overview: every famous city next to its quieter alternatives.
export function GemPairs({ country, onSelectCity }) {
  const famous = cities.filter((c) => c.hiddenGems.length > 0 && (!country || c.country === country))
  if (famous.length === 0) return null
  return (
    <div className="info-card gems">
      <h3>Instead of the famous name, try…</h3>
      <ul className="gem-pairs">
        {famous.map((c) => (
          <li key={c.id}>
            {c.name} →{' '}
            {hiddenGemsFor(c).map((g, i) => (
              <span key={g.id}>
                {i > 0 && ', '}
                <button type="button" className="link-btn" onClick={() => onSelectCity(g.id)}>
                  {g.name}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
