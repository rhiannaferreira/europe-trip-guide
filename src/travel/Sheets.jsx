// Travel Mode's dialogs: one stop (details, time, move, ask), skipping a stop, and Nearby.
import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { placeById } from '../data/places.js'
import { track } from '../lib/analytics.js'
import { usePlacesVersion } from '../lib/extraPlaces.js'
import { costLabel } from '../lib/format.js'
import { savedBudgetPrefs } from '../assistant/tripHandle.js'
import { addToDay, markDone, markSkipped, moveToDay, setStartTime, shiftInDay } from './travelActions.js'
import { FINDERS, hm, placesNear, referencePoint } from './travelModel.js'
import { Directions } from './ui.jsx'

const fmtDay = (d) => d.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const distance = (km) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`)

// Days a place can move to: other days in the same city (a place belongs to its city).
function MoveTo({ env, place, from, onMoved }) {
  const options = env.days.filter((d) => d.number !== from && d.cityId === place.cityId)
  if (!options.length) return <p className="tm-muted">There’s no other day in {cityById[place.cityId].name} to move it to.</p>
  return (
    <label className="tm-field">
      <span>Move to another day</span>
      <select
        value=""
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!n) return
          env.change((t) => moveToDay(t, from, place.id, n))
          onMoved(n)
        }}
      >
        <option value="">Choose a day…</option>
        {options.map((d) => (
          <option key={d.number} value={d.number}>
            Day {d.number}, {fmtDay(d)}
            {env.status.today?.number === d.number ? ' (today)' : env.status.today && d.number === env.status.today.number + 1 ? ' (tomorrow)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ActivitySheet({ env, id, focus, onClose, onSkip }) {
  const { schedule, day, change, canMark, readOnly, ask, showOnMap } = env
  const entry = schedule.entries.find((e) => e.id === id)
  const [moved, setMoved] = useState(null)
  useEffect(() => {
    if (focus === 'change') setTimeout(() => document.getElementById('tm-change')?.scrollIntoView({ block: 'start' }), 50)
  }, [focus])
  if (moved) {
    return (
      <Modal title="Moved" onClose={onClose}>
        <p>
          {placeById[id]?.name} is now on day {moved}. Planning mode shows it there too.
        </p>
        <button type="button" className="btn btn-primary tm-btn" onClick={onClose}>
          Done
        </button>
      </Modal>
    )
  }
  if (!entry) return null
  const p = entry.place
  const i = schedule.entries.filter((e) => e.kind === 'place').findIndex((e) => e.id === id)
  const count = schedule.entries.filter((e) => e.kind === 'place').length
  return (
    <Modal title={p.name} onClose={onClose}>
      <div className="tm-sheet">
        <p className="tm-muted">
          {interestById[p.category]?.label || 'Place'} · {p.type} · {cityById[p.cityId]?.name}
          {p.costLevel != null && ` · ${costLabel(p.costLevel)}`}
          {p.source === 'osm' && ' · from OpenStreetMap'}
        </p>
        {p.description && <p>{p.description}</p>}
        <p>
          <strong>{entry.start != null ? hm(entry.start) : 'No time yet'}</strong>
          {entry.timeSource === 'suggested' && <span className="tm-tag">suggested</span>}
          {entry.state === 'done' && <span className="tm-tag tm-tag-good">✓ Done</span>}
          {entry.state === 'skipped' && <span className="tm-tag">Skipped</span>}
        </p>
        <p className="tm-source">Opening hours aren’t in Eurowander’s data, so check before you go.</p>
        <div className="tm-actions">
          <Directions place={p} className="btn btn-primary tm-btn" />
          <button
            type="button"
            className="btn tm-btn"
            onClick={() => {
              onClose()
              showOnMap(p.id)
            }}
          >
            🗺️ On the map
          </button>
          <button
            type="button"
            className="btn tm-btn"
            onClick={() => {
              onClose()
              ask(`Tell me about ${p.name}. Any tips for visiting${env.isToday ? ' today' : ''}?`, 'activity')
            }}
          >
            ✨ Ask about it
          </button>
        </div>

        {!readOnly && (
          <section id="tm-change" className="tm-change" aria-label="Change this stop">
            <h3 className="tm-h3">Change</h3>
            {canMark && (
              <div className="tm-actions">
                {entry.state !== 'done' ? (
                  <button
                    type="button"
                    className="btn tm-btn"
                    onClick={() => {
                      change((t) => markDone(t, day.number, id, true))
                      track('activity_completed', { today: env.isToday })
                      onClose()
                    }}
                  >
                    ✓ Mark done
                  </button>
                ) : (
                  <button type="button" className="btn tm-btn" onClick={() => change((t) => markDone(t, day.number, id, false))}>
                    Undo done
                  </button>
                )}
                {entry.state === 'skipped' ? (
                  <button type="button" className="btn tm-btn" onClick={() => change((t) => markSkipped(t, day.number, id, false))}>
                    Undo skip
                  </button>
                ) : (
                  entry.state !== 'done' && (
                    <button type="button" className="btn tm-btn" onClick={() => onSkip(entry)}>
                      Skip…
                    </button>
                  )
                )}
              </div>
            )}
            <label className="tm-field">
              <span>Start time ({cityById[day.cityId].name} time)</span>
              <input type="time" value={entry.timeSource === 'set' ? hm(entry.start) : ''} onChange={(e) => change((t) => setStartTime(t, day.number, id, e.target.value || null))} />
            </label>
            {entry.timeSource === 'set' && (
              <button type="button" className="link-btn" onClick={() => change((t) => setStartTime(t, day.number, id, null))}>
                Use the suggested time instead
              </button>
            )}
            {!day.leg && count > 1 && (
              <div className="tm-actions">
                <button type="button" className="btn tm-btn-sm" disabled={i === 0} onClick={() => change((t) => shiftInDay(t, day.number, id, -1))}>
                  ↑ Earlier in the day
                </button>
                <button type="button" className="btn tm-btn-sm" disabled={i === count - 1} onClick={() => change((t) => shiftInDay(t, day.number, id, 1))}>
                  ↓ Later in the day
                </button>
              </div>
            )}
            <MoveTo env={env} place={p} from={day.number} onMoved={setMoved} />
          </section>
        )}
      </div>
    </Modal>
  )
}

export function SkipSheet({ env, id, onClose }) {
  const { day, change, ask } = env
  const p = placeById[id]
  const [choose, setChoose] = useState(false)
  const [moved, setMoved] = useState(null)
  if (!p) return null
  const skip = () => {
    change((t) => markSkipped(t, day.number, id, true))
    track('activity_skipped', { choice: 'skip_only' })
    onClose()
  }
  return (
    <Modal title={`Skip ${p.name}?`} onClose={onClose}>
      {moved ? (
        <>
          <p>Moved to day {moved}. It’s off today’s plan and on that day in planning mode too.</p>
          <button type="button" className="btn btn-primary tm-btn" onClick={onClose}>
            Done
          </button>
        </>
      ) : (
        <div className="tm-sheet">
          <p className="tm-muted">Nothing is deleted. A skipped stop stays on the day, marked as skipped.</p>
          <div className="tm-stack">
            <button type="button" className="btn btn-primary tm-btn" onClick={skip}>
              Skip only
            </button>
            <button type="button" className="btn tm-btn" onClick={() => setChoose(true)} aria-expanded={choose}>
              Move to another day
            </button>
            {choose && (
              <MoveTo
                env={env}
                place={p}
                from={day.number}
                onMoved={(n) => {
                  track('activity_skipped', { choice: 'move' })
                  setMoved(n)
                }}
              />
            )}
            <button
              type="button"
              className="btn tm-btn"
              onClick={() => {
                track('activity_skipped', { choice: 'ask_ai' })
                onClose()
                ask(`I’m skipping ${p.name} today. Which day should I move it to?`, 'skip')
              }}
            >
              ✨ Ask EuroWander where to move it
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const NEARBY_FILTERS = ['all', 'food', 'coffee', 'drinks', 'sights', 'outdoors', 'saved']
const MEALS = ['breakfast', 'lunch', 'dinner']

export function NearbySheet({ env, finder: initial, onClose }) {
  const { trip, schedule, day, change, location, online, city, readOnly } = env
  const [finder, setFinder] = useState(initial)
  const [added, setAdded] = useState({})
  usePlacesVersion()
  // More real places for the city from OpenStreetMap, when online (cached on the phone for two weeks).
  useEffect(() => {
    if (!online) return
    import('../lib/osmPlaces.js').then((m) => m.loadOsmPlaces(city)).catch(() => {})
  }, [city.id, online]) // eslint-disable-line react-hooks/exhaustive-deps
  const ref = referencePoint({ position: location.position, schedule, cityId: day.cityId })
  const saved = useMemo(() => new Set(Object.keys(trip.statuses || {})), [trip.statuses])
  const onDay = new Set(trip.itinerary?.[day.number]?.placeIds || [])
  const budget = Boolean(savedBudgetPrefs().budget)
  const list = placesNear(ref, {
    finder: finder === 'saved' ? 'all' : finder,
    radiusKm: location.position ? 2 : 2.5,
    limit: 10,
    exclude: onDay,
    saved,
    budget,
  }).filter((x) => finder !== 'saved' || x.saved)
  const meal = MEALS.includes(finder)

  return (
    <Modal title={meal ? `${FINDERS[finder].label} nearby` : 'Near you'} onClose={onClose}>
      <div className="tm-sheet">
        <p className="tm-ref">
          {ref.kind === 'you' ? (
            <>
              📍 Near <strong>your location</strong>
              {location.position.accuracy > 300 ? ' (approximate)' : ''}.{' '}
              <button type="button" className="link-btn" onClick={location.forget}>
                Stop using it
              </button>
            </>
          ) : (
            <>
              Near <strong>{ref.label}</strong> {ref.kind === 'activity' ? '(your current or next stop)' : ''}, not your location.
            </>
          )}
        </p>
        {ref.kind !== 'you' && (
          <div className="tm-locate">
            <button type="button" className="btn tm-btn" onClick={location.request} disabled={location.status === 'asking'}>
              {location.status === 'asking' ? 'Finding you…' : '📍 Use my location'}
            </button>
            <p className="tm-source">
              {location.status === 'denied'
                ? 'Location is blocked for this site. You can allow it in your browser’s settings, or keep using your plan.'
                : location.status === 'unavailable'
                  ? 'Your location isn’t available right now.'
                  : 'Allow location to find places near you. It’s used once, on this phone only, and never saved or sent anywhere.'}
            </p>
          </div>
        )}
        <div className="tm-chips" role="group" aria-label="What to show">
          {(meal ? [finder, ...NEARBY_FILTERS] : NEARBY_FILTERS).map((f) => (
            <button key={f} type="button" className={`chip tm-chip${finder === f ? ' active' : ''}`} aria-pressed={finder === f} onClick={() => setFinder(f)}>
              {f === 'saved' ? '♥ Saved' : FINDERS[f].label}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="tm-muted">
            Nothing {finder === 'saved' ? 'you saved' : 'in Eurowander’s guide'} within walking distance{finder !== 'all' ? ' for this filter' : ''}.
            {!online && ' More places load when you’re back online.'}
          </p>
        ) : (
          <ul className="tm-near">
            {list.map(({ place, km, walk, saved: isSaved }) => (
              <li key={place.id}>
                <div className="tm-near-main">
                  <strong>
                    {place.name} {isSaved && <span aria-label="saved">♥</span>}
                  </strong>
                  <span className="tm-muted">
                    {distance(km)} · ~{walk} min walk · {place.type}
                    {place.costLevel != null ? ` · ${costLabel(place.costLevel)}` : ''}
                  </span>
                </div>
                <div className="tm-near-actions">
                  <Directions place={place} className="btn tm-btn-sm" label="Go" />
                  {!readOnly &&
                    (added[place.id] ? (
                      <span className="tm-tag tm-tag-good">Added</span>
                    ) : (
                      <button
                        type="button"
                        className="btn tm-btn-sm"
                        onClick={() => {
                          change((t) => addToDay(t, day.number, place.id))
                          setAdded((a) => ({ ...a, [place.id]: true }))
                          track('saved_place_added_today', { from: 'nearby', saved: isSaved })
                        }}
                        aria-label={`Add ${place.name} to ${env.isToday ? 'today' : `day ${day.number}`}`}
                      >
                        + {env.isToday ? 'Today' : `Day ${day.number}`}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="btn tm-btn-sm"
                    onClick={() => {
                      onClose()
                      env.showOnMap(place.id)
                    }}
                    aria-label={`Show ${place.name} on the map`}
                  >
                    Map
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="tm-source">Straight-line distances; walking times are rough. Opening hours aren’t in Eurowander’s data{meal ? ', so check before you go' : ''}.</p>
      </div>
    </Modal>
  )
}
