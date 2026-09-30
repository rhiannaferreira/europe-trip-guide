// Europe-specific notes for a plan: borders, currencies, plugs, Sundays and seasons, from the country
// tips and city data. General guidance only; entry rules depend on the traveller's passport.
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { getCountryTips } from '../data/countryTips.js'
import { monthNames } from '../lib/format.js'
import { eventsDuringTrip } from '../lib/trip.js'
import { planCityIds, planLegs } from './plan.js'

// Countries in the guide that are outside the Schengen area (passport checks at their borders).
export const NON_SCHENGEN = new Set(['GB', 'IE'])
// Countries in the guide that don't use the euro.
const currencyName = (code) => getCountryTips(code)?.currency || 'Euro (€)'

// Returns [{ id, icon, title, text }]
export function europeNotes(plan) {
  const ids = planCityIds(plan)
  if (!ids.length) return []
  const codes = [...new Set(ids.map((id) => cityById[id].country))]
  const out = []

  const legs = planLegs(plan)
  const crossings = legs.filter((l) => l.from.country !== l.to.country)
  // UK ↔ Ireland is the Common Travel Area, so only Schengen ↔ UK/Ireland crossings have routine checks.
  const checks = crossings.filter((l) => NON_SCHENGEN.has(l.from.country) !== NON_SCHENGEN.has(l.to.country))
  if (crossings.length) {
    out.push({
      id: 'borders',
      icon: '🛂',
      title: `${crossings.length} border crossing${crossings.length === 1 ? '' : 's'}`,
      text: checks.length
        ? `${checks.map((l) => `${l.from.name} → ${l.to.name}`).join(', ')} ${checks.length === 1 ? 'crosses' : 'cross'} into or out of the UK or Ireland, which are outside the Schengen area: expect passport control (on the Eurostar it happens before boarding). Other crossings are usually check-free, but carry your passport. Entry rules depend on your nationality; many visitors need an ETA for the UK and Schengen rules count days across all member countries.`
        : 'All crossings are inside the Schengen area, so there are usually no border checks. Carry your passport anyway; days in Schengen countries count together towards the visa-free limit for many visitors.',
    })
  }

  const currencies = [...new Set(codes.map(currencyName))]
  if (currencies.length > 1) {
    out.push({ id: 'currency', icon: '💱', title: `${currencies.length} currencies`, text: `${currencies.join(', ')}. Cards work almost everywhere; a card without foreign-transaction fees helps.` })
  }

  const plugs = [...new Set(codes.map((c) => getCountryTips(c)?.plugs).filter(Boolean))]
  if (plugs.length) {
    const typeG = codes.some((c) => getCountryTips(c)?.plugs === 'G')
    out.push({
      id: 'plugs',
      icon: '🔌',
      title: 'Plugs',
      text: `${codes.map((c) => `${countryByCode[c].name}: ${getCountryTips(c)?.plugs || 'unknown'}`).join(' · ')}.${typeG && codes.length > 1 ? ' The UK and Ireland use type G, so bring an adapter for both kinds.' : ''}`,
    })
  }

  const sundays = codes.map((c) => ({ c, t: getCountryTips(c)?.sunday })).filter((x) => x.t)
  if (sundays.length && plan.prefs.days >= 5) {
    out.push({ id: 'sundays', icon: '🗓️', title: 'Sundays', text: sundays.map(({ c, t }) => `${countryByCode[c].name}: ${t}`).join(' ') })
  }

  const rail = legs.filter((l) => l.note && l.source === 'sample' && l.mode === 'train' && !/estimated/i.test(l.note)).map((l) => `${l.from.name} → ${l.to.name} (${l.note})`)
  if (rail.length) out.push({ id: 'rail', icon: '🚄', title: 'Main rail links', text: `${rail.join(', ')}. High-speed and cross-border trains are cheapest booked early; many need a seat reservation.` })

  if (plan.prefs.startDate && plan.prefs.endDate) {
    const ev = eventsDuringTrip(plan.prefs.startDate, plan.prefs.endDate, ids)
    if (ev.length) out.push({ id: 'events', icon: '🎉', title: 'On during your trip', text: `${ev.map((e) => `${e.event.name} in ${e.city.name}`).join(', ')} (dates are approximate; they move a little each year).` })
  }
  const month = plan.prefs.month
  if (month) {
    const busy = ids.filter((id) => cityById[id].seasons.busy?.includes(month)).map((id) => cityById[id].name)
    if (busy.length) out.push({ id: 'season', icon: '👥', title: `Busy in ${monthNames[month - 1]}`, text: `${busy.join(', ')} ${busy.length === 1 ? 'is' : 'are'} in peak season then. Book rooms and timed-entry sights ahead.` })
  }
  return out
}
