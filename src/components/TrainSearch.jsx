// Real trains between two stops: the cities' main stations (both can be changed), a date and time, and the
// timetable's answers. Opening it is the traveller asking for trains, so it searches once; nothing searches
// in the background. When the rail service can't answer, EuroWander's own estimate is shown, labelled as one.
import { useEffect, useRef, useState } from 'react'
import { cityById } from '../data/cities.js'
import { formatDuration } from '../lib/format.js'
import { track } from '../lib/analytics.js'
import { hasRail, journeySnapshot, mainStation, searchJourneys, stationName } from '../services/live/trains.js'
import JourneyCard from './JourneyCard.jsx'
import { Freshness, LiveLoading, LiveUnavailable, RailAttribution, SourceLabel } from './LiveBits.jsx'
import Modal from './Modal.jsx'
import StationSearch from './StationSearch.jsx'

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAhead = (date) => Math.round((new Date(`${date}T12:00:00`) - new Date()) / 86400000)

export function TrainSearch({ fromCityId, toCityId, date = '', time = '08:00', chosen = null, onChoose, estimate = null }) {
  const fromCity = cityById[fromCityId]
  const toCity = cityById[toCityId]
  const rail = hasRail(fromCityId) && hasRail(toCityId)
  const today = ymd(new Date())
  const [from, setFrom] = useState(chosen?.origin || null)
  const [to, setTo] = useState(chosen?.destination || null)
  const [form, setForm] = useState({ date: date && date >= today ? date : today, time, arriveBy: false, maxTransfers: '' })
  const [stations, setStations] = useState(rail ? 'loading' : 'none')
  const [res, setRes] = useState({ status: 'idle' })
  const searched = useRef(false)

  // The cities' main stations, unless a train was already picked (its stations come with it).
  useEffect(() => {
    if (!rail || (chosen?.origin && chosen?.destination)) {
      setStations(rail ? 'ready' : 'none')
      return undefined
    }
    let live = true
    Promise.allSettled([mainStation(fromCityId, toCityId), mainStation(toCityId, fromCityId)]).then(([a, b]) => {
      if (!live) return
      if (a.value) setFrom((x) => x || a.value)
      if (b.value) setTo((x) => x || b.value)
      const failed = [a, b].find((r) => r.status === 'rejected')
      setStations(failed ? 'error' : 'ready')
      if (failed) setRes({ status: 'error', error: failed.reason })
    })
    return () => {
      live = false
    }
  }, [rail, fromCityId, toCityId, chosen])

  const run = async (cursor = null) => {
    if (!from || !to) return
    setRes((r) => ({ ...r, status: 'loading' }))
    try {
      const r = await searchJourneys({
        from,
        to,
        date: form.date,
        time: form.time,
        arriveBy: form.arriveBy,
        maxTransfers: form.maxTransfers === '' ? null : Number(form.maxTransfers),
        cursor,
      })
      setRes({ status: 'done', ...r })
      track('live_trains_searched', { results: r.journeys.length, paged: Boolean(cursor), ahead: Math.min(daysAhead(form.date), 365) })
    } catch (error) {
      setRes({ status: 'error', error })
      track('live_data_failed', { what: 'trains', code: error.code })
    }
  }

  // Search once, as soon as both stations are known.
  useEffect(() => {
    if (stations === 'ready' && from && to && !searched.current) {
      searched.current = true
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, from, to])

  const choose = (j) => {
    const same = chosen && chosen.departure?.scheduled === j.departure.scheduled && chosen.origin?.id === j.origin.id
    onChoose(same ? null : journeySnapshot(j))
    if (!same) track('live_train_saved', { transfers: j.transfers })
  }
  const isChosen = (j) => Boolean(chosen && chosen.departure?.scheduled === j.departure.scheduled && chosen.origin?.id === j.origin.id && chosen.destination?.id === j.destination.id)

  const estimateNote = estimate && (
    <p className="journey-meta">
      <SourceLabel kind="estimate" /> {fromCity.name} → {toCity.name}: about {formatDuration(estimate.minutes)}
      {estimate.estimated ? ', worked out from the distance.' : ', a typical journey time.'}
    </p>
  )

  if (!rail) {
    const noRail = [fromCity, toCity].find((c) => !hasRail(c.id))
    return (
      <div className="train-search">
        <p>{noRail.name} has no passenger trains, so there’s no timetable to search. Buses or ferries are the way in.</p>
        {estimateNote}
      </div>
    )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const journeys = res.journeys || []
  return (
    <div className="train-search">
      <form
        className="train-search"
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
      >
        <div className="train-search-row">
          <StationSearch label="From" value={from} onChange={setFrom} near={fromCity} />
          <StationSearch label="To" value={to} onChange={setTo} near={toCity} />
        </div>
        <div className="train-search-row">
          <label>
            Date
            <input type="date" value={form.date} min={today} onChange={set('date')} required />
          </label>
          <div className="train-time">
            <select aria-label="Leave after or arrive by" value={form.arriveBy ? 'arrive' : 'depart'} onChange={(e) => setForm((f) => ({ ...f, arriveBy: e.target.value === 'arrive' }))}>
              <option value="depart">Leave after</option>
              <option value="arrive">Arrive by</option>
            </select>
            <input type="time" value={form.time} onChange={set('time')} required aria-label={form.arriveBy ? 'Arrive by' : 'Leave after'} />
          </div>
        </div>
        <label>
          Changes
          <select value={form.maxTransfers} onChange={set('maxTransfers')}>
            <option value="">Any number of changes</option>
            <option value="1">At most one change</option>
            <option value="0">Direct trains only</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!from || !to || res.status === 'loading'}>
          Find trains
        </button>
        {stations === 'ready' && (!from || !to) && <p className="journey-meta">Pick {!from ? 'a departure' : 'an arrival'} station to search.</p>}
      </form>

      {stations === 'loading' && <LiveLoading text="Finding stations…" />}
      {res.status === 'loading' && <LiveLoading text="Finding trains…" />}
      {res.status === 'error' && (
        <>
          <LiveUnavailable error={res.error} what="Live train times" fallback={estimate ? 'EuroWander’s estimate is below instead.' : 'Check the operator’s site for times.'} onRetry={from && to ? () => run() : null} />
          {estimateNote}
        </>
      )}
      {res.status === 'done' && journeys.length === 0 && (
        <>
          <p>
            No trains found {form.arriveBy ? 'arriving by' : 'leaving after'} {form.time} on that day.
            {daysAhead(form.date) > 30 ? ' Timetables this far ahead may not be published yet.' : ' Try another time, fewer limits on changes, or a different station.'}
          </p>
          {estimateNote}
        </>
      )}
      {res.status !== 'error' && journeys.length > 0 && (
        <>
          {res.previous && (
            <button type="button" className="btn" onClick={() => run(res.previous)} disabled={res.status === 'loading'}>
              ↑ Earlier trains
            </button>
          )}
          <ul className="journey-list" aria-label={`Trains from ${stationName(from?.name)} to ${stationName(to?.name)}`}>
            {journeys.map((j) => (
              <li key={j.id || j.departure.scheduled}>
                <JourneyCard journey={j} onChoose={onChoose ? choose : null} chosen={isChosen(j)} chooseLabel="Add to my trip" />
              </li>
            ))}
          </ul>
          {res.next && (
            <button type="button" className="btn" onClick={() => run(res.next)} disabled={res.status === 'loading'}>
              ↓ Later trains
            </button>
          )}
          <Freshness at={res.retrievedAt} verb="Checked" />
        </>
      )}
      <RailAttribution />
    </div>
  )
}

export default function TrainSearchModal({ onClose, ...props }) {
  const from = cityById[props.fromCityId]
  const to = cityById[props.toCityId]
  return (
    <Modal title={`Trains: ${from.name} → ${to.name}`} onClose={onClose} wide>
      <TrainSearch {...props} />
    </Modal>
  )
}
