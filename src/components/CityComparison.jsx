import { cities, cityById } from '../data/cities.js'
import { countries, countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { costLabel, formatDuration, monthRange } from '../lib/format.js'
import { connectionsFrom, connectivityLabel, costLevelOf, dailyCostEur, gemLinks, interestStrength, stayText } from '../utils/cityInfo.js'

const COMPARED_INTERESTS = ['food', 'nightlife', 'museums', 'outdoors', 'history']

function CitySelect({ value, other, label, onChange }) {
  return (
    <select className="compare-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">Choose a city…</option>
      {countries.map((country) => (
        <optgroup key={country.code} label={`${country.flag} ${country.name}`}>
          {cities
            .filter((c) => c.country === country.code)
            .map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === other}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

// Each row returns what to show for one city. No scores, no winner.
const rows = [
  {
    label: 'Cost level',
    render: (c) => {
      const level = costLevelOf(c)
      return level ? (
        <>
          {level.label} ({costLabel(c.costLevel)})<small>~€{dailyCostEur(c)} a day per person, estimate</small>
        </>
      ) : (
        'No cost data'
      )
    },
  },
  ...COMPARED_INTERESTS.map((id) => ({
    label: `${interestById[id].icon} ${interestById[id].label}`,
    render: (c) => {
      const s = interestStrength(c, id)
      return (
        <>
          {s.known ? <strong>Known for it</strong> : <span className="muted">Not a highlight</span>}
          <small>
            {s.places} sample place{s.places === 1 ? '' : 's'}
          </small>
        </>
      )
    },
  })),
  { label: 'Typical stay', render: (c) => stayText(c) },
  {
    label: 'Best months',
    render: (c) => (
      <>
        {monthRange(c.bestMonths) || '—'}
        {c.seasons.busy?.length > 0 && <small>Busy: {monthRange(c.seasons.busy)}</small>}
      </>
    ),
  },
  {
    label: 'Train connections',
    render: (c) => {
      const links = connectionsFrom(c.id)
      return (
        <>
          {connectivityLabel(links.length)}
          {links.length > 0 && (
            <small>
              {links
                .slice(0, 3)
                .map((l) => `${l.city.name} ~${formatDuration(l.minutes)}`)
                .join(', ')}
            </small>
          )}
        </>
      )
    },
  },
  {
    label: 'Hidden gems',
    render: (c) => {
      const g = gemLinks(c)
      if (g.cities.length === 0) return <span className="muted">{c.hiddenGem ? 'A hidden gem itself' : 'None in the sample data'}</span>
      return g.kind === 'gems' ? `Try ${g.cities.map((x) => x.name).join(', ')}` : `A quieter alternative to ${g.cities.map((x) => x.name).join(', ')}`
    },
  },
]

// Two cities side by side, so you can see which fits your trip. Deliberately no overall winner.
export default function CityComparison({ a, b, onChange, tripCityIds, onViewCity, onAddCity }) {
  const cityA = cityById[a]
  const cityB = cityById[b]
  const picked = [cityA, cityB].filter(Boolean)
  return (
    <div className="compare">
      <div className="compare-pickers">
        <CitySelect value={a} other={b} label="First city" onChange={(id) => onChange(id, b)} />
        <button type="button" className="btn swap-btn" onClick={() => onChange(b, a)} aria-label="Swap cities" disabled={!a && !b}>
          ⇄
        </button>
        <CitySelect value={b} other={a} label="Second city" onChange={(id) => onChange(a, id)} />
      </div>

      {picked.length < 2 ? (
        <p className="empty">Pick two cities to see them side by side.</p>
      ) : (
        <>
          <h3 className="compare-title">
            {cityA.name} {countryByCode[cityA.country].flag} <span>vs</span> {cityB.name} {countryByCode[cityB.country].flag}
          </h3>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Compare</span>
                  </th>
                  {picked.map((c) => (
                    <th key={c.id} scope="col">
                      {c.name} {countryByCode[c.country].flag}
                      {c.hiddenGem && <span className="badge badge-gem">💎 Hidden gem</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {picked.map((c) => (
                      <td key={c.id}>{row.render(c)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="compare-actions">
                  <th scope="row">
                    <span className="visually-hidden">Actions</span>
                  </th>
                  {picked.map((c) => (
                    <td key={c.id}>
                      <button type="button" className="btn" onClick={() => onViewCity(c.id)}>
                        View city
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => onAddCity(c.id)} disabled={tripCityIds.includes(c.id)}>
                        {tripCityIds.includes(c.id) ? '✓ In trip' : '+ Add to trip'}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="rule">There's no overall winner: the right city depends on your trip. Costs, stays and train links are rough estimates from sample data.</p>
        </>
      )}
    </div>
  )
}
