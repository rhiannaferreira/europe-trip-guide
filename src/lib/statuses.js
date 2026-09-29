// Place statuses for saved places. Every saved place has exactly one.
export const STATUS_INFO = {
  saved: { id: 'saved', icon: '❤️', label: 'Saved' },
  want: { id: 'want', icon: '📍', label: 'Want to visit' },
  visited: { id: 'visited', icon: '✓', label: 'Visited' },
}
export const STATUS_LIST = Object.values(STATUS_INFO)
export const statusInfo = (status) => STATUS_INFO[status] || STATUS_INFO.saved
