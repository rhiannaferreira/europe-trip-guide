import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import { track } from '../lib/analytics.js'
import { navigate } from '../lib/router.jsx'
import { KEYS, readJSON } from '../lib/storage.js'
import { DEFAULT_TRIP_NAME, isEmptyTrip, migrate } from '../lib/tripModel.js'
import { planToTrip } from '../planner/convert.js'
import { planTotals } from '../planner/plan.js'
import { saveGeneratedTrip } from './saveTrip.js'

export default function SaveDialog({ plan, days, onClose }) {
  const { days: length } = planTotals(plan)
  const [name, setName] = useState(`${length}-day Europe trip`)
  const [startDate, setStartDate] = useState(plan.prefs.startDate || '')
  const [useBudget, setUseBudget] = useState(true)
  const current = migrate(readJSON(KEYS.trip))
  const replacing = !isEmptyTrip(current)
  const { prefs } = plan

  const save = (e) => {
    e.preventDefault()
    const trip = planToTrip({ ...plan, prefs: { ...prefs, startDate } }, days, { startDate, name: name.trim() })
    const budget = useBudget ? { total: prefs.budget != null ? String(prefs.budget) : '', currency: prefs.currency, travellers: prefs.travellers } : null
    saveGeneratedTrip(trip, { budget })
    track('generated_trip_saved', { cities: plan.stops.length, days: length, dated: Boolean(startDate) })
    navigate('/trip')
    window.scrollTo(0, 0)
  }

  return (
    <Modal title="Save as my trip" onClose={onClose}>
      <form className="save-form" onSubmit={save}>
        <label>
          Trip name
          <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        {!prefs.startDate && (
          <label>
            Start date <small>optional; adds dates, the calendar and weather</small>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        )}
        {(prefs.budget != null || prefs.travellers !== 1) && (
          <label className="check">
            <input type="checkbox" checked={useBudget} onChange={(e) => setUseBudget(e.target.checked)} />
            Set the Budget tab to {prefs.budget != null ? `${prefs.budget} ${prefs.currency}, ` : `${prefs.currency}, `}
            {prefs.travellers} traveller{prefs.travellers === 1 ? '' : 's'}
          </label>
        )}
        {replacing && (
          <p className="note note-warn">
            This replaces your current trip, “{current.name.trim() || DEFAULT_TRIP_NAME}” ({current.stops.length} {current.stops.length === 1 ? 'city' : 'cities'}). A backup copy
            stays in this browser.
          </p>
        )}
        <p className="rule">The day plans become your itinerary, and every planned place is marked “Want to go”. You can change anything afterwards.</p>
        <div className="save-actions">
          <button type="submit" className="btn btn-primary">
            {replacing ? 'Replace and save' : 'Save trip'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
