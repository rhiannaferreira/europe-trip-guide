import { useMemo, useState } from 'react'
import { cities, cityById } from './data/cities.js'
import { countryByCode } from './data/countries.js'
import { countryTips } from './data/countryTips.js'
import { interests } from './data/interests.js'
import { places } from './data/places.js'
import { useTrip } from './useTrip.js'
import Filters from './components/Filters.jsx'
import PlaceCard from './components/PlaceCard.jsx'
import MapView from './components/MapView.jsx'
import TripBoard from './components/TripBoard.jsx'

export default function App() {
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [activeInterests, setActiveInterests] = useState(() => new Set(interests.map((i) => i.id)))
  const [focusedId, setFocusedId] = useState(null)
  const trip = useTrip()

  const visiblePlaces = useMemo(
    () =>
      places.filter((p) => {
        const c = cityById[p.cityId]
        return (
          (!country || c.country === country) &&
          (!city || p.cityId === city) &&
          activeInterests.has(p.category)
        )
      }),
    [country, city, activeInterests],
  )

  const selectCountry = (code) => {
    setCountry(code)
    if (city && cityById[city].country !== code) setCity('')
  }

  const selectCity = (id) => {
    setCity(id)
    if (id) setCountry(cityById[id].country)
  }

  const toggleInterest = (id) =>
    setActiveInterests((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const tipsCountry = city ? cityById[city].country : country
  const selectedCity = city ? cityById[city] : null

  return (
    <div className="app">
      <header className="app-header">
        <h1>Europe Trip Guide</h1>
        <p>Your guide to places worth seeing across Europe, and the trip that connects them.</p>
      </header>

      <aside className="sidebar">
        <Filters
          country={country}
          city={city}
          activeInterests={activeInterests}
          onCountryChange={selectCountry}
          onCityChange={selectCity}
          onToggleInterest={toggleInterest}
        />

        {selectedCity && <p className="city-blurb">{selectedCity.description}</p>}

        {tipsCountry && (
          <details className="tips">
            <summary>Local tips for {countryByCode[tipsCountry].name}</summary>
            <ul>
              {Object.entries(countryTips[tipsCountry]).filter(([, v]) => typeof v === 'string').map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </details>
        )}

        <h2 className="section-title">
          {visiblePlaces.length} place{visiblePlaces.length === 1 ? '' : 's'}
        </h2>
        <div className="place-list">
          {visiblePlaces.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              city={cityById[p.cityId]}
              saved={trip.savedIds.has(p.id)}
              focused={focusedId === p.id}
              onToggleSave={() => trip.toggle(p.id)}
              onFocus={() => setFocusedId(p.id)}
            />
          ))}
          {visiblePlaces.length === 0 && <p className="empty">No places match these filters.</p>}
        </div>
      </aside>

      <main className="map-panel">
        <MapView
          places={visiblePlaces}
          cities={cities}
          savedIds={trip.savedIds}
          routeCities={trip.cityOrder.map((id) => cityById[id])}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggleSave={trip.toggle}
          onSelectCity={selectCity}
        />
      </main>

      <section className="trip-panel">
        <TripBoard
          savedPlaces={trip.savedPlaces}
          cityOrder={trip.cityOrder}
          onRemove={trip.toggle}
          onMoveCity={trip.moveCity}
          onClear={trip.clear}
          onFocus={(id) => setFocusedId(id)}
        />
      </section>
    </div>
  )
}
