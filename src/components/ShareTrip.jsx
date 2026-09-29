import { useEffect, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { decodeTrip, shareUrl } from '../lib/share.js'
import { navigate } from '../lib/router.jsx'
import { extraPlacesInTrip, registerPlaces } from '../lib/extraPlaces.js'
import Modal from './Modal.jsx'

// "Share trip": makes a link that opens this trip for someone else. The link holds the whole trip,
// so it works without an account, and later changes need a new link.
export default function ShareTrip({ trip }) {
  const [state, setState] = useState({ status: 'idle' })
  const inputRef = useRef(null)

  const make = async () => {
    setState({ status: 'working' })
    try {
      const url = await shareUrl(trip.raw, extraPlacesInTrip(trip.raw))
      let copied = false
      try {
        await navigator.clipboard.writeText(url)
        copied = true
      } catch {
        // Clipboard blocked: the link is shown below to copy by hand.
      }
      setState({ status: 'ready', url, copied })
    } catch {
      setState({ status: 'error' })
    }
  }

  useEffect(() => {
    if (state.status === 'ready' && !state.copied) inputRef.current?.select()
  }, [state])

  const nativeShare = async () => {
    try {
      await navigator.share({ title: trip.displayName, text: `My Eurowander trip: ${trip.displayName}`, url: state.url })
    } catch {
      // Cancelled.
    }
  }

  return (
    <section className="share-trip" aria-labelledby="share-trip-title">
      <h2 className="section-title" id="share-trip-title">
        Share this trip
      </h2>
      <p className="rule">Anyone with the link can open a copy of your stops, dates, places, days and notes. Change the trip later and you'll need a new link.</p>
      <div className="share-row">
        <button type="button" className="btn btn-primary" onClick={make} disabled={state.status === 'working'}>
          🔗 {state.status === 'working' ? 'Making link…' : state.status === 'ready' ? 'Make a new link' : 'Copy share link'}
        </button>
        {state.status === 'ready' && typeof navigator.share === 'function' && (
          <button type="button" className="btn" onClick={nativeShare}>
            📤 Share…
          </button>
        )}
      </div>
      {state.status === 'ready' && (
        <>
          <p className="share-status" role="status">
            {state.copied ? '✓ Link copied. Paste it anywhere to share.' : 'Copy the link below to share it.'}
          </p>
          <label className="visually-hidden" htmlFor="share-url">
            Share link
          </label>
          <input id="share-url" ref={inputRef} className="share-url" type="text" readOnly value={state.url} onFocus={(e) => e.target.select()} />
        </>
      )}
      {state.status === 'error' && (
        <p className="error-text" role="alert">
          The link couldn't be made in this browser. Try again, or use the printable summary instead.
        </p>
      )}
    </section>
  )
}

const summary = (t) => {
  const cities = t.stops.map((s) => cityById[s.cityId]).filter(Boolean)
  const countries = new Set(cities.map((c) => c.country))
  const places = t.stops.reduce((n, s) => n + s.placeIds.length, 0)
  return { cities, countries: [...countries].map((c) => countryByCode[c]), places }
}

// Opening a shared link: show what's in it, and replace the current trip only if the person agrees.
export function SharedTripDialog({ code, trip }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let live = true
    decodeTrip(code)
      .then((data) => live && setState({ status: 'ready', data }))
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
    }
  }, [code])

  const close = () => navigate('/trip', { replace: true })
  const accept = () => {
    registerPlaces(state.data.extraPlaces)
    trip.replace(state.data.trip)
    close()
  }

  const hasTrip = trip.stops.length > 0
  const info = state.status === 'ready' ? summary(state.data.trip) : null

  return (
    <Modal title="Shared trip" onClose={close}>
      {state.status === 'loading' && (
        <p role="status" className="loading-line">
          <span className="spinner small" aria-hidden="true" /> Opening the trip…
        </p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          <p>This trip link couldn't be opened. It may have been cut off when it was copied. Ask for the link again.</p>
          <button type="button" className="btn" onClick={close}>
            Close
          </button>
        </div>
      )}
      {info && (
        <div className="shared-trip">
          <h3>{state.data.trip.name || 'A Europe trip'}</h3>
          {info.cities.length === 0 ? (
            <p>This trip doesn't have any stops yet.</p>
          ) : (
            <p>
              {info.cities.length} {info.cities.length === 1 ? 'city' : 'cities'} in {info.countries.map((c) => `${c.flag} ${c.name}`).join(', ')}
              {info.places > 0 && `, with ${info.places} saved place${info.places === 1 ? '' : 's'}`}
              {state.data.trip.startDate && state.data.trip.endDate && `, ${state.data.trip.startDate} to ${state.data.trip.endDate}`}.
            </p>
          )}
          <p className="shared-route">{info.cities.map((c) => c.name).join(' → ')}</p>
          {hasTrip && (
            <p className="rule">
              Opening it replaces your current trip ({trip.displayName}, {trip.stops.length} {trip.stops.length === 1 ? 'city' : 'cities'}). Your current trip is kept as a backup in this browser.
            </p>
          )}
          <div className="state-actions">
            <button type="button" className="btn btn-primary" onClick={accept} disabled={info.cities.length === 0}>
              {hasTrip ? 'Replace my trip with this one' : 'Open this trip'}
            </button>
            <button type="button" className="btn" onClick={close}>
              {hasTrip ? 'Keep my trip' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
