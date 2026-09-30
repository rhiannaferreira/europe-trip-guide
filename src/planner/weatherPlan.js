// Weather-aware suggestions for a day plan.
//
// Only real forecasts (Open-Meteo, up to 16 days ahead) lead to suggestions:
//   a wet day   rain chance 60% or more, or a rain / shower / thunderstorm forecast
//   a dry day   rain chance under 30% and no rain in the forecast
// On a wet day, an outdoor plan (park, garden, viewpoint, walk, outdoors category) is swapped with an
// indoor one (museum) on a dry day in the same city, or just moved to a dry day when there's no indoor one.
// Further ahead, last year's weather on the same dates is summarised as seasonal information only, and
// with no weather data at all the city's usual seasons are used. Neither ever moves anything.
import { cityById } from '../data/cities.js'
import { placeById } from '../data/places.js'
import { monthNames } from '../lib/format.js'

const OUTDOOR_TYPES = new Set(['park', 'garden', 'viewpoint', 'walk', 'beach'])
const isOutdoor = (p) => p && (p.category === 'outdoors' || OUTDOOR_TYPES.has(p.type))
const isIndoor = (p) => p && p.category === 'museums'
const rainCode = (code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 99)

export function classifyForecast(w) {
  if (!w || w.kind !== 'forecast') return null
  if ((w.rain ?? 0) >= 60 || rainCode(w.code)) return 'wet'
  if ((w.rain ?? 100) < 30 && !rainCode(w.code)) return 'dry'
  return 'mixed'
}

const dayName = (d) => (d.date ? new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Day ${d.number}`)

// Suggestions: [{ id, wetDay, dryDay, outPlaceId, inPlaceId, text }]
export function rainSuggestions(dayPlans, weatherByDay = {}, { getPlace = (id) => placeById[id] } = {}) {
  const out = []
  const used = new Set()
  for (const wet of dayPlans) {
    if (classifyForecast(weatherByDay[wet.number]) !== 'wet') continue
    const outdoor = wet.items.map((it) => getPlace(it.placeId)).filter(isOutdoor)
    for (const p of outdoor) {
      if (used.has(p.id)) continue
      const dryDays = dayPlans.filter((d) => d.cityId === wet.cityId && d.number !== wet.number && classifyForecast(weatherByDay[d.number]) === 'dry')
      if (!dryDays.length) continue
      const withIndoor = dryDays
        .map((d) => ({ d, indoor: d.items.map((it) => getPlace(it.placeId)).find((q) => isIndoor(q) && !used.has(q.id)) }))
        .find((x) => x.indoor)
      const dry = withIndoor?.d || dryDays[0]
      const indoor = withIndoor?.indoor || null
      used.add(p.id)
      if (indoor) used.add(indoor.id)
      const city = cityById[wet.cityId].name
      out.push({
        id: `${wet.number}-${p.id}`,
        wetDay: wet.number,
        dryDay: dry.number,
        outPlaceId: p.id,
        inPlaceId: indoor?.id || null,
        text: indoor
          ? `Rain expected ${dayName(wet)} in ${city}. Move ${p.name} to ${dayName(dry)}, and ${indoor.name} to ${dayName(wet)}.`
          : `Rain expected ${dayName(wet)} in ${city}. Move ${p.name} to ${dayName(dry)}, which looks drier.`,
      })
    }
  }
  return out
}

// Apply one suggestion to the day plans (swaps the two places' positions, or moves the outdoor one).
export function applyRainSuggestion(dayPlans, s) {
  const wet = dayPlans.find((d) => d.number === s.wetDay)
  const dry = dayPlans.find((d) => d.number === s.dryDay)
  if (!wet || !dry) return dayPlans
  const outItem = wet.items.find((it) => it.placeId === s.outPlaceId)
  if (!outItem) return dayPlans
  const inItem = s.inPlaceId ? dry.items.find((it) => it.placeId === s.inPlaceId) : null
  return dayPlans.map((d) => {
    if (d.number === wet.number) {
      return { ...d, items: inItem ? d.items.map((it) => (it === outItem ? { ...inItem, slot: it.slot, reasons: [...inItem.reasons, 'Moved here: indoors on the rainy day'] } : it)) : d.items.filter((it) => it !== outItem) }
    }
    if (d.number === dry.number) {
      return {
        ...d,
        items: inItem
          ? d.items.map((it) => (it === inItem ? { ...outItem, slot: it.slot, reasons: [...outItem.reasons, 'Moved here: drier forecast'] } : it))
          : [...d.items, { ...outItem, slot: 'afternoon', reasons: [...outItem.reasons, 'Moved here: drier forecast'] }],
      }
    }
    return d
  })
}

// Move every museum onto one day (the assistant's "move museums to the rainy day"), swapping with
// outdoor plans in the same city. Returns { days, summary, changed }.
export function moveCategoryToDay(dayPlans, number, category = 'museums', { getPlace = (id) => placeById[id] } = {}) {
  const target = dayPlans.find((d) => d.number === number)
  if (!target) return { days: dayPlans, summary: `There's no day ${number}.`, changed: false }
  let days = dayPlans
  let moved = 0
  for (const d of dayPlans) {
    if (d.number === number || d.cityId !== target.cityId) continue
    for (const it of d.items) {
      const p = getPlace(it.placeId)
      if (!p || p.category !== category) continue
      const t = days.find((x) => x.number === number)
      const swap = t.items.find((x) => isOutdoor(getPlace(x.placeId)))
      days = applyRainSuggestion(days, { wetDay: number, dryDay: d.number, outPlaceId: swap?.placeId, inPlaceId: p.id })
      if (!swap) {
        // Nothing outdoors to swap: just bring it over.
        days = days.map((x) =>
          x.number === d.number ? { ...x, items: x.items.filter((y) => y.placeId !== p.id) } : x.number === number ? { ...x, items: [...x.items, { ...it, slot: 'afternoon' }] } : x,
        )
      }
      moved++
    }
  }
  return moved
    ? { days, summary: `Moved ${moved} ${category === 'museums' ? 'museum' : 'place'}${moved === 1 ? '' : 's'} to day ${number}.`, changed: true }
    : { days, summary: `No other ${category === 'museums' ? 'museums' : 'places'} in ${cityById[target.cityId].name} to move to day ${number}.`, changed: false }
}

