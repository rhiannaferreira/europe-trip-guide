import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { track } from '../lib/analytics.js'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'
import { TRIP_CHANGED } from '../lib/tripStore.js'
import { setAssistantOpen, useAssistantBridge } from './bridge.js'

// The chat itself (and the city, place and planner data it uses) downloads the first time it's opened.
const AssistantPanel = lazy(() => import('./AssistantPanel.jsx'))

// A cheap check, without loading the planner: My trip has cities but no dates or no day plans yet, and
// the traveller hasn't opened the copilot since the trip was last like this. Returns a signature or ''.
function pendingHint() {
  const t = readJSON(KEYS.trip)
  if (!t?.stops?.length) return ''
  const planned = Object.values(t.itinerary || {}).some((d) => d?.placeIds?.length)
  if (t.startDate && planned) return ''
  const sig = `${t.stops.map((s) => s.cityId).join(',')}|${t.startDate || ''}|${planned ? 1 : 0}`
  return (readJSON(KEYS.copilot, {}) || {}).hintSeen === sig ? '' : sig
}

// A four-point spark, drawn so it takes the button's colours (an emoji wouldn't).
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
      <path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5z" fill="currentColor" />
      <path d="M19 15.5c.2 1.8 1.2 2.8 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3z" fill="currentColor" opacity="0.8" />
    </svg>
  )
}

// The EuroWander button on every page. Once opened, the panel stays mounted (hidden when closed), so the
// conversation survives closing it and moving between pages.
export default function AssistantButton({ route }) {
  const open = useAssistantBridge((s) => s.open)
  const [loaded, setLoaded] = useState(false)
  const [hint, setHint] = useState(pendingHint)
  const buttonRef = useRef(null)

  useEffect(() => {
    const check = () => setHint(pendingHint())
    window.addEventListener(TRIP_CHANGED, check)
    return () => window.removeEventListener(TRIP_CHANGED, check)
  }, [])
  useEffect(() => {
    if (!open) return
    setLoaded(true)
    track('chat_opened', { page: route.name, hint: Boolean(hint) })
    if (hint) {
      writeJSON(KEYS.copilot, { ...(readJSON(KEYS.copilot, {}) || {}), hintSeen: hint })
      setHint('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setAssistantOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <>
      {loaded && (
        <Suspense fallback={null}>
          <AssistantPanel route={route} open={open} onClose={close} />
        </Suspense>
      )}
      {/* Travel Mode has its own Ask button in its bottom bar. */}
      {route.name !== 'travel' && (
      <button
        ref={buttonRef}
        type="button"
        className={`ask-fab${open ? ' open' : ''}`}
        aria-expanded={open}
        aria-controls="ask-panel"
        aria-label={open ? 'Close EuroWander travel assistant' : `Ask EuroWander, the travel assistant${hint ? ' (has a suggestion for your trip)' : ''}`}
        onClick={() => setAssistantOpen(!open)}
      >
        <span className="ask-fab-icon" aria-hidden="true">
          {open ? '✕' : <SparkIcon />}
        </span>
        <span className="ask-fab-label" aria-hidden="true">
          {open ? (
            'Close'
          ) : (
            <>
              Ask<span className="ask-fab-long"> EuroWander</span>
            </>
          )}
        </span>
        {hint && !open && <span className="ask-fab-dot" aria-hidden="true" />}
      </button>
      )}
    </>
  )
}
