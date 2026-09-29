import { interestById } from '../data/interests.js'
import { formatDistance } from '../utils/distance.js'
import { NEARBY_KM, nearbyPlaces } from '../utils/nearby.js'
import DayPicker from './DayPicker.jsx'

// "Nearby places" for the place being viewed: closest sample places, with save and add-to-day.
export default function NearbyPlaces({ place, savedIds, days, onToggleSave, onAddToDay, onFocusPlace }) {
  const nearby = nearbyPlaces(place)
  return (
    <section className="nearby" aria-label={`Nearby places around ${place.name}`}>
      <p className="subhead">Nearby places</p>
      {nearby.length === 0 ? (
        <p className="rule">No other sample places within {NEARBY_KM} km.</p>
      ) : (
        <ul>
          {nearby.map(({ place: p, km }) => {
            const saved = savedIds.has(p.id)
            return (
              <li key={p.id}>
                <span className="nearby-icon" aria-hidden="true">
                  {interestById[p.category].icon}
                </span>
                <button type="button" className="link-btn nearby-name" onClick={() => onFocusPlace(p.id)}>
                  {p.name}
                  <small>{formatDistance(km)} away</small>
                </button>
                <button
                  type="button"
                  className={`heart-btn small${saved ? ' saved' : ''}`}
                  aria-pressed={saved}
                  aria-label={saved ? `Remove ${p.name} from trip` : `Save ${p.name} to trip`}
                  onClick={() => onToggleSave(p.id)}
                >
                  {saved ? '♥' : '♡'}
                </button>
                <DayPicker days={days} preferCityId={p.cityId} label={`Add ${p.name} to a day`} placeholder="+ Day" onPick={(n) => onAddToDay(p.id, n)} className="compact" />
              </li>
            )
          })}
        </ul>
      )}
      <p className="rule">Straight-line distances from sample data; walking routes are longer.</p>
    </section>
  )
}
