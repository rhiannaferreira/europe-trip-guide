// Page title, description and canonical link for the current route, so each city page has its
// own entry in search results and link previews. The build also writes these into static HTML
// for every city and country (scripts/prerender.mjs), for crawlers that don't run JavaScript.
export const SITE_URL = 'https://eurowander.vercel.app'
export const SITE_NAME = 'Eurowander'
export const DEFAULT_DESCRIPTION =
  'Plan a trip across Europe: browse cities and places by interest, find hidden gems, connect countries by train, and build a day-by-day itinerary.'

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    const [, key, name] = /\[(\w+)="([^"]+)"\]/.exec(selector)
    el.setAttribute(key, name)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

export function setPageMeta({ title, description = DEFAULT_DESCRIPTION, path = '/', image = null }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: plan a train-friendly trip across Europe`
  document.title = fullTitle
  setMeta('meta[name="description"]', 'content', description)
  setMeta('meta[property="og:title"]', 'content', fullTitle)
  setMeta('meta[property="og:description"]', 'content', description)
  setMeta('meta[property="og:url"]', 'content', SITE_URL + path)
  setMeta('link[rel="canonical"]', 'href', SITE_URL + path)
  if (image) setMeta('meta[property="og:image"]', 'content', image)
}
