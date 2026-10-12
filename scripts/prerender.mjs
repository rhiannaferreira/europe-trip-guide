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
import { tripTemplates, templateDayCount, templatePath } from '../src/data/tripTemplates.js'
import { CITY_DAYS, TEMPLATE_DETAILS } from '../src/data/templateDays.js'
import { IDEAS_META, templateMeta } from '../src/templates/templateMeta.js'
import { tripLegs } from '../src/lib/trip.js'
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

const nav = `<nav class="prerender-nav"><a href="/">Eurowander</a> · <a href="/explore">Explore</a> · <a href="/build">Build a trip</a> · <a href="/trip-ideas">Trip ideas</a> · <a href="/trip">My trip</a></nav>`

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

write(
  'build.html',
  page({
    title: 'Build my Europe trip',
    description: 'Get a Europe trip drafted from your dates, interests and pace: cities in a sensible order, nights per stop, train times, day plans and a rough budget, all editable.',
    path: '/build',
    body: `<main class="prerender">${nav}<h1>Build my Europe trip</h1><p>Tell Eurowander your dates, interests, pace and budget, or leave them blank, and get a whole route: cities in order, nights in each, journey times, a plan for every day and a rough budget. Then replace cities, change nights or ask for a more relaxed version.</p></main>`,
  }),
)

// Ready-made trips: the list, and a page per trip with its route, nights, journeys and day ideas.
const cityName = (id) => cities.find((c) => c.id === id).name
write(
  'trip-ideas.html',
  page({
    ...IDEAS_META,
    body: `<main class="prerender">${nav}<h1>Ready-made Europe trips</h1><p>${esc(IDEAS_META.description)}</p><ul>${tripTemplates
      .map((t) => `<li><a href="${templatePath(t)}">${esc(t.title)}</a>: ${esc(t.stops.map((s) => cityName(s.cityId)).join(' → '))}. ${esc(t.description)}</li>`)
      .join('')}</ul></main>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Ready-made Europe trips',
      itemListElement: tripTemplates.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE_URL + templatePath(t), name: t.title })),
    },
  }),
)
for (const t of tripTemplates) {
  const meta = templateMeta(t)
  const legs = tripLegs(t.stops.map((s) => s.cityId))
  const details = TEMPLATE_DETAILS[t.id] || { intro: t.description, highlights: [] }
  let day = 1
  const stops = t.stops.map((s, i) => {
    const from = day
    const to = day + s.nights - 1
    day += s.nights
    const outline = (CITY_DAYS[s.cityId] || []).slice(0, s.nights)
    const leg = legs[i]
    return `<li><h3>${esc(cityName(s.cityId))}: ${from === to ? `day ${from}` : `days ${from}–${to}`} (${s.nights} night${s.nights === 1 ? '' : 's'})</h3><ul>${outline
      .map((d) => `<li><strong>${esc(d.title)}</strong>${d.ideas.length ? `: ${esc(d.ideas.join(', '))}` : ''}</li>`)
      .join('')}</ul>${leg ? `<p>Then ${leg.mode === 'bus' ? 'bus' : 'train'} to ${esc(leg.to.name)}, about ${formatDuration(leg.minutes)} (typical time).</p>` : ''}</li>`
  })
  const body = `<main class="prerender">${nav}
<h1>${esc(t.title)}</h1>
<p><strong>${esc(t.stops.map((s) => cityName(s.cityId)).join(' → '))}</strong> · ${templateDayCount(t)} days</p>
<p>${esc(details.intro)}</p>
${details.highlights.length ? `<h2>Highlights</h2><ul>${details.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
<h2>Day by day</h2><ol>${stops.join('')}<li><h3>Day ${templateDayCount(t)}</h3><p>Departure, or a free day.</p></li></ol>
<p><a href="/trip-ideas">More trip ideas</a> · <a href="/build">Build your own trip</a></p></main>`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristTrip',
        name: t.title,
        description: meta.description,
        url: SITE_URL + meta.path,
        touristType: t.tags,
        itinerary: { '@type': 'ItemList', itemListElement: t.stops.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'City', name: cityName(s.cityId), url: `${SITE_URL}/city/${s.cityId}` } })) },
      },
      crumbs([['Eurowander', '/'], ['Trip ideas', '/trip-ideas'], [t.title, meta.path]]),
    ],
  }
  write(`trip-ideas/${t.slug}.html`, page({ ...meta, body, jsonLd }))
}

// The app's private pages get a file too, so opening or refreshing them never depends on the
// catch-all rewrite. They hold personal trip data, so search engines are asked to skip them.
const noindex = (html) => html.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>')
write('trip.html', noindex(page({ title: 'My trip', description: DEFAULT_DESCRIPTION, path: '/trip', body: '' })))
write('travel.html', noindex(page({ title: 'Travel Mode', description: 'Your trip today: what’s next, nearby places, weather and the plan, on your phone.', path: '/travel', body: '' })))

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
const urls = ['/', '/build', '/explore', '/trip-ideas', ...tripTemplates.map(templatePath), ...countries.map((c) => countryMeta(c.code).path), ...cities.map((c) => cityMeta(c).path)]
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
// Shared trip links carry private notes and are never worth indexing.
// `Disallow: /trip` would also match /trip-ideas, so the trip ideas are allowed by name (the longer rule wins).
write('robots.txt', `User-agent: *\nAllow: /\nAllow: /trip-ideas\nDisallow: /trip\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`prerender: ${cities.length} city pages, ${countries.length} country pages, ${tripTemplates.length} trip ideas, sitemap with ${urls.length} URLs`)

