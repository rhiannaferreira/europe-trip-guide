import { useMemo, useRef, useState } from 'react'
import { countryByCode } from '../data/countries.js'
import { cityById } from '../data/cities.js'
import { interestById } from '../data/interests.js'
import { search } from '../lib/search.js'

// Search box with grouped suggestions. Typing also filters the places list and map (via onQueryChange).
export default function SearchBar({ query, onQueryChange, onPickCountry, onPickCity, onPickPlace }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const blurTimer = useRef()
  const results = useMemo(() => search(query), [query])

  const items = [
    ...results.countries.map((c) => ({ key: `country-${c.code}`, icon: c.flag, label: c.name, sub: 'Country', pick: () => onPickCountry(c.code) })),
    ...results.cities.map((c) => ({
      key: `city-${c.id}`,
      icon: countryByCode[c.country].flag,
      label: c.name,
      sub: `${c.hiddenGem ? 'Hidden gem · ' : 'City · '}${countryByCode[c.country].name}`,
      pick: () => onPickCity(c.id),
    })),
    ...results.places.map((p) => ({
      key: `place-${p.id}`,
      icon: interestById[p.category].icon,
      label: p.name,
      sub: `${interestById[p.category].label} · ${cityById[p.cityId].name}`,
      pick: () => onPickPlace(p.id),
    })),
  ]

  const choose = (item) => {
    item.pick()
    setOpen(false)
    setActive(-1)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (active >= 0 && items[active]) choose(items[active])
      else setOpen(false) // keep the text as a filter on the places list
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && query.trim() && items.length > 0

  return (
    <div className="search" role="search">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        value={query}
        placeholder="Search countries, cities, museums, restaurants…"
        aria-label="Search"
        aria-expanded={Boolean(showList)}
        aria-controls="search-results"
        onChange={(e) => {
          clearTimeout(blurTimer.current)
          onQueryChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => {
          clearTimeout(blurTimer.current)
          setOpen(true)
        }}
        onBlur={() => (blurTimer.current = setTimeout(() => setOpen(false), 150))}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onQueryChange('')}>
          ×
        </button>
      )}
      {showList && (
        <ul className="search-results" id="search-results" role="listbox" onMouseDown={() => clearTimeout(blurTimer.current)}>
          {items.map((item, i) => (
            <li key={item.key} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? 'active' : ''} onClick={() => choose(item)}>
                <span className="search-result-icon" aria-hidden="true">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && items.length === 0 && <p className="search-empty">No matches. Try a city, country or a word like "museum".</p>}
    </div>
  )
}
