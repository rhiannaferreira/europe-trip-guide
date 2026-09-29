import { countryByCode } from '../data/countries.js'
import { getCountryTips } from '../data/countryTips.js'

const rows = [
  ['currency', '💶 Currency'],
  ['tipping', '🪙 Tipping'],
  ['dinner', '🍝 Dinner'],
  ['shopHours', '🕘 Shops'],
  ['sunday', '📅 Sunday'],
  ['transport', '🚇 Getting around'],
  ['trains', '🚆 Trains'],
  ['plugs', '🔌 Plugs'],
  ['culture', '🤝 Good to know'],
]

// Practical local info for one country, collapsible.
export default function CountryTips({ code }) {
  const country = countryByCode[code]
  const tips = getCountryTips(code)
  if (!country || !tips) return null
  return (
    <details className="info-card tips" open>
      <summary>
        {country.name} {country.flag} travel tips
      </summary>
      <dl>
        {rows
          .filter(([key]) => tips[key])
          .map(([key, label]) => (
            <div key={key} style={{ display: 'contents' }}>
              <dt>{label}</dt>
              <dd>{key === 'plugs' ? `Type ${tips[key]}` : tips[key]}</dd>
            </div>
          ))}
      </dl>
      {tips.extra?.length > 0 && (
        <ul className="extra">
          {tips.extra.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </details>
  )
}
