// A station field: type three letters or more and pick from the rail service's own stations. The picked
// station keeps the provider's station id, which every train search uses.
import { useEffect, useId, useRef, useState } from 'react'
import { searchStations, stationName } from '../services/live/trains.js'
import { LIVE_ERROR_TEXT } from '../services/live/http.js'

const MIN = 3

export default function StationSearch({ label, value, onChange, near = null, placeholder = 'Type a station or city' }) {
  const id = useId()
  const [text, setText] = useState(value ? stationName(value.name) : '')
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [state, setState] = useState('idle') // idle | loading | error | empty
  const [error, setError] = useState('')
  const typed = useRef(false)

  // A station picked from outside (the city's main station) shows its name.
  useEffect(() => {
    if (!typed.current) setText(value ? stationName(value.name) : '')
  }, [value])

  useEffect(() => {
    if (!typed.current) return undefined
    const q = text.trim()
    if (q.length < MIN) {
      setList([])
      setState('idle')
      return undefined
    }
    let live = true
    const t = setTimeout(() => {
      setState('loading')
      searchStations(q, near)
        .then((r) => {
          if (!live) return
          setList(r)
          setActive(r.length ? 0 : -1)
          setState(r.length ? 'idle' : 'empty')
          setOpen(true)
        })
        .catch((e) => {
          if (!live) return
          setList([])
          setState('error')
          setError(LIVE_ERROR_TEXT[e.code] || 'Station search is unavailable right now.')
          setOpen(true)
        })
    }, 300)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [text, near])

  const pick = (s) => {
    typed.current = false
    setText(stationName(s.name))
    setOpen(false)
    setList([])
    onChange(s)
  }

  const onKey = (e) => {
    if (!open || !list.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % list.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + list.length) % list.length)
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(list[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const listId = `${id}-list`
  return (
    <div className="station-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && list.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          typed.current = true
          setText(e.target.value)
          if (value) onChange(null)
        }}
        onKeyDown={onKey}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => list.length && setOpen(true)}
      />
      {state === 'loading' && <span className="station-picked">Searching stations…</span>}
      {state === 'empty' && <span className="station-picked">No stations match “{text.trim()}”.</span>}
      {state === 'error' && <span className="station-picked">{error}</span>}
      {state === 'idle' && typed.current && text.trim().length > 0 && text.trim().length < MIN && <span className="station-picked">Type at least {MIN} letters.</span>}
      {value && !typed.current && value.area && <span className="station-picked">{value.area}</span>}
      {open && list.length > 0 && (
        <ul className="station-list" id={listId} role="listbox" aria-label={`${label} suggestions`}>
          {list.map((s, i) => (
            <li key={s.id} role="presentation">
              <button type="button" role="option" id={`${id}-opt-${i}`} aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                {stationName(s.name)} {s.area && s.area !== s.name && <small>{s.area}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
