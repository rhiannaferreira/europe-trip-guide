// Install-to-home-screen support. Chrome and Edge fire `beforeinstallprompt` once, possibly before
// any component has mounted, so it's caught here at startup and kept for the Install button.
import { useSyncExternalStore } from 'react'

let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

export function setupPwa() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
  // The service worker only runs on the real site (not the dev server or the single-file preview).
  if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_PREVIEW) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => Boolean(deferred),
  )
  const install = async () => {
    if (!deferred) return
    const e = deferred
    deferred = null
    notify()
    await e.prompt()
  }
  return { canInstall, install }
}

// Online/offline, for the offline notice.
export function useOnline() {
  return useSyncExternalStore(
    (fn) => {
      window.addEventListener('online', fn)
      window.addEventListener('offline', fn)
      return () => {
        window.removeEventListener('online', fn)
        window.removeEventListener('offline', fn)
      }
    },
    () => navigator.onLine,
  )
}
