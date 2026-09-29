import { DEFAULT_TRIP_NAME } from '../useTrip.js'

// Trip name and whole-trip notes. City notes live on each stop; day notes on each day.
export default function TripNotes({ trip, onOpenPrint }) {
  return (
    <section className="trip-notes" aria-labelledby="trip-notes-title">
      <h2 className="section-title" id="trip-notes-title">
        Trip notes
      </h2>
      <label className="notes-field">
        <span>Trip name</span>
        <input type="text" value={trip.name} placeholder={DEFAULT_TRIP_NAME} onChange={(e) => trip.setName(e.target.value)} maxLength={80} />
      </label>
      <label className="notes-field">
        <span>Notes for the whole trip</span>
        <textarea rows={3} value={trip.notes.trip} placeholder="e.g. Book Louvre tickets before leaving. Check train reservations." onChange={(e) => trip.setTripNote(e.target.value)} />
      </label>
      <p className="rule">Notes stay in this browser. Add notes for a city on its stop above, and for a day in the Days tab.</p>
      <button type="button" className="btn print-open-btn" onClick={onOpenPrint}>
        🖨️ Printable trip summary
      </button>
    </section>
  )
}
