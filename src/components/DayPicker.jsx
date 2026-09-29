import { cityById } from '../data/cities.js'
import { formatDay } from '../utils/tripCalculations.js'

// A compact <select> of trip days. Days in `preferCityId` are listed first, so a Paris place offers Paris days first.
export default function DayPicker({ days, label, placeholder, exclude, preferCityId, onPick, className = '' }) {
  if (days.length === 0) return null
  const options = days.filter((d) => d.number !== exclude)
  const inCity = preferCityId ? options.filter((d) => d.cityId === preferCityId) : []
  const others = options.filter((d) => !inCity.includes(d))
  const option = (d) => (
    <option key={d.number} value={d.number}>
      Day {d.number} · {formatDay(d.date)} · {cityById[d.cityId].name}
    </option>
  )
  return (
    <select
      className={`day-picker ${className}`}
      aria-label={label}
      value=""
      onChange={(e) => {
        if (e.target.value) onPick(Number(e.target.value))
      }}
    >
      <option value="">{placeholder}</option>
      {inCity.length > 0 && others.length > 0 ? (
        <>
          <optgroup label={`In ${cityById[preferCityId].name}`}>{inCity.map(option)}</optgroup>
          <optgroup label="Other days">{others.map(option)}</optgroup>
        </>
      ) : (
        options.map(option)
      )}
    </select>
  )
}
