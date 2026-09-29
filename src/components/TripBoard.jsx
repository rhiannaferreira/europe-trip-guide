import { cityById } from '../data/cities.js'
import { distanceKm } from '../geo.js'

export default function TripBoard({ savedPlaces, cityOrder, onRemove, onMoveCity, onClear, onFocus }) {
  if (cityOrder.length === 0) {
    return (
      <div className="trip-board">
        <h2 className="section-title">Your trip</h2>
        <p className="empty">Save places to start a trip. Cities are added to the route in the order you save them.</p>
      </div>
    )
  }

  const legs = cityOrder.slice(1).map((id, i) => distanceKm(cityById[cityOrder[i]], cityById[id]))
  const total = legs.reduce((a, b) => a + b, 0)
  const countryCount = new Set(cityOrder.map((id) => cityById[id].country)).size

  return (
    <div className="trip-board">
      <div className="trip-header">
        <h2 className="section-title">Your trip</h2>
        <button type="button" className="link-btn" onClick={onClear}>
          Clear
        </button>
      </div>
      <p className="trip-summary">
        {cityOrder.length} {cityOrder.length === 1 ? 'city' : 'cities'} · {countryCount}{' '}
        {countryCount === 1 ? 'country' : 'countries'} · {savedPlaces.length} places
        {legs.length > 0 && <> · about {Math.round(total).toLocaleString()} km in a straight line</>}
      </p>

      <ol className="trip-cities">
        {cityOrder.map((cityId, i) => {
          const city = cityById[cityId]
          return (
            <li key={cityId} className="trip-city">
              <div className="trip-city-header">
                <span className="stop-number">{i + 1}</span>
                <h3>{city.name}</h3>
                <div className="move-btns">
                  <button type="button" onClick={() => onMoveCity(cityId, -1)} disabled={i === 0} aria-label={`Move ${city.name} earlier`}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveCity(cityId, 1)}
                    disabled={i === cityOrder.length - 1}
                    aria-label={`Move ${city.name} later`}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <ul>
                {savedPlaces
                  .filter((p) => p.cityId === cityId)
                  .map((p) => (
                    <li key={p.id}>
                      <button type="button" className="link-btn" onClick={() => onFocus(p.id)}>
                        {p.name}
                      </button>
                      <button type="button" className="remove-btn" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>
                        ×
                      </button>
                    </li>
                  ))}
              </ul>
              {i < legs.length && <p className="leg">↓ ~{Math.round(legs[i])} km to {cityById[cityOrder[i + 1]].name}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
