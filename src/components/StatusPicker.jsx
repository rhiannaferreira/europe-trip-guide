import { STATUS_LIST, statusInfo } from '../lib/statuses.js'

// Change a saved place's status: ❤️ Saved, 📍 Want to visit or ✓ Visited.
// `compact` draws a small select (for lists); otherwise three buttons.
export default function StatusPicker({ place, status, onChange, compact = false }) {
  if (compact) {
    return (
      <select className={`status-select status-${status}`} value={status} onChange={(e) => onChange(e.target.value)} aria-label={`Status of ${place.name}`} title={statusInfo(status).label}>
        {STATUS_LIST.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <div className="status-picker" role="group" aria-label={`Status of ${place.name}`}>
      {STATUS_LIST.map((s) => (
        <button key={s.id} type="button" className={`status-btn status-${s.id}${status === s.id ? ' active' : ''}`} aria-pressed={status === s.id} onClick={() => onChange(s.id)}>
          <span aria-hidden="true">{s.icon}</span> {s.label}
        </button>
      ))}
    </div>
  )
}