// What the weather data can honestly say about the trip.
// Returns { kind: 'forecast' | 'last-year' | 'seasonal' | 'none', lines: [text] }
export function weatherOutlook(plan, dayPlans, weatherByDay = {}) {
  const numbers = dayPlans.map((d) => d.number)
  const forecast = numbers.filter((n) => weatherByDay[n]?.kind === 'forecast')
  const lastYear = numbers.filter((n) => weatherByDay[n]?.kind === 'last-year')
  const lines = []
  if (forecast.length) {
    const wet = forecast.filter((n) => classifyForecast(weatherByDay[n]) === 'wet')
    lines.push(
      wet.length
        ? `Forecast: rain likely on ${wet.length} of the ${forecast.length} forecast day${forecast.length === 1 ? '' : 's'} (${wet.map((n) => `day ${n}`).join(', ')}).`
        : `Forecast: no heavy rain expected on the ${forecast.length} forecast day${forecast.length === 1 ? '' : 's'}.`,
    )
  }
  if (lastYear.length) {
    const rainy = lastYear.filter((n) => (weatherByDay[n].rain ?? 0) >= 1).length
    lines.push(`Too far ahead for a forecast. Last year on the same dates, ${rainy} of ${lastYear.length} days had at least 1 mm of rain. That's history, not a prediction.`)
  }
  if (lines.length) return { kind: forecast.length ? 'forecast' : 'last-year', lines }
  const month = plan.prefs.month
  if (!month) return { kind: 'none', lines: ['Add a date or month to see weather and seasons.'] }
  const m = monthNames[month - 1]
  const good = []
  const busy = []
  for (const s of plan.stops) {
    const c = cityById[s.cityId]
    if (c.seasons.bestWeather?.includes(month)) good.push(c.name)
    if (c.seasons.busy?.includes(month)) busy.push(c.name)
  }
  if (good.length) lines.push(`${m} is usually a good weather month in ${good.join(', ')}.`)
  if (busy.length) lines.push(`${m} is busy season in ${busy.join(', ')}; book rooms and big sights ahead.`)
  if (!lines.length) lines.push(`${m} is outside the usual best-weather months for these cities; pack for changeable weather.`)
  return { kind: 'seasonal', lines }
}
