// Light/dark switch for the header.
export default function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  return (
    <button type="button" className="btn nav-btn theme-toggle" onClick={onToggle} aria-pressed={dark} aria-label="Dark mode" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <span aria-hidden="true">{dark ? '🌙' : '☀️'}</span>
      <span className="nav-label">{dark ? 'Dark' : 'Light'}</span>
    </button>
  )
}
