// After `vite build`: writes a static HTML page for every city and country (dist/city/paris.html,
// dist/country/it.html) with its own title, description, social preview tags, structured data and
// a readable summary, plus sitemap.xml and robots.txt. Search engines and link previews read
// these directly; people get the same page, and the app takes over as soon as its script loads.
// Vercel serves dist/city/paris.html at /city/paris (cleanUrls in vercel.json).
import fs from 'node:fs'
import path from 'node:path'
import { cities, citiesInCountry, hiddenGemsFor } from '../src/data/cities.js'
import { countries, countryByCode } from '../src/data/countries.js'
import { placesInCity } from '../src/data/places.js'
import { interestById } from '../src/data/interests.js'
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '../src/lib/meta.js'
import { cityMeta, countryMeta } from '../src/lib/pageMeta.js'
import { connectionsFrom } from '../src/utils/cityInfo.js'
import { formatDuration } from '../src/lib/format.js'

const dist = path.resolve('dist')
const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page({ title, description, path: p, body, jsonLd }) {
  const full = `${title} · ${SITE_NAME}`
  const url = SITE_URL + p
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(full)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  if (jsonLd) html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`)
  return html
}

function write(rel, html) {
  const file = path.join(dist, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, html)
}

const crumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + p })),
})

const nav = `<nav class="prerender-nav"><a href="/">Eurowander</a> · <a href="/explore">Explore</a> · <a href="/trip">My trip</a></nav>`

for (const city of cities) {
  const meta = cityMeta(city)
  const country = countryByCode[city.country]
  const places = placesInCity(city.id)
  const gems = hiddenGemsFor(city)
  const trains = connectionsFrom(city.id).slice(0, 6)
  const body = `<main class="prerender">${nav}
<h1>${esc(city.name)}, ${esc(country.name)} ${country.flag}</h1>
<p>${esc(meta.description)}</p>
<h2>Places to see in ${esc(city.name)}</h2>
<ul>${places.map((p) => `<li><strong>${esc(p.name)}</strong> (${esc(interestById[p.category].label)}): ${esc(p.description)}</li>`).join('')}</ul>
${gems.length ? `<h2>Hidden gems near ${esc(city.name)}</h2><ul>${gems.map((g) => `<li><a href="/city/${g.id}">${esc(g.name)}</a>: ${esc(g.description)}</li>`).join('')}</ul>` : ''}
${trains.length ? `<h2>Trains from ${esc(city.name)}</h2><ul>${trains.map((t) => `<li><a href="/city/${t.city.id}">${esc(t.city.name)}</a>: about ${formatDuration(t.minutes)} (estimate)</li>`).join('')}</ul>` : ''}
<p><a href="/country/${city.country.toLowerCase()}">More in ${esc(country.name)}</a> · <a href="/explore">Plan a trip</a></p></main>`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristDestination',
        name: city.name,
        description: city.description,
        url: SITE_URL + meta.path,
        geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng },
        containedInPlace: { '@type': 'Country', name: country.name },
        includesAttraction: places.map((p) => ({
          '@type': 'TouristAttraction',
          name: p.name,
          description: p.description,
          geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
        })),
      },
      crumbs([['Eurowander', '/'], [country.name, `/country/${city.country.toLowerCase()}`], [city.name, meta.path]]),
    ],
  }
  write(`city/${city.id}.html`, page({ ...meta, body, jsonLd }))
}

for (const country of countries) {
  const meta = countryMeta(country.code)
  const list = citiesInCountry(country.code)
  const body = `<main class="prerender">${nav}
<h1>${esc(country.name)} ${country.flag}</h1>
<p>${esc(meta.description)}</p>
<ul>${list.map((c) => `<li><a href="/city/${c.id}">${esc(c.name)}</a>${c.hiddenGem ? ' (hidden gem)' : ''}: ${esc(c.description)}</li>`).join('')}</ul>
<p><a href="/explore">Plan a trip across Europe</a></p></main>`
  const jsonLd = { '@context': 'https://schema.org', ...crumbs([['Eurowander', '/'], [country.name, meta.path]]) }
  write(`country/${country.code.toLowerCase()}.html`, page({ ...meta, body, jsonLd }))
}

write(
  'explore.html',
  page({
    title: 'Explore Europe',
    description: DEFAULT_DESCRIPTION,
    path: '/explore',
    body: `<main class="prerender">${nav}<h1>Explore Europe</h1><ul>${countries.map((c) => `<li><a href="/country/${c.code.toLowerCase()}">${esc(c.name)}</a></li>`).join('')}</ul></main>`,
  }),
)

// The home page: site-wide structured data.
write(
  'index.html',
  shell.replace(
    '</head>',
    `    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL + '/',
      description: DEFAULT_DESCRIPTION,
    })}</script>\n  </head>`,
  ),
)

const today = new Date().toISOString().slice(0, 10)
const urls = ['/', '/explore', ...countries.map((c) => countryMeta(c.code).path), ...cities.map((c) => cityMeta(c).path)]
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
// Shared trip links carry private notes and are never worth indexing.
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /trip\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`prerender: ${cities.length} city pages, ${countries.length} country pages, sitemap with ${urls.length} URLs`)

