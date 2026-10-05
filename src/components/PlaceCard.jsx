import { countryByCode } from '../data/countries.js'
import { interestById } from '../data/interests.js'
import { costLabel } from '../lib/format.js'
import Thumb from './Thumb.jsx'
import StatusPicker from './StatusPicker.jsx'
import { statusInfo } from '../lib/statuses.js'
import { placeSource } from '../services/live/models.js'
import { Freshness, LivePlaceFacts, LivePlaceLinks, SourceLabel } from './LiveBits.jsx'

// One card for every place: EuroWander's curated picks, OpenStreetMap additions and live search results.
// A card shows only what the place actually has (live places have no ratings or price levels).
export default function PlaceCard({ place, city, saved, status, focused, onToggleSave, onStatusChange, onFocus, distanceKm = null, actions = null, children }) {
  const interest = interestById[place.category]
  const source = placeSource(place)
  const live = source === 'live'
  return (
    <article className={`place-card${focused ? ' focused' : ''}${saved ? ' saved' : ''}`}>
      <Thumb id={place.id} image={place.image} emoji={interest.icon} alt={place.name} color={`var(--${place.category})`} className="place-thumb" kind="place" item={place} width={250} />
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
            title={saved ? `In your trip (${statusInfo(status).label})` : 'Save to trip'}
            onClick={onToggleSave}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <h3>{place.name}</h3>
        <p className="place-city">
          <SourceLabel kind={source} /> {countryByCode[city.country].flag} {city.name}
        </p>
        <p className="place-desc">{place.description}</p>
        {live && (
          <>
            <LivePlaceFacts place={place} distanceKm={distanceKm} />
            <LivePlaceLinks place={place} />
            <p className="live-attrib small">
              Data: Geoapify · © OpenStreetMap contributors · <Freshness at={place.retrievedAt} verb="Retrieved" className="" />
            </p>
          </>
        )}
        {place.source === 'osm' && (
          <p className="place-source">
            <span className="source-tag">From OpenStreetMap</span>
            {place.osmUrl && (
              <a href={place.osmUrl} target="_blank" rel="noopener noreferrer">
                Details<span className="visually-hidden"> for {place.name} on OpenStreetMap</span>
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer">
                Website<span className="visually-hidden"> of {place.name}</span>
              </a>
            )}
          </p>
        )}
        <div className="place-meta">
          {place.rating != null && <span title="Sample rating">★ {place.rating.toFixed(1)}</span>}
          {place.costLevel != null && <span title="Cost level">{costLabel(place.costLevel)}</span>}
          <button type="button" className="link-btn map-link" onClick={onFocus}>
            📍 Show on map
          </button>
        </div>
        {actions}
        {saved && <StatusPicker place={place} status={status} onChange={onStatusChange} />}
        {focused && children}
      </div>
    </article>
  )
}
