// The main railway station for each guide city, as a search text for the station lookup (the station's
// id comes from the live rail service, never from here). Cities with several big stations pick one by
// the direction of travel. null: no passenger trains (go by bus or ferry).
//
// These are only starting points: the traveller can always pick another station.
import { cityById } from './cities.js'

const MAIN = {
  rouen: 'Rouen Rive Droite', reims: 'Reims', chartres: 'Chartres', lyon: 'Lyon Part-Dieu', strasbourg: 'Strasbourg', nice: 'Nice Ville',
  rome: 'Roma Termini', florence: 'Firenze Santa Maria Novella', lucca: 'Lucca', venice: 'Venezia Santa Lucia', chioggia: 'Chioggia', treviso: 'Treviso Centrale', milan: 'Milano Centrale',
  barcelona: 'Barcelona Sants', girona: 'Girona', madrid: 'Madrid Puerta de Atocha', seville: 'Sevilla Santa Justa',
  lisbon: 'Lisboa Santa Apolónia', porto: 'Porto Campanhã', coimbra: 'Coimbra-B',
  berlin: 'Berlin Hbf', leipzig: 'Leipzig Hbf', munich: 'München Hbf', cologne: 'Köln Hbf',
  amsterdam: 'Amsterdam Centraal', utrecht: 'Utrecht Centraal', brussels: 'Bruxelles-Midi', bruges: 'Brugge', ghent: 'Gent-Sint-Pieters',
  zurich: 'Zürich HB', lucerne: 'Luzern', vienna: 'Wien Hbf', graz: 'Graz Hbf', salzburg: 'Salzburg Hbf', prague: 'Praha hlavní nádraží', brno: 'Brno hlavní nádraží',
  athens: 'Athina', thessaloniki: 'Thessaloniki', dubrovnik: null, sibenik: 'Šibenik', split: 'Split',
  york: 'York', edinburgh: 'Edinburgh Waverley', dublin: 'Dublin Heuston', galway: 'Galway Ceannt',
}

// Bearing in degrees from a to b (0 = north, 90 = east).
function bearing(a, b) {
  const r = Math.PI / 180
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r)
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r)
  return ((Math.atan2(y, x) / r) + 360) % 360
}

// Paris and London: the terminal depends on where the train goes.
function byDirection(cityId, toward) {
  const from = cityById[cityId]
  const to = cityById[toward]
  const deg = to ? bearing(from, to) : null
  if (cityId === 'paris') {
    if (deg == null) return 'Paris Gare de Lyon'
    if (deg >= 300 || deg < 55) return 'Paris Gare du Nord' // London, Brussels, Amsterdam, Cologne
    if (deg < 100) return 'Paris Est' // Strasbourg, Germany
    if (deg < 210) return 'Paris Gare de Lyon' // Lyon, Nice, Italy, Switzerland, Barcelona
    return 'Paris Montparnasse' // Bordeaux, the south-west, Chartres
  }
  if (cityId === 'london') {
    if (deg == null) return 'London St Pancras International'
    if (to && ['paris', 'brussels', 'amsterdam', 'bruges', 'ghent', 'utrecht', 'cologne', 'rouen', 'reims'].includes(toward)) return 'London St Pancras International'
    if (deg >= 300 || deg < 30) return 'London Kings Cross' // York, Edinburgh
    if (deg < 330 && deg >= 280) return 'London Euston' // Holyhead for Dublin
    return 'London St Pancras International'
  }
  return null
}

// The search text for a city's station toward another city, or null when it has no trains.
export function stationQuery(cityId, toward = null) {
  if (cityId === 'paris' || cityId === 'london') return byDirection(cityId, toward)
  return Object.hasOwn(MAIN, cityId) ? MAIN[cityId] : cityById[cityId]?.name || null
}

export const hasRail = (cityId) => stationQuery(cityId) !== null
