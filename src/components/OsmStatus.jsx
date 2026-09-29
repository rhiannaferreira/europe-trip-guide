// One line under the place count saying whether OpenStreetMap added places for this city.
export default function OsmStatus({ state, city }) {
  if (state.status === 'loading')
    return (
      <p className="osm-status" role="status">
        <span className="spinner small" aria-hidden="true" /> Looking for more places in {city.name} on OpenStreetMap…
      </p>
    )
  if (state.status === 'error')
    return (
      <div className="notice osm-status" role="status">
        <span>
          {state.error?.offline ? "You're offline, so" : "OpenStreetMap couldn't be reached, so"} this list shows the built-in places only.
        </span>
        <button type="button" className="btn" onClick={state.retry}>
          Try again
        </button>
      </div>
    )
  if (state.status === 'ready')
    return (
      <p className="osm-status" role="status">
        {state.count > 0
          ? `Includes ${state.count} more place${state.count === 1 ? '' : 's'} from OpenStreetMap, marked as such.`
          : 'OpenStreetMap had nothing to add here beyond the places below.'}
      </p>
    )
  return null
}
