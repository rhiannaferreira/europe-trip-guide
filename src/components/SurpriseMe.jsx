import { useState } from 'react'
import { countryByCode } from '../data/countries.js'
import { BUDGETS, PREFERENCE_INTERESTS, SEASONS, explainSurprise, pickRandom, surpriseCandidates } from '../utils/matching.js'
import Thumb from './Thumb.jsx'

const RELAXED_TEXT = { season: 'season', budget: 'budget', interests: 'interests' }

// "Surprise Me": optional filters, then a random pick from the matching sample cities.
export default function SurpriseMe({ tripCityIds, onViewCity, onAddCity }) {
  const [interests, setInterests] = useState([])
  const [budget, setBudget] = useState('')
  const [season, setSeason] = useState('')
  const [pick, setPick] = useState(null) // { city, count, relaxed, filters }

  const filters = { interests, budget, season }
  const surprise = () => {
    const { cities, relaxed } = surpriseCandidates(filters)
    const city = pickRandom(cities, pick?.city.id)
    setPick(city ? { city, count: cities.length, relaxed, filters } : null)
  }
  const toggleInterest = (id) => setInterests((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const Choice = ({ selected, onClick, children }) => (
    <button type="button" className={`quiz-option small${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  )

  return (
    <div className="surprise">
      <p className="rule">All optional. Leave everything blank for a completely random city.</p>
      <p className="subhead">Interests</p>
      <div className="quiz-options">
        {PREFERENCE_INTERESTS.map((o) => (
          <Choice key={o.id} selected={interests.includes(o.id)} onClick={() => toggleInterest(o.id)}>
            {o.icon} {o.label}
          </Choice>
        ))}
      </div>
      <p className="subhead">Budget</p>
      <div className="quiz-options">
        {BUDGETS.map((o) => (
          <Choice key={o.id} selected={budget === o.id} onClick={() => setBudget(budget === o.id ? '' : o.id)}>
            {o.label}
          </Choice>
        ))}
      </div>
      <p className="subhead">Season</p>
      <div className="quiz-options">
        {SEASONS.map((o) => (
          <Choice key={o.id} selected={season === o.id} onClick={() => setSeason(season === o.id ? '' : o.id)}>
            {o.label}
          </Choice>
        ))}
      </div>

      <button type="button" className="btn btn-primary surprise-btn" onClick={surprise}>
        🎲 {pick ? 'Surprise me again' : 'Surprise me'}
      </button>

      {pick && (
        <div className="surprise-result" aria-live="polite">
          <Thumb id={pick.city.id} image={pick.city.image} emoji={pick.city.emoji} alt={pick.city.name} className="city-hero" />
          <div className="surprise-body">
            <h3>
              Surprise destination: {pick.city.name} {countryByCode[pick.city.country].flag}
            </h3>
            <p>{pick.city.description}</p>
            <p>{explainSurprise(pick.city, pick.filters)}</p>
            <p className="rule">
              Picked at random from {pick.count} matching {pick.count === 1 ? 'city' : 'cities'} in the sample data.
              {pick.relaxed.length > 0 && ` Nothing matched every choice, so your ${pick.relaxed.map((r) => RELAXED_TEXT[r]).join(' and ')} ${pick.relaxed.length === 1 ? 'choice was' : 'choices were'} ignored.`}
            </p>
            <div className="gem-actions">
              <button type="button" className="btn" onClick={() => onViewCity(pick.city.id)}>
                View city
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onAddCity(pick.city.id)} disabled={tripCityIds.includes(pick.city.id)}>
                {tripCityIds.includes(pick.city.id) ? '✓ In trip' : '+ Add to trip'}
              </button>
              <button type="button" className="btn" onClick={surprise} disabled={pick.count < 2}>
                ↻ Try another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
