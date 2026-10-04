// WMO weather codes → icon and words.
export function describe(code) {
  if (code === 0) return { icon: '☀️', text: 'Clear' }
  if (code <= 2) return { icon: '🌤️', text: 'Partly cloudy' }
  if (code === 3) return { icon: '☁️', text: 'Cloudy' }
  if (code <= 48) return { icon: '🌫️', text: 'Fog' }
  if (code <= 57) return { icon: '🌦️', text: 'Drizzle' }
  if (code <= 67) return { icon: '🌧️', text: 'Rain' }
  if (code <= 77) return { icon: '🌨️', text: 'Snow' }
  if (code <= 82) return { icon: '🌦️', text: 'Showers' }
  if (code <= 86) return { icon: '🌨️', text: 'Snow showers' }
  return { icon: '⛈️', text: 'Thunderstorms' }
}
