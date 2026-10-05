// "Near a landmark": suggestions drop down as you type, like a maps search box. EuroWander's own places
// show at once (typos forgiven); live matches from the geocoder follow after a short pause, 3+ letters.
import { useEffect, useId, useRef, useState } from 'react'
import { placesInCity } from '../data/places.js'
import { closePlaces } from '../lib/search.js'
import { geocodePlace, suggestPlaces } from '../services/live/places.js'

export default function LandmarkSearch({ city, onPick, onMessage }) {
  const id = useId()
  const [text, setText] = useState('')
  const [live, setLive] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const typed = useRef(false)

  const q = text.trim()
  const guide = q.length >= 3 ? closePlaces(placesInCity(city.id), q, 3).map((p) => ({ key: p.id, name: p.name, detail: 'EuroWander guide', lat: p.lat, lng: p.lng })) : []
  const names = new Set(guide.map((g) => g.name.toLowerCase()))
  const list = [...guide, ...live.filter((s) => !names.has(s.name.toLowerCase())).map((s, i) => ({ ...s, key: `live-${i}` }))].slice(0, 7)

  useEffect(() => {
    setText('')
    setLive([])
  }, [city.id])

  useEffect(() => {
    if (!typed.current || q.length < 3) {
      setLive([])
      setLoading(false)
      return undefined
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      suggestPlaces(q, city)
        .then((r) => alive && setLive(r))
        .catch(() => alive && setLive([]))
        .finally(() => alive && setLoading(false))
    }, 350)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, city])

  useEffect(() => setActive(list.length ? 0 : -1), [list.length])

  const pick = (s) => {
    typed.current = false
    setText(s.name)
    setOpen(false)
    setLive([])
    onPick({ label: s.name, lat: s.lat, lng: s.lng })
  }

  // Enter with nothing highlighted: the best suggestion, else ask the geocoder once.
  const submit = async (e) => {
    e.preventDefault()
    if (q.length < 3) return
    if (list[active >= 0 ? active : 0]) return pick(list[active >= 0 ? active : 0])
    try {
      const pt = await geocodePlace(`${q}, ${city.name}`, city)
      pick({ name: pt.name, lat: pt.lat, lng: pt.lng })
    } catch (error) {
      onMessage(error.code === 'not_found' ? `Couldn’t find “${q}” in ${city.name}.` : 'Couldn’t look that place up right now.')
    }
  }

  const onKey = (e) => {
    if (!open || !list.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % list.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + list.length) % list.length)
    } else if (e.key === 'Escape') setOpen(false)
  }

  const listId = `${id}-list`
  const showList = open && q.length >= 3 && (list.length > 0 || !loading)
  return (
    <form className="live-controls station-field landmark-field" onSubmit={submit} role="search">
      <input
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-label="Search near a landmark"
        autoComplete="off"
        placeholder={`Near a landmark, e.g. ${placesInCity(city.id)[0]?.name || 'the station'}`}
        value={text}
        maxLength={80}
        onChange={(e) => {
          typed.current = true
          setText(e.target.value)
          setOpen(true)
          onMessage('')
        }}
        onKeyDown={onKey}
        onFocus={() => q.length >= 3 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <button type="submit" className="btn">
        Search near it
      </button>
      {showList && (
        <ul className="station-list" id={listId} role="listbox" aria-label="Landmark suggestions">
          {list.map((s, i) => (
            <li key={s.key} role="presentation">
              <button type="button" role="option" id={`${id}-opt-${i}`} aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                📍 {s.name} {s.detail && <small>{s.detail}</small>}
              </button>
            </li>
          ))}
          {loading && <li className="station-picked landmark-more">Looking for more…</li>}
          {!loading && !list.length && <li className="station-picked landmark-more">No matches yet. Press Search to look it up.</li>}
        </ul>
      )}
    </form>
  )
}
