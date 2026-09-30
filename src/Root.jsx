import { Component, Suspense, lazy, useEffect } from 'react'
import { cityById } from './data/cities.js'
import { countryByCode } from './data/countries.js'
import { useRoute } from './lib/router.jsx'
import { setPageMeta } from './lib/meta.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { NotFound, PageLoadError, PageLoading } from './components/PageStates.jsx'
import Landing from './pages/Landing.jsx'
import OfflineNotice from './components/OfflineNotice.jsx'
import { AccountProvider } from './lib/account.jsx'
import AssistantButton from './assistant/AssistantButton.jsx'

// The planner (map, lists, trip) is its own download, so other pages open without Leaflet.
const App = lazy(() => import('./App.jsx'))
// Build My Europe Trip is its own download too.
const BuilderPage = lazy(() => import('./builder/BuilderPage.jsx'))

// What browsers (and Vite's preloader) say when a page's code or styles couldn't be downloaded.
const isLoadError = (error) =>
  /dynamically imported module|Importing a module script failed|Unable to preload CSS|Failed to fetch|Load failed|ChunkLoadError/i.test(
    `${error?.name || ''} ${error?.message || error}`,
  )

const RELOADED_AT = 'eurowander-chunk-reload'

// A failed download of a lazy page reloads once (after a deploy the old files are gone, and the reload
// picks up the new ones), then shows a retry screen. Any other error is a real crash: it goes on to
// the ErrorBoundary above, so it isn't mistaken for a connection problem.
class ChunkBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    if (!isLoadError(error)) return
    console.error('Eurowander could not load the planner:', error)
    if (navigator.onLine === false) return
    try {
      const last = Number(sessionStorage.getItem(RELOADED_AT)) || 0
      if (Date.now() - last < 30000) return
      sessionStorage.setItem(RELOADED_AT, String(Date.now()))
    } catch {
      return
    }
    window.location.reload()
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (!isLoadError(error)) throw error
    return <PageLoadError error={error} />
  }
}

function Missing({ route }) {
  useEffect(() => setPageMeta({ title: 'Not found', path: route.path || '/' }), [route.path])
  if (route.name === 'city') return <NotFound what="city" suggestion={`There's no city called “${route.id}” in the guide yet. Browse the cities we cover instead.`} />
  if (route.name === 'country') return <NotFound what="country" suggestion="That country isn't in the guide yet. Browse the countries we cover instead." />
  return <NotFound />
}

export default function Root() {
  const route = useRoute()
  const known =
    (route.name !== 'city' || cityById[route.id]) && (route.name !== 'country' || countryByCode[route.code]) && route.name !== 'notfound'

  return (
    <ErrorBoundary>
      <AccountProvider>
        <OfflineNotice />
        {route.name === 'home' ? (
          <Landing />
        ) : route.name === 'build' ? (
          <ChunkBoundary>
            <Suspense fallback={<PageLoading />}>
              <BuilderPage />
            </Suspense>
          </ChunkBoundary>
        ) : known ? (
          <ChunkBoundary>
            <Suspense fallback={<PageLoading />}>
              <App route={route} />
            </Suspense>
          </ChunkBoundary>
        ) : (
          <Missing route={route} />
        )}
        <AssistantButton route={route} />
      </AccountProvider>
    </ErrorBoundary>
  )
}
