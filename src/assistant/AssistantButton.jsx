import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { setAssistantOpen, useAssistantBridge } from './bridge.js'

// The chat itself (and the city, place and planner data it uses) downloads the first time it's opened.
const AssistantPanel = lazy(() => import('./AssistantPanel.jsx'))

// The 💬 button on every page. Once opened, the panel stays mounted (hidden when closed), so the
// conversation survives closing it and moving between pages.
export default function AssistantButton({ route }) {
  const open = useAssistantBridge((s) => s.open)
  const [loaded, setLoaded] = useState(false)
  const buttonRef = useRef(null)
  useEffect(() => {
    if (open) setLoaded(true)
  }, [open])

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
      <button
        ref={buttonRef}
        type="button"
        className={`ask-fab${open ? ' open' : ''}`}
        aria-expanded={open}
        aria-controls="ask-panel"
        onClick={() => setAssistantOpen(!open)}
      >
        <span aria-hidden="true">{open ? '✕' : '💬'}</span>
        <span className="ask-fab-label">{open ? 'Close' : 'Ask Eurowander'}</span>
      </button>
    </>
  )
}
