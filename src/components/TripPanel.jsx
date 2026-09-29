// The right-hand panel: tabs for the trip overview and the day-by-day plan.
export const TRIP_TABS = [
  { id: 'trip', label: 'Trip', icon: '🧳' },
  { id: 'days', label: 'Days', icon: '📅' },
  { id: 'timeline', label: 'Timeline', icon: '🕒' },
  { id: 'budget', label: 'Budget', icon: '💶' },
]

// Tabs follow the ARIA tabs pattern: Tab reaches the selected tab, arrow keys (and Home/End) move between tabs.
export default function TripPanel({ tab, onTabChange, tabs = TRIP_TABS, children }) {
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === tab)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const t = tabs[(next + tabs.length) % tabs.length]
    onTabChange(t.id)
    document.getElementById(`tab-${t.id}`)?.focus()
  }
  return (
    <>
      <div className="trip-tabs" role="tablist" aria-label="Trip planning" onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            aria-controls={`panel-${t.id}`}
            className={`trip-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <div className="trip-tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {children}
      </div>
    </>
  )
}
