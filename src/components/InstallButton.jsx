import { useInstallPrompt } from '../lib/pwa.js'

// Shown only when the browser offers to install the app.
export default function InstallButton({ className = 'btn nav-btn' }) {
  const { canInstall, install } = useInstallPrompt()
  if (!canInstall) return null
  return (
    <button type="button" className={className} onClick={install}>
      <span aria-hidden="true">📲</span> <span className="nav-label">Install app</span>
    </button>
  )
}
