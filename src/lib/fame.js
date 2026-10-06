// The React side of fameCore.js (kept apart so the core can be tested without React).
import { useEffect, useState } from 'react'
import { knownFame, loadFame } from './fameCore.js'

export { WELL_KNOWN, knownFame, loadFame } from './fameCore.js'

const valid = (id) => typeof id === 'string' && /^Q\d{1,12}$/.test(id)

// Re-renders once fame for these places is known. Returns a function: place → languages (0 if unknown).
export function useFame(places) {
  const [, setVersion] = useState(0)
  const ids = places.map((p) => p.wikidata).filter(valid)
  const key = ids.sort().join(',')
  useEffect(() => {
    if (!ids.length) return undefined
    let live = true
    loadFame(ids)
      .catch(() => {})
      .finally(() => live && setVersion((v) => v + 1))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (p) => knownFame(p?.wikidata) || 0
}
