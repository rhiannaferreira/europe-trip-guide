// Real photos for cities and places, from Wikipedia articles' lead images (hosted on Wikimedia Commons),
// with the photographer and licence for the credit line.
//
// How it works: requests are collected for a moment and sent in batches of up to 50 titles
// (one Wikipedia request for the images, one Commons request for the credits). A photo is only
// used when the article's coordinates are near the city or place, and maps, logos and flags are
// skipped. Results (including "no photo") are cached in localStorage for a month, so each photo
// is looked up once per browser. When anything fails, the illustrated tile stays.
import { useEffect, useState } from 'react'
import { cityWikiTitles, placeWikiTitles } from '../data/wikiTitles.js'
import { createCache, fetchJSON } from './net.js'
import { distanceKm } from '../utils/distance.js'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const BATCH = 50
const cache = createCache('photos', { ttlDays: 30, max: 600 })

const SKIP_FILE = /\.(svg|gif|tiff?)$|\b(map|locator|location|logo|coat[ _]of[ _]arms|flag|seal|emblem|diagram|plan)\b/i

// Thumbnails come at 960px wide; Wikimedia serves the same image at other standard widths.
export const STANDARD_WIDTHS = [120, 250, 500, 960]
export function sizedSrc(photo, width) {
  if (!photo.thumbnail || photo.width < 960) return photo.src
  return photo.src.replace(/\/960px-/, `/${width}px-`)
}

// What to look up for a city or place: the article title, and how far the article's own
// coordinates may be from ours before we decide it's a different thing.
export function photoSubject(kind, item) {
  if (kind === 'city') return { key: `city:${item.id}`, title: cityWikiTitles[item.id] || item.name, lat: item.lat, lng: item.lng, maxKm: 30, needCoords: false }
  const override = placeWikiTitles[item.id]
  if (override === null) return null
  const title = override || item.wiki || item.name
  const wide = item.category === 'outdoors'
  return { key: `place:${item.id}`, title, lat: item.lat, lng: item.lng, maxKm: wide ? 15 : 4, needCoords: !override && !item.wiki }
}

const stripHtml = (html) => {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
  return text.replace(/\s+/g, ' ').trim()
}

const queue = new Map() // key -> { subject, resolve: [] }
const inflight = new Map() // key -> promise
let timer = null

async function lookup(subjects) {
  const titles = subjects.map((s) => s.title)
  const data = await fetchJSON(
    `${WIKI_API}?${new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      origin: '*',
      redirects: '1',
      prop: 'pageimages|coordinates|info',
      inprop: 'url',
      piprop: 'thumbnail|name',
      pithumbsize: '960',
      pilicense: 'free',
      colimit: 'max',
      titles: titles.join('|'),
    })}`,
  )
  const q = data.query || {}
  // Follow the title through normalisation ("musée d'orsay" → "Musée d'Orsay") and redirects.
  const hop = (list, t) => list?.find((n) => n.from === t)?.to || t
  const pages = Object.fromEntries((q.pages || []).map((p) => [p.title, p]))

  const found = new Map()
  for (const s of subjects) {
    const page = pages[hop(q.redirects, hop(q.normalized, s.title))]
    if (!page || page.missing || !page.thumbnail || !page.pageimage || SKIP_FILE.test(page.pageimage)) continue
    const c = page.coordinates?.[0]
    if (c) {
      if (distanceKm({ lat: c.lat, lng: c.lon }, s) > s.maxKm) continue
    } else if (s.needCoords) continue
    found.set(s.key, { page, file: page.pageimage })
  }
  if (found.size === 0) return new Map()

  // Credits: who took the photo and under which licence.
  const files = [...new Set([...found.values()].map((f) => f.file))]
  const meta = await fetchJSON(
    `${COMMONS_API}?${new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      origin: '*',
      prop: 'imageinfo',
      iiprop: 'extmetadata|url',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Credit',
      titles: files.map((f) => `File:${f}`).join('|'),
    })}`,
  ).catch(() => null)
  const norm = (t) => t.replace(/^File:/, '').replace(/ /g, '_')
  const info = Object.fromEntries((meta?.query?.pages || []).map((p) => [norm(p.title), p.imageinfo?.[0]]))

  const out = new Map()
  for (const [key, { page, file }] of found) {
    const ii = info[norm(file)]
    const md = ii?.extmetadata || {}
    // Without licence details we can't credit the photo properly, so it isn't used.
    if (!ii || !md.LicenseShortName?.value) continue
    out.set(key, {
      src: page.thumbnail.source,
      width: page.thumbnail.width,
      height: page.thumbnail.height,
      thumbnail: /\/thumb\//.test(page.thumbnail.source),
      artist: stripHtml(md.Artist?.value) || 'Unknown photographer',
      license: stripHtml(md.LicenseShortName.value),
      licenseUrl: md.LicenseUrl?.value || null,
      fileUrl: ii.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
      article: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    })
  }
  return out
}

async function flush() {
  timer = null
  const batch = [...queue.values()].slice(0, BATCH)
  batch.forEach((b) => queue.delete(b.subject.key))
  if (queue.size) timer = setTimeout(flush, 0)
  try {
    const photos = await lookup(batch.map((b) => b.subject))
    for (const b of batch) {
      const photo = photos.get(b.subject.key) || null
      cache.set(b.subject.key, photo, photo ? undefined : 7) // "no photo" is re-checked after a week
      b.resolve.forEach(([ok]) => ok(photo))
    }
  } catch (e) {
    // Not cached, so it's tried again next time.
    batch.forEach((b) => b.resolve.forEach(([, fail]) => fail(e)))
  }
}

export function loadPhoto(subject) {
  const cached = cache.get(subject.key)
  if (cached !== undefined) return Promise.resolve(cached)
  if (inflight.has(subject.key)) return inflight.get(subject.key)
  const promise = new Promise((ok, fail) => {
    const entry = queue.get(subject.key) || { subject, resolve: [] }
    entry.resolve.push([ok, fail])
    queue.set(subject.key, entry)
    if (!timer) timer = setTimeout(flush, 40)
  }).finally(() => inflight.delete(subject.key))
  inflight.set(subject.key, promise)
  return promise
}

// { status: 'loading' | 'ready' | 'none' | 'error', photo }
export function usePhoto(kind, item) {
  const subject = item && !item.image ? photoSubject(kind, item) : null
  const key = subject?.key
  const initial = () => {
    if (!subject) return { status: 'none', photo: null }
    const cached = cache.get(subject.key)
    return cached === undefined ? { status: 'loading', photo: null } : { status: cached ? 'ready' : 'none', photo: cached }
  }
  const [state, setState] = useState(initial)
  useEffect(() => {
    if (!subject) return setState({ status: 'none', photo: null })
    let live = true
    setState(initial())
    loadPhoto(subject).then(
      (photo) => live && setState({ status: photo ? 'ready' : 'none', photo }),
      () => live && setState({ status: 'error', photo: null }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}
