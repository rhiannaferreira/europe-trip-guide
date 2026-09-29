export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 0 means free; 1–3 become $, $$, $$$.
export const costLabel = (level) => (level === 0 ? 'Free' : '$'.repeat(level))

// [4, 5, 6, 9] → "Apr–Jun, Sep". Months are 1–12 and may wrap past December ([11, 12, 1]).
export function monthRange(months) {
  if (!months || months.length === 0) return ''
  const set = new Set(months)
  // Start a run at a month whose previous month isn't in the set, so Nov–Jan stays one run.
  const starts = months.filter((m) => !set.has(m === 1 ? 12 : m - 1))
  if (starts.length === 0) return 'All year'
  return starts
    .sort((a, b) => a - b)
    .map((start) => {
      let end = start
      while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start) end = end === 12 ? 1 : end + 1
      return end === start ? monthNames[start - 1] : `${monthNames[start - 1]}–${monthNames[end - 1]}`
    })
    .join(', ')
}

// 95 → "1h 35m", 45 → "45m".
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
