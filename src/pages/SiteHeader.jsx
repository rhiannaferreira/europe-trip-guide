// The site header for the home page and other editorial pages (How it works): brand, signage-style
// links and the install button. Its styles live in landing.css, so it must sit inside a .landing page.
import { Link } from '../lib/router.jsx'
import InstallButton from '../components/InstallButton.jsx'

const preloadBuilder = () => import('../builder/BuilderPage.jsx')

// saved: the saved trip's summary ({ stops }) or null, for the count next to My trip.
// current: the path of the page being shown, so its link is marked.
export default function SiteHeader({ saved = null, current = '/' }) {
  const here = (path) => (current === path ? 'page' : undefined)
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <div className="home-brand">
          <Link to="/" className="landing-brand" aria-label="Eurowander home">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /> Eurowander
          </Link>
          <span className="home-brand-meta" aria-hidden="true">
            Europe · Train-first
          </span>
        </div>
        <nav aria-label="Main" className="home-nav">
          <Link to="/explore">Explore</Link>
          <Link to="/build" className="home-nav-build" onMouseEnter={preloadBuilder} onFocus={preloadBuilder}>
            Build a trip
          </Link>
          <Link to="/trip-ideas">Trip ideas</Link>
          <Link to="/how-it-works" className="home-nav-how" aria-current={here('/how-it-works')}>
            How it works
          </Link>
          <Link to="/trip" aria-label={saved ? `My trip, ${saved.stops.length} ${saved.stops.length === 1 ? 'stop' : 'stops'}` : undefined}>
            My trip
            {saved && (
              <span className="home-nav-count" aria-hidden="true">
                · {saved.stops.length}
              </span>
            )}
          </Link>
          <InstallButton className="link-btn install-link" />
        </nav>
      </div>
    </header>
  )
}
