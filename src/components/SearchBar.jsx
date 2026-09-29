import { useEffect, useMemo, useRef, useState } from 'react'
import { countryByCode } from '../data/countries.js'
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { interestById } from '../data/interests.js'
import { highlight, search } from '../lib/search.js'
import { KEYS, readJSON, writeJSON } from '../lib/storage.js'

const MAX_RECENT = 5

// Recent picks are stored as { kind, id } and skipped if the data no longer has them.
const loadRecent = () => (readJSON(KEYS.recentSearches, []) || []).filter((r) => r && ['country', 'city', 'place'].includes(r.kind))

function Highlighted({ text, query }) {
  return highlight(text, query).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))
}

// Search box with autocomplete: grouped suggestions (countries, cities, places) as you type, best
// matches first, matching letters highlighted, "did you mean" for typos, and recent picks when empty.
// Arrow keys move through suggestions, Enter picks, Escape closes. Press "/" anywhere to jump here.
// Typing also filters the places list and map (via onQueryChange).
export default function SearchBar({ query, onQueryChange, onPickCountry, onPickCity, onPickPlace }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState(loadRecent)
  const blurTimer = useRef()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const results = useMemo(() => search(query), [query])
  const typing = Boolean(query.trim())

  const toItem = ({ kind, id }) => {
    if (kind === 'country' && countryByCode[id]) {
      const c = countryByCode[id]
      return { kind, id, icon: c.flag, label: c.name, sub: 'Country', pick: () => onPickCountry(id) }
    }
    if (kind === 'city' && cityById[id]) {
      const c = cityById[id]
      return { kind, id, icon: countryByCode[c.country].flag, label: c.name, sub: `${c.hiddenGem ? 'Hidden gem' : 'City'} · ${countryByCode[c.country].name}`, pick: () => onPickCity(id) }
    }
    if (kind === 'place' && placeById[id]) {
      const p = placeById[id]
      return { kind, id, icon: interestById[p.category].icon, label: p.name, sub: `${interestById[p.category].label} · ${cityById[p.cityId].name}`, pick: () => onPickPlace(id) }
    }
    return null
  }

  const groups = typing
    ? [
        { label: 'Countries', items: results.countries.map((c) => toItem({ kind: 'country', id: c.code })) },
        { label: 'Cities', items: results.cities.map((c) => toItem({ kind: 'city', id: c.id })) },
        { label: 'Places', items: results.places.map((p) => toItem({ kind: 'place', id: p.id })) },
      ].filter((g) => g.items.length)
    : recent.length
      ? [{ label: 'Recent', items: recent.map(toItem).filter(Boolean) }]
      : []
  const items = groups.flatMap((g) => g.items)

  const remember = (item) => {
    const next = [{ kind: item.kind, id: item.id }, ...recent.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, MAX_RECENT)
    setRecent(next)
    writeJSON(KEYS.recentSearches, next)
  }

  const choose = (item) => {
    remember(item)
    item.pick()
    setOpen(false)
    setActive(-1)
  }

  const clearRecent = () => {
    setRecent([])
    writeJSON(KEYS.recentSearches, [])
    inputRef.current?.focus()
  }

  // "/" focuses the search from anywhere (unless you're typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return
      if (document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keep the highlighted suggestion scrolled into view.
  useEffect(() => {
    if (active >= 0) listRef.current?.querySelector(`#search-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (items.length ? (i + 1) % items.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && items[active]) {
        e.preventDefault()
        choose(items[active])
      } else setOpen(false) // keep the text as a filter on the places list
    } else if (e.key === 'Escape') {
      if (open) setOpen(false)
      else if (query) onQueryChange('')
      setActive(-1)
    } else if (e.key === 'Tab') setOpen(false)
  }

  const showList = open && items.length > 0
  const noMatches = open && typing && items.length === 0

  let index = -1
  return (
    <div className="search" role="search">
      <span className="search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search countries, cities, museums, restaurants…"
        aria-label="Search countries, cities and places"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls="search-results"
        aria-activedescendant={showList && active >= 0 ? `search-opt-${active}` : undefined}
        aria-keyshortcuts="/"
        autoComplete="off"
        spellCheck="false"
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
      {query ? (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          onClick={() => {
            onQueryChange('')
            inputRef.current?.focus()
          }}
        >
          ×
        </button>
      ) : (
        <kbd className="search-kbd" aria-hidden="true">
          /
        </kbd>
      )}
      <div className="search-results" hidden={!showList} onMouseDown={(e) => e.preventDefault()}>
        {results.fuzzy && typing && <p className="search-hint">No exact matches. Did you mean:</p>}
        <ul id="search-results" role="listbox" aria-label="Suggestions" ref={listRef}>
          {groups.map((g) => (
            <li key={g.label} role="presentation">
              <div className="search-group-label" id={`search-group-${g.label}`} role="presentation">
                {g.label}
                {g.label === 'Recent' && (
                  <button type="button" className="link-btn small" tabIndex={-1} onClick={clearRecent}>
                    Clear
                  </button>
                )}
              </div>
              <ul role="group" aria-labelledby={`search-group-${g.label}`}>
                {g.items.map((item) => {
                  index++
                  const i = index
                  return (
                    <li
                      key={`${item.kind}-${item.id}`}
                      id={`search-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className={`search-option${i === active ? ' active' : ''}`}
                      onClick={() => choose(item)}
                      onMouseMove={() => active !== i && setActive(i)}
                    >
                      <span className="search-result-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>
                        <strong>{typing && !results.fuzzy ? <Highlighted text={item.label} query={query} /> : item.label}</strong>
                        <small>{item.sub}</small>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      {noMatches && (
        <p className="search-empty" role="status">
          No matches for “{query.trim()}”. Try a city, a country, or a word like “museum”, “beach” or “market”.
        </p>
      )}
    </div>
  )
}
