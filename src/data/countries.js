// Countries the guide covers. Tips live in countryTips.js, cities in cities.js.
// `tz` is the IANA time zone for the whole country (every city in the guide is on the mainland, so each
// country has one). Travel Mode reads activity times in it, so they're never shown in the traveller's home time.
export const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷', tz: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', tz: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', tz: 'Europe/Madrid' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', tz: 'Europe/Lisbon' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', tz: 'Europe/Berlin' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', tz: 'Europe/Amsterdam', aliases: ['Holland'] },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', tz: 'Europe/Brussels' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', tz: 'Europe/Zurich' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', tz: 'Europe/Vienna' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', tz: 'Europe/Prague', aliases: ['Czechia'] },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', tz: 'Europe/Athens' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', tz: 'Europe/Zagreb' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', tz: 'Europe/London', aliases: ['UK', 'Britain', 'England', 'Scotland'] },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', tz: 'Europe/Dublin' },
]

export const countryByCode = Object.fromEntries(countries.map((c) => [c.code, c]))
export const getCountry = (code) => countryByCode[code]
