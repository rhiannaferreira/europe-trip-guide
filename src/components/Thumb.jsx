// A real photo when one can be found (from the data, or looked up on Wikipedia / Wikimedia Commons),
// otherwise an illustrated tile (emoji on a soft gradient). The tile shows straight away, and the
// photo fades in over it once loaded, so nothing jumps around.
//
// credit: how the photographer and licence are shown
//   'caption'  a line over the bottom of the image (large images)
//   'badge'    a small © link that shows the full credit on hover or focus
//   'title'    only as a tooltip (for thumbnails inside buttons, where a link can't go;
//              the same photo is credited in full on the city's own page)
import { useState } from 'react'
import { usePhoto, sizedSrc } from '../lib/photos.js'

// Stable hue per id so each city keeps its colour.
const hueFor = (id) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)

export const creditText = (p) => `Photo: ${p.artist}, ${p.license}, via Wikimedia Commons`

export default function Thumb({ id, image, emoji, alt, color, className = '', kind, item, width = 250, sizes, credit = 'badge', eager = false }) {
  const { status, photo } = usePhoto(kind, kind ? item : null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const hue = hueFor(id)
  const style = color
    ? { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))` }
    : { background: `linear-gradient(135deg, hsl(${hue} 55% 62%), hsl(${(hue + 40) % 360} 60% 78%))` }

  const src = image || (photo && sizedSrc(photo, width))
  const srcSet = photo?.thumbnail && sizes ? [500, 960].map((w) => `${sizedSrc(photo, w)} ${w}w`).join(', ') : undefined
  const showPhoto = src && !failed

  return (
    <div
      className={`thumb thumb-illustrated ${className}${status === 'loading' ? ' thumb-loading' : ''}${showPhoto && loaded ? ' thumb-has-photo' : ''}`}
      style={style}
      title={photo && credit === 'title' ? creditText(photo) : undefined}
    >
      {showPhoto && loaded ? (
        <span aria-hidden="true">{emoji}</span>
      ) : (
        <span role="img" aria-label={alt}>
          {emoji}
        </span>
      )}
      {showPhoto && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={loaded ? alt : ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width={photo?.width}
          height={photo?.height}
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {photo && loaded && credit === 'caption' && (
        <a className="photo-caption" href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
          📷 {photo.artist} · {photo.license} · Wikimedia Commons
        </a>
      )}
      {photo && loaded && credit === 'badge' && (
        <a className="photo-badge" href={photo.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={creditText(photo)} data-credit={creditText(photo)}>
          ©
        </a>
      )}
    </div>
  )
}
