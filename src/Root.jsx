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

// The planner (map, lists, trip) is its own download, so other pages open without Leaflet.
const App = lazy(() => import('./App.jsx'))

// A failed download of a lazy page shows a retry screen instead of the generic crash page.
class ChunkBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <PageLoadError /> : this.props.children
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
        ) : known ? (
          <ChunkBoundary>
            <Suspense fallback={<PageLoading />}>
              <App route={route} />
            </Suspense>
          </ChunkBoundary>
        ) : (
          <Missing route={route} />
        )}
      </AccountProvider>
    </ErrorBoundary>
  )
}
