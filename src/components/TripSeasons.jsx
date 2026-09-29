// Events and season notes that match the trip dates. Everything here comes from the sample data.
export default function TripSeasons({ events, notes, hasDates }) {
  if (!hasDates) return <p className="rule">Add trip dates to check for seasonal events and busy seasons.</p>
  if (events.length === 0 && notes.length === 0) return null
  return (
    <>
      {events.length > 0 && (
        <>
          <p className="subhead">During your trip</p>
          <ul className="notes">
            {events.map(({ event, city }) => (
              <li key={event.id} className="note note-event">
                {event.emoji} You're visiting {city.name} during <strong>{event.name}</strong>. {event.description}
              </li>
            ))}
          </ul>
        </>
      )}
      {notes.length > 0 && (
        <>
          <p className="subhead">Season check</p>
          <ul className="notes">
            {notes.map((n) => (
              <li key={n.text} className={`note note-${n.tone}`}>
                {n.text}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="rule">Event dates repeat yearly and are approximate. Check official dates before booking.</p>
    </>
  )
}
