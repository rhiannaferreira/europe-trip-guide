// Browser checks for Travel Mode, run in CI against `vite preview`. Prints PASS/FAIL lines and saves screenshots.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'screens'
fs.mkdirSync(OUT, { recursive: true })
const results = []
const ok = (name, cond, extra = '') => { results.push([cond, name]); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ` :: ${extra}` : ''}`) }

const trip = (itinerary = {}, dates = ['2026-06-15', '2026-06-20']) => ({
  version: 3, name: 'Summer in Europe', startDate: dates[0], endDate: dates[1],
  stops: [
    { cityId: 'london', auto: false, placeIds: ['london-british-museum', 'london-tower'], days: 2 },
    { cityId: 'paris', auto: false, placeIds: ['paris-louvre', 'paris-tuileries', 'paris-orsay', 'paris-marche-enfants-rouges', 'paris-concorde', 'paris-seine-walk'], days: 2 },
    { cityId: 'athens', auto: false, placeIds: ['athens-acropolis'], days: 2 },
  ],
  statuses: { 'london-british-museum': 'want', 'london-tower': 'want', 'paris-louvre': 'want', 'paris-tuileries': 'want', 'paris-orsay': 'saved', 'paris-marche-enfants-rouges': 'want', 'paris-concorde': 'want', 'paris-seine-walk': 'want', 'athens-acropolis': 'want' },
  itinerary, notes: { trip: 'Eurostar booked. Hotel near Gare du Nord.', cities: { paris: 'Museum pass in bag.' } },
})
const BUSY = {
  1: { placeIds: ['london-british-museum'], note: '' },
  3: { placeIds: ['london-tower', 'paris-concorde'], note: '' },
  4: { placeIds: ['paris-louvre', 'paris-tuileries', 'paris-marche-enfants-rouges', 'paris-seine-walk'], note: 'Rest before dinner' },
  5: { placeIds: ['athens-acropolis'], note: '' },
}

function hourly(day, rainFrom = 15, rainTo = 17) {
  const time = []; const temperature_2m = []; const weather_code = []; const precipitation_probability = []
  for (const d of [day, day.replace(/\d\d$/, (x) => String(Number(x) + 1).padStart(2, '0'))]) for (let h = 0; h < 24; h++) {
    time.push(`${d}T${String(h).padStart(2, '0')}:00`); temperature_2m.push(16 + Math.round(8 * Math.sin((h - 6) / 24 * Math.PI)))
    const wet = d === day && h >= rainFrom && h < rainTo
    weather_code.push(wet ? 61 : 2); precipitation_probability.push(wet ? 70 : 10)
  }
  return { current: { temperature_2m: 23.6, weather_code: 2 }, hourly: { time, temperature_2m, weather_code, precipitation_probability } }
}
function daily(start) {
  const time = []; for (let i = 0; i < 16; i++) { const d = new Date(`${start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); time.push(d.toISOString().slice(0, 10)) }
  return { daily: { time, weather_code: time.map(() => 3), temperature_2m_max: time.map(() => 24), temperature_2m_min: time.map(() => 15), precipitation_probability_max: time.map((_, i) => (i === 1 ? 60 : 10)) } }
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

