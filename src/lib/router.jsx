import { useEffect, useState } from 'react'

// A tiny router: real paths (/city/paris) on the site, and hash paths (#/city/paris) in the
// single-file preview build, which can't serve other paths.
//
// Routes:
//   /                      landing page
//   /explore               the planner
//   /country/:code         the planner, showing one country (code in lower case: /country/it)
//   /city/:id              the planner, showing one city
//   /trip                  the planner, scrolled to My Trip
//   /build                 Build My Europe Trip: generate a whole trip from preferences
//   /trip#share=...        a shared trip link (the trip is packed into the part after #, so it never reaches a server)
export const HASH_MODE = Boolean(import.meta.env.VITE_PREVIEW)

function currentPath() {
  if (HASH_MODE) {
    const raw = window.location.hash.replace(/^#/, '') || '/'
    return raw.startsWith('/') ? raw : '/'
  }
  return window.location.pathname + window.location.hash
}

export function parseRoute(fullPath) {
  // Split "/trip#share=abc" (or "/trip?share=abc" in hash mode) into the path and the share code.
  const [pathPart, ...rest] = fullPath.split(/[#?]/)
  const extra = rest.join('&')
  const share = /(?:^|&)share=([^&]+)/.exec(extra)?.[1] || null
  const path = pathPart.replace(/\/+$/, '') || '/'
  const parts = path.split('/').filter(Boolean).map((p) => decodeURIComponent(p))

  if (parts.length === 0) return { name: 'home' }
  if (parts[0] === 'explore' && parts.length === 1) return { name: 'explore' }
  if (parts[0] === 'build' && parts.length === 1) return { name: 'build' }
  if (parts[0] === 'city' && parts.length === 2) return { name: 'city', id: parts[1].toLowerCase() }
  if (parts[0] === 'country' && parts.length === 2) return { name: 'country', code: parts[1].toUpperCase() }
  if (parts[0] === 'trip' && parts.length === 1) return { name: 'trip', share }
  return { name: 'notfound', path }
}

// The href for a path, in whichever mode the app runs.
export const href = (path) => (HASH_MODE ? `#${path}` : path)

export const cityPath = (id) => `/city/${id}`
export const countryPath = (code) => `/country/${code.toLowerCase()}`

const listeners = new Set()

export function navigate(path, { replace = false } = {}) {
  if (HASH_MODE) {
    const url = `#${path}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  } else if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  listeners.forEach((fn) => fn())
}

export function useRoute() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const update = () => setPath(currentPath())
    listeners.add(update)
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])
  return parseRoute(path)
}

// An <a> that changes the route without reloading the page (ctrl/cmd-click still opens a new tab).
export function Link({ to, onClick, children, ...props }) {
  return (
    <a
      {...props}
      href={href(to)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
        window.scrollTo(0, 0)
      }}
    >
      {children}
    </a>
  )
}
