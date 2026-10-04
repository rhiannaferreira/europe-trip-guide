// What the copilot is told when it's opened from Travel Mode: where the traveller is today, the time there,
// today's plan with what's done and skipped, what's next, the weather the app has, the journey on a travel
// day and saved places nearby. Names and times only: no coordinates, notes or location ever go in.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { placeById } from '../data/places.js'
import { formatDuration } from '../lib/format.js'
import { daySchedule, freeTime, hm, inWords, nextUp, savedNearby } from './travelModel.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SOURCE = { set: 'set by traveller', suggested: 'suggested by Eurowander', train: 'traveller’s train time' }

// `weather`: from travelWeather.weatherForDay, or null. `nowMin`: null when previewing a day that isn't today.
export function travelContext({ trip, status, day, nowMin, weather, online = true, position = null }) {
  if (!day) return null
  const city = cityById[day.cityId]
  const s = daySchedule(trip, day, { nowMin })
  const next = nowMin == null ? null : nextUp(s, nowMin)
  const saved = savedNearby(trip, s, day.cityId)
  const tomorrow = status.days?.find((d) => d.number === day.number + 1)
  const label = (e) => (e.kind === 'journey' ? `${e.leg.mode === 'train' ? 'Train' : e.leg.mode} ${e.leg.from.name} → ${e.leg.to.name}` : e.place.name)
  return {
    mode: status.status === 'active' && nowMin != null ? 'travelling now (Travel Mode)' : status.status === 'completed' ? 'looking back at a finished trip' : 'previewing Travel Mode before the trip',
    city: city.name,
    country: countryByCode[city.country]?.name,
    date: day.iso,
    weekday: WEEKDAYS[day.date.getDay()],
    tripDay: `${day.number} of ${status.days.length}`,
    localTime: nowMin == null ? undefined : hm(nowMin),
    partOfDay: nowMin == null ? undefined : nowMin < 720 ? 'morning' : nowMin < 1020 ? 'afternoon' : nowMin < 1260 ? 'evening' : 'night',
    timeNote: 'All times are local time in the city.',
    online,
    sharedLocation: position ? 'The traveller shared their location for nearby places (not included here).' : undefined,
    today: s.entries.map((e) => ({
      time: e.start == null ? null : hm(e.start),
      timeIs: e.start == null ? 'not set' : SOURCE[e.timeSource],
      what: label(e),
      kind: e.kind === 'journey' ? 'journey' : e.place.type,
      outdoor: e.kind === 'place' ? e.place.category === 'outdoors' || undefined : undefined,
      status: e.state,
    })),
    next: next?.entry ? { place: label(next.entry), time: next.entry.start == null ? null : hm(next.entry.start), startsIn: next.inProgress ? 'now' : next.startsIn == null ? null : inWords(next.startsIn) } : null,
    freeTime: nowMin == null ? undefined : freeTime(s, nowMin).map((g) => `${hm(g.from)}–${hm(g.to)}`),
    travelDay: day.leg
      ? {
          from: day.leg.from.name,
          to: day.leg.to.name,
          mode: day.leg.mode,
          duration: `about ${formatDuration(day.leg.minutes)} (${day.leg.estimated ? 'estimated from distance' : 'Eurowander sample time'})`,
          departs: s.depart == null ? 'not set by the traveller' : hm(s.depart),
          arrivesAbout: s.arrive == null ? undefined : hm(s.arrive),
          liveStatus: 'not available: Eurowander has no live train data',
        }
      : undefined,
    weather: weather
      ? {
          now: weather.now ? `${weather.now.temp}°C, ${weather.now.text}` : undefined,
          range: `${weather.low}–${weather.high}°C`,
          rain: weather.rainText || undefined,
          affectedPlans: weather.affected.map((e) => e.place.name),
          source: weather.fresh ? 'Open-Meteo forecast, fetched just now' : 'Open-Meteo forecast fetched earlier; may be out of date',
        }
      : 'No weather available right now. Don’t guess it.',
    savedNearby: saved ? `${saved.place.name}, about ${saved.walk} min walk from ${saved.anchor.name}` : undefined,
    savedInCity: Object.keys(trip.statuses || {})
      .filter((id) => placeById[id]?.cityId === day.cityId)
      .slice(0, 10)
      .map((id) => placeById[id].name),
    tomorrow: tomorrow ? { city: cityById[tomorrow.cityId].name, travel: tomorrow.leg ? `${tomorrow.leg.from.name} → ${tomorrow.leg.to.name}` : undefined, plans: (trip.itinerary?.[tomorrow.number]?.placeIds || []).length } : undefined,
    openingHours: 'Not in Eurowander’s data.',
  }
}