async function open({ name, tripData, time, path = '/travel', tz = 'America/New_York', viewport = { width: 390, height: 844 }, weather = 'ok', ai = 'off', geo = null }) {
  const browser = open.browser ||= await chromium.launch()
  const context = await browser.newContext({ viewport, timezoneId: tz, locale: 'en-GB', serviceWorkers: 'block', ...(geo ? { geolocation: geo, permissions: ['geolocation'] } : {}) })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()))
  await page.clock.install({ time: new Date(time) })
  await page.route(/api\.open-meteo\.com/, (r) => {
    if (weather === 'fail') return r.fulfill({ status: 503, body: 'down' })
    const u = new URL(r.request().url())
    if (u.searchParams.get('hourly')) return r.fulfill({ json: hourly(time.slice(0, 10)) })
    return r.fulfill({ json: daily(time.slice(0, 10)) })
  })
  await page.route(/overpass-api|wikipedia|wikimedia|wikidata/, (r) => r.fulfill({ json: { elements: [], query: { pages: {} } } }))
  await page.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: PNG, contentType: 'image/png' }))
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.fulfill({ body: '', contentType: 'text/css' }))
  await page.route('**/api/assistant', (r) => (ai === 'off' ? r.fulfill({ status: 404, json: { enabled: false } }) : r.continue()))
  await page.addInitScript((t) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); if (t) localStorage.setItem('travel-app-trip', JSON.stringify(t)); localStorage.setItem('travel-app-copilot', JSON.stringify({ introSeen: true })); sessionStorage.setItem('seeded', '1') } }, tripData)
  await page.goto(BASE + path)
  await page.waitForTimeout(800)
  return { page, context, errors, shot: async (file) => page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true }) }
}
const text = (page) => page.locator('body').innerText()
const axe = async (page, name) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('.leaflet-container').analyze()
  ok(`axe ${name}: no violations`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`).join('; '))
}

// 1. Middle of the trip, phone on New York time, 10:00 in Paris, rain this afternoon.
{
  const { page, errors, shot, context } = await open({ name: 'active', tripData: trip(BUSY), time: '2026-06-18T08:00:00Z' })
  const t = await text(page)
  ok('active: shows Paris and day 4', /PARIS/.test(t) && /Day 4 of 6/.test(t), t.slice(0, 200))
  ok('active: local time is Paris time, not the phone', /10:00/.test(t) && /your phone shows 04:00/.test(t))
  ok('active: next up is the Louvre at 09:30 (now)', /NOW|Now/.test(t) && /Louvre Museum/.test(t))
  ok('active: weather shown', /24°C|23°C/.test(t) && /Partly cloudy/.test(t))
  ok('active: rain warning', /Rain likely 15:00–17:00/.test(t), t.match(/Rain[^\n]*/g)?.join(' | '))
  ok('active: rain affects outdoor plans', /Rain may affect/.test(t))
  ok('active: tomorrow preview', /Tomorrow/i.test(t) && /Athens/.test(t))
  await shot('01-active-today')
  await axe(page, 'active today')
  // Done and skip
  await page.getByRole('button', { name: 'Mark Louvre Museum done' }).click()
  ok('done: progress updates', /1 of 4 completed/.test(await text(page)))
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-app-trip')).itinerary['4'])
  ok('done: stored on the real trip', saved.done?.includes('paris-louvre'), JSON.stringify(saved))
  await page.getByRole('button', { name: 'Skip Tuileries Garden' }).click()
  await shot('02-skip-dialog')
  await page.getByRole('button', { name: 'Skip only' }).click()
  ok('skip: marked skipped, not deleted', /Skipped/.test(await text(page)) && /Tuileries Garden/.test(await text(page)))
  // Move to another day via the stop's sheet
  await page.getByRole('button', { name: /Edit, move or ask about Marché des Enfants Rouges/ }).click()
  await page.waitForTimeout(200)
  await shot('03-activity-sheet')
  await page.getByLabel('Move to another day').selectOption('3')
  ok('move: confirmation', /now on day 3/.test(await text(page)))
  await page.getByRole('button', { name: 'Done' }).click()
  const it = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-app-trip')).itinerary)
  ok('move: planning trip shows it on day 3', it['3'].placeIds.includes('paris-marche-enfants-rouges') && !it['4'].placeIds.includes('paris-marche-enfants-rouges'))
  // Nearby without location
  await page.getByRole('button', { name: /Lunch/ }).first().click()
  await page.waitForTimeout(300)
  const nt = await text(page)
  ok('nearby: falls back to the next activity and says so', /Near .*not your location/.test(nt), nt.match(/Near[^\n]*/)?.[0])
  ok('nearby: lists places with distances', /min walk/.test(nt))
  await shot('04-nearby-no-location')
  await page.keyboard.press('Escape')
  // Map tab
  await page.getByRole('button', { name: 'Map' }).last().click()
  await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  ok('map: renders with today’s stops', (await page.locator('.tm-maplist li').count()) >= 2)
  await shot('05-map')
  // Trip and More tabs
  await page.locator('.tm-nav').getByRole('button', { name: 'Trip' }).click()
  const tt = await text(page)
  ok('trip tab: days, transport, notes, tips', /Day 6/.test(tt) && /Transportation/.test(tt) && /Eurostar booked/.test(tt) && /travel tips/.test(tt))
  await shot('06-trip-tab')
  await axe(page, 'trip tab')
  await page.locator('.tm-nav').getByRole('button', { name: 'More' }).click()
  ok('more tab: 112', /112/.test(await text(page)))
  await shot('07-more-tab')
  await axe(page, 'more tab')
  // Copilot quick action with no AI available
  await page.locator('.tm-nav').getByRole('button', { name: 'Today' }).click()
  await page.getByRole('button', { name: 'I’m tired' }).click()
  await page.waitForTimeout(1500)
  const ct = await page.locator('#ask-panel').innerText()
  ok('copilot: opens with the tired request and proposes a lighter today', /I’m tired/.test(ct) && /(Apply|lighter|less busy|Lighten|Day 4|Thursday)/i.test(ct), ct.slice(0, 400))
  await shot('08-copilot-tired')
  await page.locator('#ask-panel textarea').fill('What should we do next?')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)
  const ct2 = await page.locator('#ask-panel').innerText()
  ok('copilot: "what next" answers from today without AI', /Next up/.test(ct2), ct2.slice(-400))
  await shot('09-copilot-next')
  // Offline
  await page.locator('#ask-panel').getByRole('button', { name: 'Close the assistant' }).click()
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(500)
  const ot = await text(page)
  ok('offline: says so and keeps the plan', /You’re offline/.test(ot) && /Louvre Museum/.test(ot))
  ok('offline: weather is labelled as saved', /Saved forecast from/.test(ot), ot.match(/forecast[^\n]*/gi)?.join(' | '))
  await shot('10-offline')
  ok('active: no page errors', errors.length === 0, errors.join(' | '))
}

// 2. Location granted
{
  const { page, shot, errors } = await open({ tripData: trip(BUSY), time: '2026-06-18T08:00:00Z', geo: { latitude: 48.8606, longitude: 2.3376 } })
  await page.getByRole('button', { name: '☕ Coffee' }).first().click().catch(() => {})
  await page.getByRole('button', { name: /Use my location/ }).click()
  await page.waitForTimeout(500)
  ok('location granted: nearby uses your location', /Near your location/.test(await text(page)))
  await shot('11-nearby-location')
  ok('location: no page errors', errors.length === 0, errors.join(' | '))
}

// 3. Travel day (London → Paris) with a train time, early morning in London
{
  const t = trip(BUSY); t.itinerary['3'].depart = '09:01'
  const { page, shot } = await open({ tripData: t, time: '2026-06-17T06:30:00Z', tz: 'Europe/Paris' })
  const x = await text(page)
  ok('travel day: recognised', /Travel day/i.test(x) && /London/.test(x) && /Paris/.test(x))
  ok('travel day: before and after the train', /Before the train/i.test(x) && /After arriving/i.test(x), x.slice(0, 600))
  ok('travel day: departure and arrival estimate', /09:01 → ~11:17/.test(x))
  ok('travel day: no live status faked', /aren’t in Eurowander/.test(x))
  await shot('12-travel-day')
}

// 4. Trip starts today, 23:30 UTC = 00:30 in London
{
  const { page } = await open({ tripData: trip(BUSY), time: '2026-06-14T23:30:00Z', tz: 'America/Los_Angeles' })
  ok('starts today in London even though the phone says the 14th', /Day 1 of 6/.test(await text(page)))
}

// 5. Final day in Athens and completed
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-20T20:30:00Z' })
  ok('final day: Athens day 6 at 23:30', /ATHENS/.test(await text(page)) && /Day 6 of 6/.test(await text(page)) && /last day/.test(await text(page)))
  await shot('13-final-day')
}
{
  const t = trip(BUSY); t.itinerary['4'].done = ['paris-louvre']
  const { page, shot } = await open({ tripData: t, time: '2026-06-25T10:00:00Z' })
  const x = await text(page)
  ok('completed: read-only history', /This trip is over/.test(x) && !/Mark .* done/.test(await page.locator('main').innerHTML()))
  await shot('14-completed')
}

// 6. Future trip preview
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-01T10:00:00Z' })
  const x = await text(page)
  ok('preview: banner and day 1', /Preview/.test(x) && /starts in 14 days/.test(x) && /LONDON/.test(x))
  await page.getByRole('button', { name: /Next day, day 2/ }).click()
  ok('preview: can move between days', /Day 2 of 6/.test(await text(page)))
  await shot('15-preview')
  await axe(page, 'preview')
}

// 7. No itinerary today, weather API failure
{
  const t = trip({}); 
  const { page, shot, errors } = await open({ tripData: t, time: '2026-06-18T13:00:00Z', weather: 'fail' })
  const x = await text(page)
  ok('empty day: open afternoon', /Your afternoon is open/.test(x))
  ok('weather failure: says so, no fake weather', /Couldn’t load the weather/.test(x) && !/°C/.test(x))
  await shot('16-empty-day-weather-fail')
  ok('empty day: no page errors', errors.length === 0, errors.join(' | '))
}

// 8. Single activity, desktop size
{
  const { page, shot } = await open({ tripData: trip({ 4: { placeIds: ['paris-orsay'], note: '' } }), time: '2026-06-18T07:00:00Z', viewport: { width: 1280, height: 900 } })
  ok('single activity: next up Orsay', /Musée d'Orsay/.test(await text(page)))
  await shot('17-desktop')
}

// 9. Entry points: My trip panel and landing page
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-18T08:00:00Z', path: '/trip', viewport: { width: 1280, height: 900 } })
  ok('my trip: "Your trip is happening now" + Enter Travel Mode', /Your trip is happening now/.test(await text(page)) && (await page.getByRole('link', { name: /Enter Travel Mode/ }).count()) > 0)
  await shot('18-mytrip-entry')
  await page.getByRole('link', { name: /Enter Travel Mode/ }).click()
  await page.waitForTimeout(800)
  ok('entry: opens Travel Mode', /Day 4 of 6/.test(await text(page)))
  // Planning shows the time and done marks set in Travel Mode
}
{
  const t = trip(BUSY); t.itinerary['4'].times = { 'paris-louvre': '09:15' }; t.itinerary['4'].done = ['paris-louvre']
  const { page, shot } = await open({ tripData: t, time: '2026-06-18T08:00:00Z', path: '/trip', viewport: { width: 1280, height: 900 } })
  await page.getByRole('tab', { name: /Days/ }).click()
  await page.waitForTimeout(300)
  const x = await text(page)
  ok('planning: shows travel mode time and done', /09:15/.test(x) && /✓ Done/.test(x))
  await shot('19-planning-days')
}
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-01T08:00:00Z', path: '/trip', viewport: { width: 1280, height: 900 } })
  ok('my trip: upcoming shows Preview Travel Mode', (await page.getByRole('link', { name: /Preview Travel Mode/ }).count()) > 0)
}
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-18T08:00:00Z', path: '/' })
  ok('landing: shows Enter Travel Mode while travelling', (await page.getByRole('link', { name: /Enter Travel Mode/ }).count()) > 0)
  await shot('20-landing-entry')
}
// 10. No trip
{
  const { page, shot } = await open({ tripData: null, time: '2026-06-18T08:00:00Z' })
  ok('no trip: friendly empty state', /Start with a trip/.test(await text(page)))
}
// 11. Dark mode
{
  const { page, shot } = await open({ tripData: trip(BUSY), time: '2026-06-18T08:00:00Z' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(200)
  await shot('21-dark')
  await axe(page, 'dark today')
}

await open.browser?.close()
const failed = results.filter(([c]) => !c)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
fs.writeFileSync(`${OUT}/results.txt`, results.map(([c, n]) => `${c ? 'PASS' : 'FAIL'} ${n}`).join('\n'))
