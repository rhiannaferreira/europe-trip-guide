import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { costLabel } from '../lib/format.js'
import Thumb from './Thumb.jsx'

export default function PlaceCard({ place, city, saved, focused, onToggleSave, onFocus, children }) {
  const interest = interestById[place.category]
  return (
    <article className={`place-card${focused ? ' focused' : ''}${saved ? ' saved' : ''}`}>
      <Thumb id={place.id} image={place.image} emoji={interest.icon} alt={place.name} color={`var(--${place.category})`} className="place-thumb" />
      <div className="place-card-body">
        <div className="place-card-top">
          <span className={`tag tag-${place.category}`}>
            {interest.icon} {interest.label}
          </span>
          <button
            type="button"
            className={`heart-btn${saved ? ' saved' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${place.name} from trip` : `Save ${place.name} to trip`}
            title={saved ? 'Saved to your trip' : 'Save to trip'}
            onClick={onToggleSave}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <h3>{place.name}</h3>
        <p className="place-city">
          {countryByCode[city.country].flag} {city.name}
        </p>
        <p className="place-desc">{place.description}</p>
        <div className="place-meta">
          <span title="Sample rating">★ {place.rating.toFixed(1)}</span>
          <span title="Cost level">{costLabel(place.costLevel)}</span>
          <button type="button" className="link-btn map-link" onClick={onFocus}>
            📍 Show on map
          </button>
        </div>
        {focused && children}
      </div>
    </article>
  )
}
