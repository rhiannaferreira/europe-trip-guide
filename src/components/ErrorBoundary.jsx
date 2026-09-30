import { Component } from 'react'

// Catches a crash anywhere below it and shows a way out instead of a blank page.
// The trip lives in localStorage, so reloading never loses it.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Eurowander crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="state-page" role="alert">
        <span className="state-icon" aria-hidden="true">🧭</span>
        <h1>Something went wrong</h1>
        <p>This page hit a problem it couldn't recover from. Your trip is saved in this browser and is safe.</p>
        <div className="state-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload the page
          </button>
          <a className="btn" href={import.meta.env.VITE_PREVIEW ? '#/' : '/'}>
            Go to the start
          </a>
        </div>
        <details className="state-details">
          <summary>Details</summary>
          <code>{String(this.state.error?.message || this.state.error)}</code>
        </details>
      </main>
    )
  }
}
