// The right-hand panel: tabs for the trip overview and the day-by-day plan.
export const TRIP_TABS = [
  { id: 'trip', label: 'Trip', icon: '🧳' },
  { id: 'days', label: 'Days', icon: '📅' },
  { id: 'timeline', label: 'Timeline', icon: '🕒' },
  { id: 'budget', label: 'Budget', icon: '💶' },
]

export default function TripPanel({ tab, onTabChange, tabs = TRIP_TABS, children }) {
  return (
    <>
      <div className="trip-tabs" role="tablist" aria-label="Trip planning">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`trip-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <div className="trip-tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {children}
      </div>
    </>
  )
}
