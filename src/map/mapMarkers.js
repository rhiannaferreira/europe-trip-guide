// EuroWander's marker images, drawn once on a canvas and handed to MapLibre as icons. MapLibre's own text
// can't draw emoji, and DOM markers get slow in the hundreds, so pins are images on a symbol layer.
//
// Icons are named by how they look, and drawn the first time a layer asks for one (the missing-image resolver):
//   pin|<theme>|<variant>|<state>|<ring colour>|<emoji>   variant guide|live, state ''|saved|top
//   heart|<colour>                                         the ♥ badge on saved places
//   dot|<fill>|<ring>|<size>                               plain round marker (cities, stations)
import light from './styles/euroWanderLight.js'
import dark from './styles/euroWanderDark.js'

const PALETTES = { light, dark }
const RATIO = 2

// Ring colours per interest: muted, so pins differ by emoji first and colour second.
export const interestRings = {
  food: '#c9704f',
  outdoors: '#4a8f7f',
  museums: '#7a6596',
  nightlife: '#4f6b78',
  history: '#9a7a4f',
  shopping: '#b4607f',
}

export const pinIconId = (theme, variant, state, ring, emoji) => `pin|${theme}|${variant}|${state}|${ring}|${emoji}`

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = Math.ceil(size * RATIO)
  const ctx = c.getContext('2d')
  ctx.scale(RATIO, RATIO)
  return [c, ctx]
}

function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

function heartPath(ctx, cx, cy, s) {
  // A heart s wide, centred on (cx, cy).
  const t = s / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + t * 0.85)
  ctx.bezierCurveTo(cx - t * 1.25, cy + t * 0.05, cx - t * 0.75, cy - t * 0.95, cx, cy - t * 0.35)
  ctx.bezierCurveTo(cx + t * 0.75, cy - t * 0.95, cx + t * 1.25, cy + t * 0.05, cx, cy + t * 0.85)
  ctx.closePath()
}

function drawPin(theme, variant, state, ring, emoji) {
  const P = PALETTES[theme] || light
  const guide = variant === 'guide'
  const d = guide ? 30 : state === 'top' ? 28 : 24 // disc diameter
  const pad = 5 // room for shadow and the saved badge
  const size = d + pad * 2
  const [c, ctx] = canvas(size)
  const cx = size / 2
  const cy = size / 2
  // Soft shadow so pins lift off the map without a heavy outline.
  ctx.save()
  ctx.shadowColor = P.shadow
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1
  circle(ctx, cx, cy, d / 2)
  ctx.fillStyle = P.card
  ctx.fill()
  ctx.restore()
  // Ring: category colour for EuroWander picks, gold for well-known live places, the accent when saved.
  const ringColour = state === 'saved' ? P.saved : state === 'top' ? '#d4a017' : guide ? ring : P.muted
  circle(ctx, cx, cy, d / 2 - (guide ? 1.6 : 1.2))
  ctx.lineWidth = guide || state ? 2.6 : 1.6
  ctx.strokeStyle = ringColour
  ctx.stroke()
  // The emoji.
  ctx.font = `${Math.round(d * (guide ? 0.5 : 0.48))}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, cx, cy + 1)
  if (state === 'saved') {
    // ♥ badge, top right.
    const bx = cx + d / 2 - 3
    const by = cy - d / 2 + 3
    circle(ctx, bx, by, 6.5)
    ctx.fillStyle = P.card
    ctx.fill()
    heartPath(ctx, bx, by + 0.4, 8.5)
    ctx.fillStyle = P.saved
    ctx.fill()
  }
  return c
}

function drawHeart(colour) {
  const [c, ctx] = canvas(18)
  circle(ctx, 9, 9, 8.5)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  heartPath(ctx, 9, 9.5, 11)
  ctx.fillStyle = colour
  ctx.fill()
  return c
}

function drawDot(fill, ring, size) {
  const s = Number(size) || 14
  const [c, ctx] = canvas(s + 4)
  circle(ctx, s / 2 + 2, s / 2 + 2, s / 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = ring
  ctx.stroke()
  return c
}

export function drawIcon(id) {
  const [kind, ...parts] = id.split('|')
  if (kind === 'pin') return drawPin(...parts)
  if (kind === 'heart') return drawHeart(parts[0])
  if (kind === 'dot') return drawDot(...parts)
  return null
}

// Draws icons on demand for one map. Returns a function that stops listening.
export function installIcons(map) {
  const resolve = (id) => {
    if (map.hasImage(id)) return
    let c
    try {
      c = drawIcon(id)
    } catch {
      c = null
    }
    if (!c) return
    const ctx = c.getContext('2d')
    map.addImage(id, ctx.getImageData(0, 0, c.width, c.height), { pixelRatio: RATIO })
  }
  // MapLibre 6 asks a resolver before drawing; the `styleimagemissing` event comes too late to fill in.
  map.setMissingStyleImageResolver(resolve)
  return () => map.setMissingStyleImageResolver(null)
}
