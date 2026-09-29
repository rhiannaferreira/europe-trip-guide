// Start and end date pickers, shared by the Trip and Days tabs.
export default function TripDates({ startDate, endDate, days, onChange }) {
  const dateError = startDate && endDate && endDate < startDate
  return (
    <div className="trip-dates">
      <label>
        Start date
        <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => onChange(e.target.value, endDate)} />
      </label>
      <label>
        End date
        <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => onChange(startDate, e.target.value)} />
      </label>
      {dateError ? (
        <p className="date-note error">The end date is before the start date.</p>
      ) : days ? (
        <p className="date-note">
          {days} day{days === 1 ? '' : 's'}, counting both the first and last day.
        </p>
      ) : (
        <p className="date-note">Optional: add dates to plan day by day and see pace and events.</p>
      )}
    </div>
  )
}
