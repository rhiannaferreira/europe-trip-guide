// A photo when the data has one, otherwise an illustrated tile (emoji on a soft gradient).
// When a places API supplies image URLs, this is the only component that needs to know.
import { useState } from 'react'

// Stable hue per id so each city keeps its colour.
const hueFor = (id) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)

export default function Thumb({ id, image, emoji, alt, color, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return <img className={`thumb ${className}`} src={image} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  }
  const hue = hueFor(id)
  const style = color
    ? { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))` }
    : { background: `linear-gradient(135deg, hsl(${hue} 55% 62%), hsl(${(hue + 40) % 360} 60% 78%))` }
  return (
    <div className={`thumb thumb-illustrated ${className}`} style={style} role="img" aria-label={alt}>
      <span aria-hidden="true">{emoji}</span>
    </div>
  )
}
