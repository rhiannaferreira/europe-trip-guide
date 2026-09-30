import { Link } from '../lib/router.jsx'

// Shown while a page's code is still downloading.
export function PageLoading({ label = 'Loading the planner…' }) {
  return (
    <main className="state-page" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </main>
  )
}

// Shown when the code for a page can't be downloaded (usually offline, or a new version was just deployed).
export function PageLoadError({ error }) {
  return (
    <main className="state-page" role="alert">
      <span className="state-icon" aria-hidden="true">📡</span>
      <h1>Couldn't load this page</h1>
      <p>Check your connection and try again. If Eurowander was just updated, a reload picks up the new version.</p>
      <div className="state-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
      {error && (
        <details className="state-details">
          <summary>Details</summary>
          <code>{String(error.message || error)}</code>
        </details>
      )}
    </main>
  )
}

export function NotFound({ what = 'page', suggestion }) {
  return (
    <main className="state-page">
      <span className="state-icon" aria-hidden="true">🗺️</span>
      <h1>We couldn't find that {what}</h1>
      <p>{suggestion || 'The link may be mistyped, or the page may have moved.'}</p>
      <div className="state-actions">
        <Link className="btn btn-primary" to="/explore">
          Explore Europe
        </Link>
        <Link className="btn" to="/">
          Home
        </Link>
      </div>
    </main>
  )
}
