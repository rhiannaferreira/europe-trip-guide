import { interests } from '../data/interests.js'

// Interest chips. No chip selected means every interest is shown; pick one or more to narrow down.
export default function Filters({ activeInterests, onToggleInterest, onClearInterests }) {
  return (
    <div className="interest-chips" role="group" aria-label="Filter by interest">
      <button type="button" className={`chip chip-all${activeInterests.size === 0 ? ' active' : ''}`} aria-pressed={activeInterests.size === 0} onClick={onClearInterests}>
        All
      </button>
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
  )
}
