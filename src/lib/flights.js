// Flying instead of the train on a long leg: which airports, a rough door-to-door time, and a link to search
// real flights. No fares or schedules here: those need a flight data provider (see notes on Travelpayouts).
//
// Rules:
//   time     the planner's flight estimate (planner/transport.js flightMinutes: 700 km/h plus 3 hours for
//            take-off, landing and airports), plus the extra drive when an airport is over 40 km out.
//   offered  when both cities have an airport, the cities are 400 km or more apart and flying saves at
//            least 90 minutes over the ground journey, or when the leg is already a flight.
import { airportsFor } from '../data/airports.js'
import { flightMinutes } from '../planner/transport.js'

export const MIN_FLIGHT_KM = 400
export const MIN_SAVING_MINUTES = 90
const NEAR_KM = 40

// Over 40 km out, each extra km adds about a minute of road or rail to reach the airport.
const extraTransfer = (list) => Math.max(0, (list[0]?.km || 0) - NEAR_KM)

export function flightOption(leg) {
  if (!leg?.from || !leg?.to) return null
  const fromAirports = airportsFor(leg.from.id)
  const toAirports = airportsFor(leg.to.id)
  if (!fromAirports.length || !toAirports.length) return null
  const isFlight = leg.mode === 'flight'
  const groundMinutes = isFlight ? leg.groundMinutes : leg.minutes
  const minutes = flightMinutes(leg.km) + extraTransfer(fromAirports) + extraTransfer(toAirports)
  // Same airport at both ends (Rouen and Reims both use Paris CDG): no flight.
  if (fromAirports[0].code === toAirports[0].code) return null
  if (!isFlight && (leg.km < MIN_FLIGHT_KM || !groundMinutes || groundMinutes - minutes < MIN_SAVING_MINUTES)) return null
  return { fromAirports, toAirports, minutes, groundMinutes, saves: groundMinutes ? groundMinutes - minutes : 0 }
}

const codes = (list) => list.map((a) => a.code).join(', ')
export const airportText = (city, list) => `${city.name} (${codes(list)})`

// A flight search for the leg's cities and date on Google Flights. A plain link out: nothing is fetched here.
export function flightSearchUrl(leg, date = '') {
  const q = `Flights from ${leg.from.name} to ${leg.to.name}${date ? ` on ${date}` : ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}
