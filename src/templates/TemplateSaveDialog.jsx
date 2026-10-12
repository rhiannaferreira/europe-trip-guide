import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import { useAccount } from '../lib/account.jsx'
import { track } from '../lib/analytics.js'
import { navigate } from '../lib/router.jsx'
import { KEYS, readJSON } from '../lib/storage.js'
import { DEFAULT_TRIP_NAME, isEmptyTrip, migrate } from '../lib/tripModel.js'
import { saveGeneratedTrip } from '../builder/saveTrip.js'
import { templateTrip } from './templatePlan.js'

// Copies a ready-made trip into the traveller's own trip, the same way Build My Trip saves one: the trip
// in this browser (the current one is kept as a backup), and a new trip in the account when signed in.
// `then`: 'open' goes to My trip afterwards (Customize this trip); 'stay' stays on the page (Save).
export default function TemplateSaveDialog({ template: t, plan, days, changed, then = 'open', onSaved, onClose }) {
  const account = useAccount()
  const [name, setName] = useState(t.title)
  const [startDate, setStartDate] = useState(plan.prefs.startDate || '')
  const current = migrate(readJSON(KEYS.trip))
  const replacing = !isEmptyTrip(current)
  const signedIn = Boolean(account.enabled && account.user)

  const save = (e) => {
    e.preventDefault()
    saveGeneratedTrip(templateTrip(t, plan, days, { name: name.trim(), startDate }))
    track('trip_template_saved', { template: t.id, then, signed_in: signedIn, dated: Boolean(startDate), changed, cities: plan.stops.length })
    if (then === 'open') {
      navigate('/trip')
      window.scrollTo(0, 0)
    } else onSaved?.()
  }

  return (
    <Modal title={then === 'open' ? 'Customize this trip' : signedIn ? 'Save to My Trips' : 'Save as my trip'} onClose={onClose}>
      <form className="save-form" onSubmit={save}>
        <p className="rule">
          This makes your own copy of “{t.title}”{changed ? ' with your changes' : ''}. Change anything afterwards: dates, cities, nights, places, budget. Later updates to this trip idea won’t change your copy.
        </p>
        <label>
          Trip name
          <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Start date <small>optional; adds dates, the calendar, weather and real train times</small>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {replacing && (
          <p className="note note-warn">
            This replaces the trip in this browser, “{current.name.trim() || DEFAULT_TRIP_NAME}” ({current.stops.length} {current.stops.length === 1 ? 'city' : 'cities'}). A backup copy stays
            in this browser{signedIn ? ', and it stays in your account' : ''}.
          </p>
        )}
        {signedIn && (
          <p className="note note-tip">
            {then === 'open' ? 'It’s also saved to your account as a new trip, next to the ones you already have.' : 'It’s added to your account as a new trip the next time you open My trip.'}
          </p>
        )}
        <div className="save-actions">
          <button type="submit" className="btn btn-primary">
            {then === 'open' ? 'Make it mine' : 'Save trip'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
