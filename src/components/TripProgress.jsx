// Trip setup checklist: what's done and what's left, with the actual numbers. No overall score.
export default function TripProgress({ items, onGo }) {
  return (
    <section className="trip-progress" aria-labelledby="progress-title">
      <h2 className="section-title" id="progress-title">
        Planning progress
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.done ? 'done' : ''}>
            <span className="progress-mark" aria-hidden="true">
              {item.done ? '✓' : '○'}
            </span>
            <span className="progress-text">
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
            {item.value && (
              <span className="progress-meter" aria-hidden="true">
                <span style={{ width: `${(item.value[0] / item.value[1]) * 100}%` }} />
              </span>
            )}
            {!item.done && onGo[item.id] && (
              <button type="button" className="link-btn small" onClick={onGo[item.id]}>
                Go
                <span className="visually-hidden"> to {item.label}</span>
              </button>
            )}
            <span className="visually-hidden">{item.done ? 'done' : 'to do'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
