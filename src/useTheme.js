import { useEffect, useState } from 'react'
import { KEYS, readText, writeText } from './lib/storage.js'

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

// Light/dark theme. Until the user picks one, the app follows the system setting.
// Their choice is saved in localStorage (travel-app-theme) and applied as <html data-theme="...">,
// which the CSS colour tokens in styles.css already respond to.
export function useTheme() {
  const [saved, setSaved] = useState(() => {
    const value = readText(KEYS.theme)
    return value === 'light' || value === 'dark' ? value : null
  })
  const [system, setSystem] = useState(systemTheme)

  // Keep following the system setting while the user hasn't chosen.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = () => setSystem(systemTheme())
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (saved) document.documentElement.dataset.theme = saved
    else delete document.documentElement.dataset.theme
  }, [saved])

  const theme = saved || system
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    writeText(KEYS.theme, next)
    setSaved(next)
  }
  return { theme, toggle }
}
