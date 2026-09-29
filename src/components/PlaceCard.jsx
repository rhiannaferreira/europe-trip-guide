import { interests } from '../data/interests.js'

const interestById = Object.fromEntries(interests.map((i) => [i.id, i]))

export default function PlaceCard({ place, city, saved, focused, onToggleSave, onFocus }) {
  const interest = interestById[place.category]
  return (
    <article className={`place-card${focused ? ' focused' : ''}`} onClick={onFocus}>
      <div className="place-card-body">
        <span className={`tag tag-${place.category}`}>
          {interest.icon} {interest.label}
        </span>
        <h3>{place.name}</h3>
        <p className="place-city">{city.name}</p>
        <p>{place.description}</p>
      </div>
      <button
        type="button"
        className={`save-btn${saved ? ' saved' : ''}`}
        aria-pressed={saved}
        onClick={(e) => {
          e.stopPropagation()
          onToggleSave()
        }}
      >
        {saved ? '★ Saved' : '☆ Save'}
      </button>
    </article>
  )
}
