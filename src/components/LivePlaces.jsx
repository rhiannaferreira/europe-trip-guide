// "Live places" in a city: real restaurants, cafés, bars and attractions from the live places service,
// near the city centre, a saved place, a landmark, or the traveller (with permission). Nothing is fetched
// until it's opened. Results are ordinary place cards; saving one keeps a snapshot in the trip.
import { useEffect, useRef, useState } from 'react'
import { placesInCity } from '../data/places.js'
import { registerPlaces } from '../lib/extraPlaces.js'
import { track } from '../lib/analytics.js'
import { CUISINES, PLACE_KINDS, geocodePlace, searchPlaces } from '../services/live/places.js'
import { closestPlace } from '../lib/search.js'
import DayPicker from './DayPicker.jsx'
import PlaceCard from './PlaceCard.jsx'
import { LiveLoading, LiveUnavailable, PlacesAttribution, SourceLabel } from './LiveBits.jsx'

const KINDS = ['restaurant', 'cafe', 'bar', 'museum', 'sights', 'park', 'shopping']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// The browser's location, once, only when asked. Rounded to ~100 m and never stored or sent to analytics.
export function askLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(Object.assign(new Error('unavailable'), { code: 'unavailable' }))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 1000) / 1000, lng: Math.round(p.coords.longitude * 1000) / 1000, accuracy: p.coords.accuracy }),
      (e) => reject(Object.assign(new Error('location'), { code: e.code === 1 ? 'denied' : 'unavailable' })),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
    )
  })
}

