import { useOnline } from '../lib/pwa.js'

// A thin bar while the connection is down, so missing photos or weather make sense.
export default function OfflineNotice() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="offline-bar" role="status">
      You're offline. Your trip and the built-in guide still work; photos, weather, map tiles and extra places come back when you reconnect.
    </div>
  )
}
