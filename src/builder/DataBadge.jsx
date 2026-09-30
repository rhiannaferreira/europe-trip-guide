// Where a number or fact comes from. Everything the builder shows carries one of these, so estimates are
// never mistaken for live data.
export const DATA_KINDS = {
  live: { label: 'Live', title: 'Fetched just now from a live source' },
  estimate: { label: 'Estimate', title: 'Worked out from Eurowander’s sample data and simple rules; not a live price or timetable' },
  sample: { label: 'Guide data', title: 'From Eurowander’s own city, place and train data' },
  seasonal: { label: 'Seasonal', title: 'Typical for the time of year, from Eurowander’s city data' },
  history: { label: 'Past data', title: 'What actually happened on these dates last year; history, not a forecast' },
  user: { label: 'Your choice', title: 'Something you entered or picked' },
  ai: { label: 'AI suggestion', title: 'An AI read your request; the planner worked out every number' },
}

export default function DataBadge({ kind, title }) {
  const k = DATA_KINDS[kind] || DATA_KINDS.estimate
  return (
    <span className={`data-badge data-${kind}`} title={title || k.title}>
      {k.label}
    </span>
  )
}