export default function LivePlaces({ city, trip, days, onFocusPlace }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('restaurant')
  const [cuisine, setCuisine] = useState('')
  const [veg, setVeg] = useState(false)
  const [anchor, setAnchor] = useState({ kind: 'city', label: `${city.name} centre`, lat: city.lat, lng: city.lng })
  const [landmark, setLandmark] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const [locMsg, setLocMsg] = useState('')
  const [attempt, setAttempt] = useState(0)
  const seq = useRef(0)

  // A new city resets the search.
  useEffect(() => {
    setAnchor({ kind: 'city', label: `${city.name} centre`, lat: city.lat, lng: city.lng })
    setState({ status: 'idle' })
  }, [city.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const n = ++seq.current
    setState((s) => ({ status: 'loading', places: s.places }))
    const t = setTimeout(() => {
      searchPlaces({ lat: anchor.lat, lng: anchor.lng, radius: anchor.kind === 'city' ? 2500 : 1200, kind, cuisine: kind === 'restaurant' ? cuisine : '', diet: veg && ['restaurant', 'cafe'].includes(kind) ? 'vegetarian' : '', cityId: city.id }).then(
        (r) => {
          if (n !== seq.current) return
          setState({ status: 'ready', places: r.places.filter((p) => p.cityId === city.id), at: r.retrievedAt })
          track('live_places_searched', { kind, anchor: anchor.kind, results: r.places.length })
        },
        (error) => n === seq.current && setState({ status: 'error', error }),
      )
    }, 300)
    return () => clearTimeout(t)
  }, [open, kind, cuisine, veg, anchor.lat, anchor.lng, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const savedHere = placesInCity(city.id).filter((p) => trip.savedIds.has(p.id))
  const curated = placesInCity(city.id).filter((p) => !p.source && (kind === 'restaurant' || kind === 'cafe' || kind === 'bar' ? p.category === 'food' || p.category === 'nightlife' : true)).slice(0, 4)

  const locate = async () => {
    setLocMsg('Finding you…')
    try {
      const p = await askLocation()
      setAnchor({ kind: 'you', label: 'your location', lat: p.lat, lng: p.lng })
      setLocMsg('')
    } catch (e) {
      setLocMsg(e.code === 'denied' ? 'Location is blocked for this site, so results are near the place you choose instead.' : 'Your location isn’t available right now.')
    }
  }
  const findLandmark = async (e) => {
    e.preventDefault()
    if (landmark.trim().length < 3) return
    // Guide places first (no live call needed), then the live geocoder.
    const known = closestPlace(placesInCity(city.id), landmark)
    if (known) return setAnchor({ kind: 'place', label: known.name, lat: known.lat, lng: known.lng })
    try {
      const pt = await geocodePlace(`${landmark.trim()}, ${city.name}`, city)
      setAnchor({ kind: 'place', label: pt.name, lat: pt.lat, lng: pt.lng })
    } catch (error) {
      setLocMsg(error.code === 'not_found' ? `Couldn’t find “${landmark.trim()}” in ${city.name}.` : 'Couldn’t look that place up right now.')
    }
  }
  const save = (p) => {
    registerPlaces([p])
    trip.togglePlace(p.id)
    track('live_place_saved', { kind })
  }

  if (!open)
    return (
      <section className="live-panel" aria-label={`Live places in ${city.name}`}>
        <h3>
          Real places right now <SourceLabel kind="live" />
        </h3>
        <p className="subhead">Restaurants, cafés, bars, museums and sights in {city.name}, looked up live.</p>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Find live places in {city.name}
        </button>
      </section>
    )

  return (
    <section className="live-panel" aria-label={`Live places in ${city.name}`}>
      <h3>
        Live places in {city.name} <SourceLabel kind="live" />
      </h3>
      <div className="live-controls" role="group" aria-label="What to look for">
        {KINDS.map((k) => (
          <button key={k} type="button" className={`chip live-chip${kind === k ? ' active' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {PLACE_KINDS[k].icon} {PLACE_KINDS[k].label}
          </button>
        ))}
      </div>
      <div className="live-controls">
        {kind === 'restaurant' && (
          <select aria-label="Cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            <option value="">Any cuisine</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {cap(c)}
              </option>
            ))}
          </select>
        )}
        {['restaurant', 'cafe'].includes(kind) && (
          <label className="live-hint">
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} /> Vegetarian options
          </label>
        )}
        <select
          aria-label="Search near"
          value={anchor.kind === 'saved' ? `saved:${anchor.id}` : anchor.kind}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'city') setAnchor({ kind: 'city', label: `${city.name} centre`, lat: city.lat, lng: city.lng })
            else if (v === 'you') locate()
            else if (v.startsWith('saved:')) {
              const p = savedHere.find((x) => x.id === v.slice(6))
              if (p) setAnchor({ kind: 'saved', id: p.id, label: p.name, lat: p.lat, lng: p.lng })
            }
          }}
        >
          <option value="city">Near {city.name} centre</option>
          {savedHere.length > 0 && (
            <optgroup label="Near a saved place">
              {savedHere.map((p) => (
                <option key={p.id} value={`saved:${p.id}`}>
                  Near {p.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value="you">Near me (uses your location once)</option>
          {(anchor.kind === 'place' || anchor.kind === 'you') && <option value={anchor.kind}>Near {anchor.label}</option>}
        </select>
      </div>
      <form className="live-controls" onSubmit={findLandmark}>
        <input type="search" placeholder={`Near a landmark, e.g. ${placesInCity(city.id)[0]?.name || 'the station'}`} value={landmark} onChange={(e) => setLandmark(e.target.value)} aria-label="Search near a landmark" maxLength={80} />
        <button type="submit" className="btn">
          Search near it
        </button>
      </form>
      {locMsg && <p className="live-hint">{locMsg}</p>}
      <p className="live-hint">
        Showing {PLACE_KINDS[kind].label.toLowerCase()} near <strong>{anchor.label}</strong>.
      </p>

      {state.status === 'loading' && <LiveLoading text={PLACE_KINDS[kind].loading} />}
      {state.status === 'error' && (
        <>
          <LiveUnavailable error={state.error} onRetry={() => setAttempt((n) => n + 1)} fallback={curated.length ? 'Here are EuroWander’s picks instead:' : ''} />
          <div className="live-results">
            {curated.map((p) => (
              <PlaceCard key={p.id} place={p} city={city} saved={trip.savedIds.has(p.id)} status={trip.statuses[p.id]} onStatusChange={(s) => trip.setStatus(p.id, s)} onToggleSave={() => trip.togglePlace(p.id)} onFocus={() => onFocusPlace(p.id)} />
            ))}
          </div>
        </>
      )}
      {state.status === 'ready' && state.places.length === 0 && <p className="empty">No {PLACE_KINDS[kind].label.toLowerCase()} found there. Try another kind of place or search near somewhere else.</p>}
      {state.places?.length > 0 && state.status !== 'error' && (
        <div className="live-results" aria-busy={state.status === 'loading'}>
          {state.places.map((p) => {
            const saved = trip.savedIds.has(p.id)
            return (
              <PlaceCard
                key={p.id}
                place={p}
                city={city}
                distanceKm={p.distanceKm}
                saved={saved}
                status={trip.statuses[p.id]}
                onStatusChange={(s) => trip.setStatus(p.id, s)}
                onToggleSave={() => (saved ? trip.togglePlace(p.id) : save(p))}
                onFocus={() => {
                  registerPlaces([p])
                  onFocusPlace(p.id)
                }}
                actions={
                  days.length > 0 && (
                    <div className="live-actions">
                      <DayPicker
                        days={days}
                        preferCityId={city.id}
                        label={`Add ${p.name} to a day`}
                        placeholder="+ Add to a day"
                        onPick={(n) => {
                          registerPlaces([p])
                          trip.assignToDay(p.id, n)
                          track('live_place_saved', { kind, to: 'day' })
                        }}
                        className="compact"
                      />
                    </div>
                  )
                }
              />
            )
          })}
        </div>
      )}
      <PlacesAttribution />
    </section>
  )
}
