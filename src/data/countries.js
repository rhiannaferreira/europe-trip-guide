// Countries the guide covers. Tips live in countryTips.js, cities in cities.js.
export const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', aliases: ['Holland'] },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', aliases: ['Czechia'] },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', aliases: ['UK', 'Britain', 'England', 'Scotland'] },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
]

export const countryByCode = Object.fromEntries(countries.map((c) => [c.code, c]))
export const getCountry = (code) => countryByCode[code]
