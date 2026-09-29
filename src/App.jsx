import { useMemo, useState } from 'react'
import { cities, cityById, citiesInCountry } from './data/cities.js'
import { countryByCode } from './data/countries.js'
import { countryTips } from './data/countryTips.js'
import { placeById, places } from './data/places.js'
import { placeMatches } from './lib/search.js'
import { useTrip } from './useTrip.js'
import SearchBar from './components/SearchBar.jsx'
import CityExplorer from './components/CityExplorer.jsx'
import Filters from './components/Filters.jsx'
import PlaceCard from './components/PlaceCard.jsx'
import MapView from './components/MapView.jsx'
import TripBoard from './components/TripBoard.jsx'

const PAGE = 24

export default function App() {
  const [country, setCountry] = useState('')
  const [cityId, setCityId] = useState('')
  const [query, setQuery] = useState('')
  const [gemMode, setGemMode] = useState(false)
  const [activeInterests, setActiveInterests] = useState(() => new Set())
  const [focusedId, setFocusedId] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const trip = useTrip()

  const visiblePlaces = useMemo(
    () =>
      places.filter((p) => {
        const c = cityById[p.cityId]
        return (
          (!country || c.country === country) &&
          (!cityId || p.cityId === cityId) &&
          (!gemMode || cityId || c.hiddenGem) &&
          (activeInterests.size === 0 || activeInterests.has(p.category)) &&
          placeMatches(p, query)
        )
      }),
    [country, cityId, gemMode, activeInterests, query],
  )

  // Cities the map should frame when no places match (e.g. a country with every filter off).
  const fitCities = cityId ? [cityById[cityId]] : country ? citiesInCountry(country) : []

  const resetPaging = () => setShown(PAGE)

  const selectCountry = (code) => {
    setCountry(code)
    if (cityId && cityById[cityId].country !== code) setCityId('')
    resetPaging()
  }

  const selectCity = (id) => {
    setCityId(id)
    if (id) setCountry(cityById[id].country)
    resetPaging()
  }

  const toggleInterest = (id) => {
    setActiveInterests((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    resetPaging()
  }

  const pickFromSearch = {
    country: (code) => {
      setQuery('')
      setCityId('')
      selectCountry(code)
    },
    city: (id) => {
      setQuery('')
      selectCity(id)
    },
    place: (id) => {
      setQuery('')
      selectCity(placeById[id].cityId)
      setFocusedId(id)
    },
  }

  const tipsCountry = cityId ? cityById[cityId].country : country
  const selectedCity = cityId ? cityById[cityId] : null
  const listTitle = query.trim()
    ? `${visiblePlaces.length} result${visiblePlaces.length === 1 ? '' : 's'} for “${query.trim()}”`
    : `${visiblePlaces.length} place${visiblePlaces.length === 1 ? '' : 's'}${selectedCity ? ` in ${selectedCity.name}` : country ? ` in ${countryByCode[country].name}` : ''}`

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Europe Trip Guide</h1>
          <p>Places worth seeing across Europe, and the trip that connects them.</p>
        </div>
        <SearchBar
          query={query}
          onQueryChange={(q) => {
            setQuery(q)
            resetPaging()
          }}
          onPickCountry={pickFromSearch.country}
          onPickCity={pickFromSearch.city}
          onPickPlace={pickFromSearch.place}
        />
      </header>

      <aside className="sidebar">
        <CityExplorer
          country={country}
          city={selectedCity}
          gemMode={gemMode}
          tripCityIds={trip.cityOrder}
          onSelectCountry={selectCountry}
          onSelectCity={selectCity}
          onAddCity={() => {}}
          onToggleGemMode={() => {
            setGemMode((g) => !g)
            resetPaging()
          }}
        >
          {tipsCountry && (
            <details className="tips">
              <summary>Local tips for {countryByCode[tipsCountry].name}</summary>
              <ul>
                {Object.entries(countryTips[tipsCountry])
                  .filter(([, v]) => typeof v === 'string')
                  .map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
              </ul>
            </details>
          )}
        </CityExplorer>

        <section className="places">
          <h2 className="section-title">Places</h2>
          <Filters activeInterests={activeInterests} onToggleInterest={toggleInterest} onClearInterests={() => setActiveInterests(new Set())} />
          <p className="list-count">{listTitle}</p>
          <div className="place-list">
            {visiblePlaces.slice(0, shown).map((p) => (
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
          </div>
          {visiblePlaces.length > shown && (
            <button type="button" className="btn more-btn" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({visiblePlaces.length - shown} left)
            </button>
          )}
          {visiblePlaces.length === 0 && <p className="empty">No places match. Try clearing a filter or the search.</p>}
        </section>
      </aside>

      <main className="map-panel">
        <MapView
          places={visiblePlaces}
          cities={cities}
          fitCities={fitCities}
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
